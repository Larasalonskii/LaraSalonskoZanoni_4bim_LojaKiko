const { query, pool } = require('../database');
const path = require('path');

// Pagamento (1) --- (N) Pagamento_has_Forma_Pagamento (N) --- (1) Forma_Pagamento
// Um pagamento pode ser dividido em várias formas (ex.: parte em dinheiro, parte no Pix).
// A data sai como texto (YYYY-MM-DDTHH:MI:SS) para não sofrer deslocamento de fuso no JSON.
const SELECT_PAGAMENTO = `
  SELECT pg.id_pagamento,
         pg.pedido_id_pedido,
         to_char(pg.data_pagamento, 'YYYY-MM-DD"T"HH24:MI:SS') AS data_pagamento,
         pg.valor_total_pagamento,
         p.nome_pessoa AS nome_cliente,
         COALESCE((
           SELECT json_agg(
                    json_build_object(
                      'forma_pagamento_id', phf.forma_pagamento_id_forma_pagamento,
                      'nome_forma_pagamento', fp.nome_forma_pagamento,
                      'valor_pago', phf.valor_pago
                    )
                    ORDER BY phf.forma_pagamento_id_forma_pagamento
                  )
             FROM pagamento_has_forma_pagamento phf
             JOIN forma_pagamento fp
               ON fp.id_forma_pagamento = phf.forma_pagamento_id_forma_pagamento
            WHERE phf.pagamento_id_pagamento = pg.id_pagamento
         ), '[]'::json) AS formas
  FROM pagamento pg
  JOIN pedido pe ON pe.id_pedido = pg.pedido_id_pedido
  LEFT JOIN pessoa p ON p.cpf_pessoa = pe.cliente_pessoa_cpf_pessoa`;

function arredondar(valor) {
    return Math.round(valor * 100) / 100;
}

// Aceita "AAAA-MM-DDTHH:MM[:SS]" (datetime-local) ou vazio (usa o momento atual)
function normalizarDataHora(valor) {
    if (valor === undefined || valor === null || String(valor).trim() === '') {
        return { ok: true, valor: null };
    }

    const texto = String(valor).trim().replace(' ', 'T');
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(texto);
    if (!m) return { ok: false };

    const [, dia, hh, mm, ss = '00'] = m;
    const data = new Date(`${dia}T00:00:00Z`);
    const diaOk = !isNaN(data.getTime()) && data.toISOString().slice(0, 10) === dia;

    if (!diaOk || Number(hh) > 23 || Number(mm) > 59 || Number(ss) > 59) {
        return { ok: false };
    }

    return { ok: true, valor: `${dia} ${hh}:${mm}:${ss}` };
}

// Valida o corpo da requisição e calcula o total a partir das formas de pagamento
function validarCorpo(body) {
    const pedido = Number(body.pedido_id_pedido);
    if (!Number.isInteger(pedido) || pedido <= 0) {
        return { ok: false, erro: 'Informe o ID do pedido (número inteiro válido)' };
    }

    const data = normalizarDataHora(body.data_pagamento);
    if (!data.ok) {
        return { ok: false, erro: 'Data do pagamento inválida' };
    }

    const recebidas = Array.isArray(body.formas) ? body.formas : [];
    if (recebidas.length === 0) {
        return { ok: false, erro: 'Informe ao menos uma forma de pagamento' };
    }

    const vistas = new Set();
    const formas = [];

    for (const item of recebidas) {
        const forma = Number(item && item.forma_pagamento_id);
        const valor = Number(String((item && item.valor_pago) ?? '').trim().replace(',', '.'));

        if (!Number.isInteger(forma) || forma <= 0) {
            return { ok: false, erro: 'Selecione a forma de pagamento em todas as linhas' };
        }

        if (!Number.isFinite(valor) || valor <= 0) {
            return { ok: false, erro: 'O valor pago de cada forma deve ser maior que zero' };
        }

        if (vistas.has(forma)) {
            return { ok: false, erro: 'A mesma forma de pagamento não pode aparecer duas vezes' };
        }
        vistas.add(forma);

        formas.push({ forma_pagamento_id: forma, valor_pago: arredondar(valor) });
    }

    // O total do pagamento é sempre a soma das formas (nunca digitado à mão)
    const total = arredondar(formas.reduce((soma, f) => soma + f.valor_pago, 0));

    return { ok: true, pedido, data: data.valor, formas, total };
}

// Executa várias queries na mesma transação (pagamento + formas andam juntos)
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

