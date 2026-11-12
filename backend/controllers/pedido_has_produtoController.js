const { query } = require('../database');

// Pedido_has_Produto é um RELACIONAMENTO (sem tela própria): só controller e rotas.
// Cada linha é um item de um pedido; a tela de itens é o formulário do próprio pedido.
// Chave primária composta: (pedido_id_pedido, produto_tom_id_produto_tom).
// Itens (produto/tom) e preços unitários gravados ficam aqui; o preço é o do momento da venda.
const SELECT_ITEM = `
  SELECT php.pedido_id_pedido,
         php.produto_tom_id_produto_tom,
         pr.nome_produto,
         t.nome_tom,
         php.quantidade,
         php.preco_unitario,
         ROUND((php.quantidade * php.preco_unitario)::numeric, 2)::float8 AS subtotal,
         to_char(pe.data_pedido, 'YYYY-MM-DD') AS data_pedido,
         pc.nome_pessoa AS nome_cliente
  FROM pedido_has_produto php
  JOIN pedido pe ON pe.id_pedido = php.pedido_id_pedido
  JOIN produto_tom pt ON pt.id_produto_tom = php.produto_tom_id_produto_tom
  JOIN produto pr ON pr.id_produto = pt.produto_id_produto
  JOIN tom t ON t.id_tom = pt.tom_id_tom
  LEFT JOIN pessoa pc ON pc.cpf_pessoa = pe.cliente_pessoa_cpf_pessoa`;

const WHERE_CHAVE = 'WHERE php.pedido_id_pedido = $1 AND php.produto_tom_id_produto_tom = $2';

// Lê um inteiro positivo (ids do banco começam em 1)
function inteiroPositivo(valor) {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : null;
}

// Preço opcional: vazio = null (usa o preço do produto); senão número >= 0 (aceita vírgula)
function normalizarPreco(valor) {
    if (valor === undefined || valor === null || String(valor).trim() === '') {
        return { ok: true, valor: null };
    }

    const numero = Number(String(valor).trim().replace(',', '.'));

    if (!Number.isFinite(numero) || numero < 0) {
        return { ok: false };
    }

    return { ok: true, valor: Math.round(numero * 100) / 100 };
}

