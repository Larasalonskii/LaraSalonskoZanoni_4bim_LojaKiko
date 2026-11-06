const { query, pool } = require('../database');
const path = require('path');

// Tamanho máximo do CPF no banco: character varying(20)
const MAX_CPF = 20;

// Erro de regra de negócio/validação com status HTTP próprio
class ErroValidacao extends Error {
    constructor(mensagem, status = 400) {
        super(mensagem);
        this.status = status;
    }
}

// Pedido (1) --- (N) Pedido_has_Produto (N) --- (1) Produto_Tom
// A data sai como texto (YYYY-MM-DD) para não sofrer deslocamento de fuso no JSON.
// valor_total = soma dos itens; valor_pago = soma dos pagamentos já feitos para o pedido.
const SELECT_PEDIDO = `
  SELECT pe.id_pedido,
         to_char(pe.data_pedido, 'YYYY-MM-DD') AS data_pedido,
         pe.cliente_pessoa_cpf_pessoa,
         pc.nome_pessoa AS nome_cliente,
         pe.funcionario_pessoa_cpf_pessoa,
         pf.nome_pessoa AS nome_funcionario,
         COALESCE((
           SELECT ROUND(SUM(php.quantidade * php.preco_unitario)::numeric, 2)::float8
             FROM pedido_has_produto php
            WHERE php.pedido_id_pedido = pe.id_pedido
         ), 0) AS valor_total,
         COALESCE((
           SELECT ROUND(SUM(pg.valor_total_pagamento)::numeric, 2)::float8
             FROM pagamento pg
            WHERE pg.pedido_id_pedido = pe.id_pedido
         ), 0) AS valor_pago,
         COALESCE((
           SELECT json_agg(
                    json_build_object(
                      'produto_tom_id', php.produto_tom_id_produto_tom,
                      'nome_produto', pr.nome_produto,
                      'nome_tom', t.nome_tom,
                      'quantidade', php.quantidade,
                      'preco_unitario', php.preco_unitario
                    )
                    ORDER BY php.produto_tom_id_produto_tom
                  )
             FROM pedido_has_produto php
             JOIN produto_tom pt ON pt.id_produto_tom = php.produto_tom_id_produto_tom
             JOIN produto pr ON pr.id_produto = pt.produto_id_produto
             JOIN tom t ON t.id_tom = pt.tom_id_tom
            WHERE php.pedido_id_pedido = pe.id_pedido
         ), '[]'::json) AS itens
  FROM pedido pe
  LEFT JOIN pessoa pc ON pc.cpf_pessoa = pe.cliente_pessoa_cpf_pessoa
  LEFT JOIN pessoa pf ON pf.cpf_pessoa = pe.funcionario_pessoa_cpf_pessoa`;

// Data opcional (YYYY-MM-DD). Vazia = usa a data de hoje no banco.
function normalizarData(valor) {
    if (valor === undefined || valor === null || String(valor).trim() === '') {
        return { ok: true, valor: null };
    }

    const texto = String(valor).trim();
    const formatoOk = /^\d{4}-\d{2}-\d{2}$/.test(texto);
    const data = new Date(`${texto}T00:00:00Z`);
    const existe = formatoOk && !isNaN(data.getTime()) && data.toISOString().slice(0, 10) === texto;

    return existe ? { ok: true, valor: texto } : { ok: false };
}

function validarCpf(valor, rotulo) {
    const cpf = String(valor || '').trim();

    if (!cpf) {
        return { ok: false, erro: `O ${rotulo} do pedido é obrigatório` };
    }

    if (cpf.length > MAX_CPF) {
        return { ok: false, erro: `O CPF do ${rotulo} deve ter no máximo ${MAX_CPF} caracteres` };
    }

    return { ok: true, valor: cpf };
}

// Valida o corpo. O preço unitário NÃO vem do front: o servidor usa o preço do produto.
function validarCorpo(body) {
    const data = normalizarData(body.data_pedido);
    if (!data.ok) {
        return { ok: false, erro: 'Data do pedido inválida (use AAAA-MM-DD)' };
    }

    const cliente = validarCpf(body.cliente_pessoa_cpf_pessoa, 'cliente');
    if (!cliente.ok) return cliente;

    const funcionario = validarCpf(body.funcionario_pessoa_cpf_pessoa, 'funcionário');
    if (!funcionario.ok) return funcionario;

    const recebidos = Array.isArray(body.itens) ? body.itens : [];
    if (recebidos.length === 0) {
        return { ok: false, erro: 'Informe ao menos um item no pedido' };
    }

    const vistos = new Set();
    const itens = [];

    for (const item of recebidos) {
        const produtoTom = Number(item && item.produto_tom_id);
        const quantidade = Number(item && item.quantidade);

        if (!Number.isInteger(produtoTom) || produtoTom <= 0) {
            return { ok: false, erro: 'Selecione o produto em todas as linhas' };
        }

        if (!Number.isInteger(quantidade) || quantidade <= 0) {
            return { ok: false, erro: 'A quantidade de cada item deve ser um inteiro maior que zero' };
        }

        if (vistos.has(produtoTom)) {
            return { ok: false, erro: 'O mesmo produto/tom não pode aparecer duas vezes no pedido' };
        }
        vistos.add(produtoTom);

        itens.push({ produto_tom_id: produtoTom, quantidade });
    }

    return {
        ok: true,
        data: data.valor,
        cliente: cliente.valor,
        funcionario: funcionario.valor,
        itens
    };
}