async function inserirFormas(client, idPagamento, formas) {
    for (const f of formas) {
        await client.query(
            `INSERT INTO pagamento_has_forma_pagamento
         (pagamento_id_pagamento, forma_pagamento_id_forma_pagamento, valor_pago)
       VALUES ($1, $2, $3)`,
            [idPagamento, f.forma_pagamento_id, f.valor_pago]
        );
    }
}

// Erros de FK ao gravar: pedido inexistente ou forma de pagamento inexistente
function mensagemErroFk(error) {
    if (error.constraint && error.constraint.includes('pedido')) {
        return 'O pedido informado não existe';
    }
    if (error.constraint && error.constraint.includes('forma')) {
        return 'Uma das formas de pagamento informadas não existe';
    }
    return 'Pedido ou forma de pagamento inexistente';
}

exports.abrirCrudPagamento = (req, res) => {
    const usuario = req.cookies.usuarioLogado; // O cookie deve conter o nome/ID do usuário

    if (usuario) {
        res.sendFile(path.join(__dirname, '../../frontend/pagamento/pagamento.html'));
    } else {
        // Cookie não existe. Usuário NÃO está logado.
        res.redirect('/login');
    }
};

exports.listarPagamentos = async (req, res) => {
    try {
        const result = await query(`${SELECT_PAGAMENTO} ORDER BY pg.id_pagamento`);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar pagamentos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.criarPagamento = async (req, res) => {
    try {
        const dados = validarCorpo(req.body);
        if (!dados.ok) {
            return res.status(400).json({ error: dados.erro });
        }

        // O id_pagamento NÃO vem do front: quem gera é a sequence do banco
        const idPagamento = await comTransacao(async (client) => {
            const pagamento = await client.query(
                `INSERT INTO pagamento (pedido_id_pedido, data_pagamento, valor_total_pagamento)
         VALUES ($1, COALESCE($2::timestamp, LOCALTIMESTAMP(0)), $3)
         RETURNING id_pagamento`,
                [dados.pedido, dados.data, dados.total]
            );

            const id = pagamento.rows[0].id_pagamento;
            await inserirFormas(client, id, dados.formas);
            return id;
        });

        const result = await query(`${SELECT_PAGAMENTO} WHERE pg.id_pagamento = $1`, [idPagamento]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar pagamento:', error);

        if (error.code === '23503') {
            return res.status(400).json({ error: mensagemErroFk(error) });
        }

        // NOT NULL violado
        if (error.code === '23502') {
            return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
        }

        // Chave primária duplicada (sequence fora de sincronia com os dados)
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Já existe um pagamento com esse ID' });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.obterPagamento = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        const result = await query(`${SELECT_PAGAMENTO} WHERE pg.id_pagamento = $1`, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pagamento não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao obter pagamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.atualizarPagamento = async (req, res) => {
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
                `UPDATE pagamento
            SET pedido_id_pedido = $1,
                data_pagamento = COALESCE($2::timestamp, data_pagamento),
                valor_total_pagamento = $3
          WHERE id_pagamento = $4
          RETURNING id_pagamento`,
                [dados.pedido, dados.data, dados.total, id]
            );

            if (update.rows.length === 0) return false;

            // Troca todas as formas pelas novas (o total acima já bate com a soma delas)
            await client.query(
                'DELETE FROM pagamento_has_forma_pagamento WHERE pagamento_id_pagamento = $1',
                [id]
            );
            await inserirFormas(client, id, dados.formas);
            return true;
        });

        if (!encontrado) {
            return res.status(404).json({ error: 'Pagamento não encontrado' });
        }

        const result = await query(`${SELECT_PAGAMENTO} WHERE pg.id_pagamento = $1`, [id]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar pagamento:', error);

        if (error.code === '23503') {
            return res.status(400).json({ error: mensagemErroFk(error) });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.deletarPagamento = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        // As formas pertencem ao pagamento: saem junto com ele, na mesma transação
        const encontrado = await comTransacao(async (client) => {
            await client.query(
                'DELETE FROM pagamento_has_forma_pagamento WHERE pagamento_id_pagamento = $1',
                [id]
            );

            const result = await client.query(
                'DELETE FROM pagamento WHERE id_pagamento = $1 RETURNING id_pagamento',
                [id]
            );

            return result.rows.length > 0;
        });

        if (!encontrado) {
            return res.status(404).json({ error: 'Pagamento não encontrado' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar pagamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};