exports.listarItens = async (req, res) => {
    try {
        const result = await query(
            `${SELECT_ITEM} ORDER BY php.pedido_id_pedido, php.produto_tom_id_produto_tom`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar itens de pedido:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.criarItem = async (req, res) => {
    try {
        const pedido = inteiroPositivo(req.body.pedido_id_pedido);
        const produtoTom = inteiroPositivo(req.body.produto_tom_id_produto_tom);
        const quantidade = inteiroPositivo(req.body.quantidade);

        if (!pedido) {
            return res.status(400).json({ error: 'Informe o ID do pedido (número inteiro válido)' });
        }

        if (!produtoTom) {
            return res.status(400).json({ error: 'Selecione o produto/tom' });
        }

        if (!quantidade) {
            return res.status(400).json({ error: 'A quantidade deve ser um inteiro maior que zero' });
        }

        const precoInformado = normalizarPreco(req.body.preco_unitario);
        if (!precoInformado.ok) {
            return res.status(400).json({ error: 'O preço unitário deve ser um número maior ou igual a zero' });
        }

        // Se o preço não foi informado, usa o preço atual do produto
        const produto = await query(
            `SELECT pr.preco_unitario_produto
         FROM produto_tom pt
         JOIN produto pr ON pr.id_produto = pt.produto_id_produto
        WHERE pt.id_produto_tom = $1`,
            [produtoTom]
        );

        if (produto.rows.length === 0) {
            return res.status(400).json({ error: 'O produto/tom informado não existe' });
        }

        const preco = precoInformado.valor ?? produto.rows[0].preco_unitario_produto;

        if (preco === null || preco === undefined) {
            return res.status(400).json({
                error: 'O produto não tem preço cadastrado: informe o preço unitário'
            });
        }

        await query(
            `INSERT INTO pedido_has_produto
         (pedido_id_pedido, produto_tom_id_produto_tom, quantidade, preco_unitario)
       VALUES ($1, $2, $3, $4)`,
            [pedido, produtoTom, quantidade, preco]
        );

        const result = await query(`${SELECT_ITEM} ${WHERE_CHAVE}`, [pedido, produtoTom]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar item de pedido:', error);

        // Chave primária composta duplicada: esse produto/tom já está no pedido
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Esse produto/tom já está nesse pedido' });
        }

        // FK violada: pedido (ou produto/tom) inexistente
        if (error.code === '23503') {
            if (error.constraint && error.constraint.includes('produto_tom')) {
                return res.status(400).json({ error: 'O produto/tom informado não existe' });
            }
            return res.status(400).json({ error: 'O pedido informado não existe' });
        }

        // NOT NULL violado
        if (error.code === '23502') {
            return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.obterItem = async (req, res) => {
    try {
        const pedido = parseInt(req.params.pedido);
        const produtoTom = parseInt(req.params.produtoTom);

        if (isNaN(pedido) || isNaN(produtoTom)) {
            return res.status(400).json({ error: 'Pedido e produto/tom devem ser números válidos' });
        }

        const result = await query(`${SELECT_ITEM} ${WHERE_CHAVE}`, [pedido, produtoTom]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item de pedido não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao obter item de pedido:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.atualizarItem = async (req, res) => {
    try {
        const pedido = parseInt(req.params.pedido);
        const produtoTom = parseInt(req.params.produtoTom);

        if (isNaN(pedido) || isNaN(produtoTom)) {
            return res.status(400).json({ error: 'Pedido e produto/tom devem ser números válidos' });
        }

        const quantidade = inteiroPositivo(req.body.quantidade);
        if (!quantidade) {
            return res.status(400).json({ error: 'A quantidade deve ser um inteiro maior que zero' });
        }

        const preco = normalizarPreco(req.body.preco_unitario);
        if (!preco.ok) {
            return res.status(400).json({ error: 'O preço unitário deve ser um número maior ou igual a zero' });
        }

        // A chave (pedido + produto/tom) não muda; preço vazio = mantém o preço gravado
        const update = await query(
            `UPDATE pedido_has_produto
          SET quantidade = $1,
              preco_unitario = COALESCE($2::float8, preco_unitario)
        WHERE pedido_id_pedido = $3 AND produto_tom_id_produto_tom = $4
        RETURNING pedido_id_pedido`,
            [quantidade, preco.valor, pedido, produtoTom]
        );

        if (update.rows.length === 0) {
            return res.status(404).json({ error: 'Item de pedido não encontrado' });
        }

        const result = await query(`${SELECT_ITEM} ${WHERE_CHAVE}`, [pedido, produtoTom]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar item de pedido:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.deletarItem = async (req, res) => {
    try {
        const pedido = parseInt(req.params.pedido);
        const produtoTom = parseInt(req.params.produtoTom);

        if (isNaN(pedido) || isNaN(produtoTom)) {
            return res.status(400).json({ error: 'Pedido e produto/tom devem ser números válidos' });
        }

        const result = await query(
            `DELETE FROM pedido_has_produto
        WHERE pedido_id_pedido = $1 AND produto_tom_id_produto_tom = $2
        RETURNING pedido_id_pedido`,
            [pedido, produtoTom]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item de pedido não encontrado' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar item de pedido:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};


const db = require('../database');

exports.criarItensLote = async (req, res) => {
    const itens = req.body;

    if (!Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({
            error: 'Nenhum produto foi enviado.'
        });
    }

    try {
        const resultado = await db.transaction(async (client) => {

            for (const item of itens) {
                const {
                    pedido_id_pedido,
                    produto_tom_id_produto_tom,
                    quantidade,
                    preco_unitario
                } = item;

                if (
                    !pedido_id_pedido ||
                    !produto_tom_id_produto_tom ||
                    !quantidade ||
                    preco_unitario == null
                ) {
                    throw new Error(
                        'Selecione o produto em todas as linhas.'
                    );
                }

                await client.query(
                    `INSERT INTO public.pedido_has_produto
                    (
                        pedido_id_pedido,
                        produto_tom_id_produto_tom,
                        quantidade,
                        preco_unitario
                    )
                    VALUES ($1, $2, $3, $4)`,
                    [
                        pedido_id_pedido,
                        produto_tom_id_produto_tom,
                        quantidade,
                        preco_unitario
                    ]
                );
            }

            return itens;
        });

        return res.status(201).json({
            message: 'Produtos adicionados ao pedido com sucesso!',
            itens: resultado
        });

    } catch (error) {
        console.error('Erro ao cadastrar itens do pedido:', error);

        return res.status(400).json({
            error: error.message
        });
    }
};
