const { query } = require('../database');
const path = require('path');

// Tamanho máximo do campo nome_forma_pagamento no banco: character varying(100)
const MAX_NOME_FORMA_PAGAMENTO = 100;

exports.abrirCrudFormaPagamento = (req, res) => {
    const usuario = req.cookies.usuarioLogado; // O cookie deve conter o nome/ID do usuário

    if (usuario) {
        res.sendFile(path.join(__dirname, '../../frontend/forma_pagamento/forma_pagamento.html'));
    } else {
        // Cookie não existe. Usuário NÃO está logado.
        res.redirect('/login');
    }
};

exports.listarFormasPagamento = async (req, res) => {
    try {
        const result = await query('SELECT * FROM forma_pagamento ORDER BY id_forma_pagamento');
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar formas de pagamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.criarFormaPagamento = async (req, res) => {
    try {
        // O id_forma_pagamento NÃO vem do front: quem gera é a sequence do banco
        const nome_forma_pagamento = (req.body.nome_forma_pagamento || '').trim();

        if (!nome_forma_pagamento) {
            return res.status(400).json({ error: 'O nome da forma de pagamento é obrigatório' });
        }

        if (nome_forma_pagamento.length > MAX_NOME_FORMA_PAGAMENTO) {
            return res.status(400).json({
                error: `O nome da forma de pagamento deve ter no máximo ${MAX_NOME_FORMA_PAGAMENTO} caracteres`
            });
        }

        const result = await query(
            'INSERT INTO forma_pagamento (nome_forma_pagamento) VALUES ($1) RETURNING *',
            [nome_forma_pagamento]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar forma de pagamento:', error);

        // NOT NULL violado
        if (error.code === '23502') {
            return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
        }

        // Chave primária duplicada (sequence fora de sincronia com os dados)
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Já existe uma forma de pagamento com esse ID' });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.obterFormaPagamento = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        const result = await query('SELECT * FROM forma_pagamento WHERE id_forma_pagamento = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Forma de pagamento não encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao obter forma de pagamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.atualizarFormaPagamento = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        const nome_forma_pagamento = (req.body.nome_forma_pagamento || '').trim();

        if (!nome_forma_pagamento) {
            return res.status(400).json({ error: 'O nome da forma de pagamento é obrigatório' });
        }

        if (nome_forma_pagamento.length > MAX_NOME_FORMA_PAGAMENTO) {
            return res.status(400).json({
                error: `O nome da forma de pagamento deve ter no máximo ${MAX_NOME_FORMA_PAGAMENTO} caracteres`
            });
        }

        const result = await query(
            'UPDATE forma_pagamento SET nome_forma_pagamento = $1 WHERE id_forma_pagamento = $2 RETURNING *',
            [nome_forma_pagamento, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Forma de pagamento não encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar forma de pagamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.deletarFormaPagamento = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        // A FK pagamento_has_forma_pagamento -> forma_pagamento NÃO tem ON DELETE CASCADE,
        // então forma de pagamento usada em algum pagamento gera erro 23503 (tratado abaixo)
        const result = await query(
            'DELETE FROM forma_pagamento WHERE id_forma_pagamento = $1 RETURNING id_forma_pagamento',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Forma de pagamento não encontrada' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar forma de pagamento:', error);

        // Violação de foreign key (forma de pagamento usada em pagamentos)
        if (error.code === '23503') {
            return res.status(409).json({
                error: 'Não é possível deletar: existem pagamentos associados a esta forma de pagamento'
            });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};