const { query } = require('../database');
const path = require('path');

// Tamanho máximo do campo nome_tom no banco: character varying(40)
const MAX_NOME_TOM = 40;

exports.abrirCrudTom = (req, res) => {
    const usuario = req.cookies.usuarioLogado;

    if (usuario) {
        res.sendFile(path.join(__dirname, '../../frontend/tom/tom.html'));
    } else {
        res.redirect('/login');
    }
};

exports.listarTons = async (req, res) => {
    try {
        const result = await query('SELECT * FROM tom ORDER BY id_tom');
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar tons:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.criarTom = async (req, res) => {
    try {
        // O id_tom NÃO vem do front: quem gera é a sequence do banco
        const nome_tom = (req.body.nome_tom || '').trim();

        if (!nome_tom) {
            return res.status(400).json({ error: 'O nome do tom é obrigatório' });
        }

        if (nome_tom.length > MAX_NOME_TOM) {
            return res.status(400).json({
                error: `O nome do tom deve ter no máximo ${MAX_NOME_TOM} caracteres`
            });
        }

        const result = await query(
            'INSERT INTO tom (nome_tom) VALUES ($1) RETURNING *',
            [nome_tom]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar tom:', error);

        // NOT NULL violado
        if (error.code === '23502') {
            return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
        }

        // UNIQUE violado: nome_tom repetido (ou PK, se a sequence estiver fora de sincronia)
        if (error.code === '23505') {
            if (error.constraint && error.constraint.includes('nome_tom')) {
                return res.status(409).json({ error: 'Já existe um tom com esse nome' });
            }
            return res.status(409).json({ error: 'Já existe um tom com esse ID' });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.obterTom = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        const result = await query('SELECT * FROM tom WHERE id_tom = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tom não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao obter tom:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.atualizarTom = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        const nome_tom = (req.body.nome_tom || '').trim();

        if (!nome_tom) {
            return res.status(400).json({ error: 'O nome do tom é obrigatório' });
        }

        if (nome_tom.length > MAX_NOME_TOM) {
            return res.status(400).json({
                error: `O nome do tom deve ter no máximo ${MAX_NOME_TOM} caracteres`
            });
        }

        const result = await query(
            'UPDATE tom SET nome_tom = $1 WHERE id_tom = $2 RETURNING *',
            [nome_tom, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tom não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar tom:', error);

        // Nome já usado por outro tom
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Já existe um tom com esse nome' });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.deletarTom = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        // A FK produto_tom -> tom NÃO tem ON DELETE CASCADE,
        // então tom em uso por algum produto gera erro 23503 (tratado abaixo)
        const result = await query(
            'DELETE FROM tom WHERE id_tom = $1 RETURNING id_tom',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tom não encontrado' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar tom:', error);

        // Violação de foreign key (existem produtos com esse tom)
        if (error.code === '23503') {
            return res.status(400).json({
                error: 'Não é possível deletar: existem produtos associados a este tom'
            });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};