// Executa várias queries na mesma transação (pedido + itens andam juntos)
async function comTransacao(funcao) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const resultado = await funcao(client);
        await client.query('COMMIT');
        return resultado;
    } catch (error) {
        await client.query('ROLLBACK').catch(() => { });
        throw error;
    } finally {
        client.release();
    }
}

// Preço atual de cada produto_tom (vem do produto). Falha se algum não existir.
async function buscarPrecosAtuais(client, ids) {
    const result = await client.query(
        `SELECT pt.id_produto_tom, pr.preco_unitario_produto
       FROM produto_tom pt
       JOIN produto pr ON pr.id_produto = pt.produto_id_produto
      WHERE pt.id_produto_tom = ANY($1::int[])`,
        [ids]
    );

    const precos = new Map(result.rows.map((r) => [r.id_produto_tom, r.preco_unitario_produto]));

    for (const id of ids) {
        if (!precos.has(id)) {
            throw new ErroValidacao(`O produto/tom ${id} não existe`);
        }
        if (precos.get(id) === null) {
            throw new ErroValidacao(`O produto/tom ${id} não tem preço cadastrado`);
        }
    }

    return precos;
}

// precosMantidos: preços já gravados no pedido (mantidos ao editar, para não reescrever o histórico)
async function inserirItens(client, idPedido, itens, precosMantidos = new Map()) {
    const precosAtuais = await buscarPrecosAtuais(client, itens.map((i) => i.produto_tom_id));

    for (const item of itens) {
        const preco = precosMantidos.has(item.produto_tom_id)
            ? precosMantidos.get(item.produto_tom_id)
            : precosAtuais.get(item.produto_tom_id);

        await client.query(
            `INSERT INTO pedido_has_produto
         (pedido_id_pedido, produto_tom_id_produto_tom, quantidade, preco_unitario)
       VALUES ($1, $2, $3, $4)`,
            [idPedido, item.produto_tom_id, item.quantidade, preco]
        );
    }
}

// Responde erros conhecidos (validação, FK, etc.)
function tratarErro(error, res, acao) {
    // Erros de validação são esperados: respondem direto, sem poluir o log do servidor
    if (error instanceof ErroValidacao) {
        return res.status(error.status).json({ error: error.message });
    }

    console.error(`Erro ao ${acao} pedido:`, error);

    // FK violada: cliente ou funcionário inexistente
    if (error.code === '23503') {
        const constraint = error.constraint || '';
        if (constraint.includes('cliente')) {
            return res.status(400).json({ error: 'O cliente informado não existe' });
        }
        if (constraint.includes('funcionario')) {
            return res.status(400).json({ error: 'O funcionário informado não existe' });
        }
        return res.status(400).json({ error: 'Cliente, funcionário ou produto inexistente' });
    }

    // NOT NULL violado
    if (error.code === '23502') {
        return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
    }

    // Chave primária duplicada (sequence fora de sincronia com os dados)
    if (error.code === '23505') {
        return res.status(409).json({ error: 'Já existe um pedido com esse ID' });
    }

    return res.status(500).json({ error: 'Erro interno do servidor' });
}

exports.abrirCrudPedido = (req, res) => {
    const usuario = req.cookies.usuarioLogado; // O cookie deve conter o nome/ID do usuário

    if (usuario) {
        res.sendFile(path.join(__dirname, '../../frontend/pedido/pedido.html'));
    } else {
        // Cookie não existe. Usuário NÃO está logado.
        res.redirect('/login');
    }
};

// Opções para os selects do formulário (clientes, funcionários e produtos com tom)
exports.listarOpcoes = async (req, res) => {
    try {
        const [clientes, funcionarios, produtos] = await Promise.all([
            query(`SELECT cli.pessoa_cpf_pessoa, p.nome_pessoa
               FROM cliente cli
               JOIN pessoa p ON p.cpf_pessoa = cli.pessoa_cpf_pessoa
              ORDER BY p.nome_pessoa`),
            query(`SELECT f.pessoa_cpf_pessoa, p.nome_pessoa
               FROM funcionario f
               JOIN pessoa p ON p.cpf_pessoa = f.pessoa_cpf_pessoa
              ORDER BY p.nome_pessoa`),
            query(`SELECT pt.id_produto_tom, pr.nome_produto, t.nome_tom,
                    pr.preco_unitario_produto, pt.quantidade_estoque_tom
               FROM produto_tom pt
               JOIN produto pr ON pr.id_produto = pt.produto_id_produto
               JOIN tom t ON t.id_tom = pt.tom_id_tom
              ORDER BY pr.nome_produto, t.nome_tom`)
        ]);

        res.json({
            clientes: clientes.rows,
            funcionarios: funcionarios.rows,
            produtos_tom: produtos.rows
        });
    } catch (error) {
        console.error('Erro ao listar opções do pedido:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.listarPedidos = async (req, res) => {
    try {
        const result = await query(`${SELECT_PEDIDO} ORDER BY pe.id_pedido`);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar pedidos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.criarPedido = async (req, res) => {
    try {
        const dados = validarCorpo(req.body);
        if (!dados.ok) {
            return res.status(400).json({ error: dados.erro });
        }

        // O id_pedido NÃO vem do front: quem gera é a sequence do banco
        const idPedido = await comTransacao(async (client) => {
            const pedido = await client.query(
                `INSERT INTO pedido (data_pedido, cliente_pessoa_cpf_pessoa, funcionario_pessoa_cpf_pessoa)
         VALUES (COALESCE($1::date, CURRENT_DATE), $2, $3)
         RETURNING id_pedido`,
                [dados.data, dados.cliente, dados.funcionario]
            );

            const id = pedido.rows[0].id_pedido;
            await inserirItens(client, id, dados.itens);
            return id;
        });

        const result = await query(`${SELECT_PEDIDO} WHERE pe.id_pedido = $1`, [idPedido]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        tratarErro(error, res, 'criar');
    }
};

exports.obterPedido = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        const result = await query(`${SELECT_PEDIDO} WHERE pe.id_pedido = $1`, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao obter pedido:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.atualizarPedido = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        const dados = validarCorpo(req.body);
        if (!dados.ok) {
            return res.status(400).json({ error: dados.erro });
        }

        const encontrado = await comTransacao(async (client) => {
            // Se a data não for enviada, mantém a data que já estava gravada
            const update = await client.query(
                `UPDATE pedido
            SET data_pedido = COALESCE($1::date, data_pedido),
                cliente_pessoa_cpf_pessoa = $2,
                funcionario_pessoa_cpf_pessoa = $3
          WHERE id_pedido = $4
          RETURNING id_pedido`,
                [dados.data, dados.cliente, dados.funcionario, id]
            );

            if (update.rows.length === 0) return false;

            // Itens que já estavam no pedido mantêm o preço gravado; itens novos usam o preço atual
            const antigos = await client.query(
                'SELECT produto_tom_id_produto_tom, preco_unitario FROM pedido_has_produto WHERE pedido_id_pedido = $1',
                [id]
            );
            const precosMantidos = new Map(
                antigos.rows.map((r) => [r.produto_tom_id_produto_tom, r.preco_unitario])
            );

            await client.query('DELETE FROM pedido_has_produto WHERE pedido_id_pedido = $1', [id]);
            await inserirItens(client, id, dados.itens, precosMantidos);
            return true;
        });

        if (!encontrado) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        const result = await query(`${SELECT_PEDIDO} WHERE pe.id_pedido = $1`, [id]);
        res.json(result.rows[0]);
    } catch (error) {
        tratarErro(error, res, 'atualizar');
    }
};

exports.deletarPedido = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        // Os itens pertencem ao pedido e saem junto com ele, na mesma transação.
        // Já os pagamentos são registros financeiros: se existirem, o pedido não é apagado.
        const encontrado = await comTransacao(async (client) => {
            const pagamentos = await client.query(
                'SELECT 1 FROM pagamento WHERE pedido_id_pedido = $1 LIMIT 1',
                [id]
            );

            if (pagamentos.rows.length > 0) {
                throw new ErroValidacao(
                    'Não é possível deletar: o pedido possui pagamentos. Exclua os pagamentos primeiro.',
                    409
                );
            }

            await client.query('DELETE FROM pedido_has_produto WHERE pedido_id_pedido = $1', [id]);

            const result = await client.query(
                'DELETE FROM pedido WHERE id_pedido = $1 RETURNING id_pedido',
                [id]
            );

            return result.rows.length > 0;
        });

        if (!encontrado) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        res.status(204).send();
    } catch (error) {
        tratarErro(error, res, 'deletar');
    }
};