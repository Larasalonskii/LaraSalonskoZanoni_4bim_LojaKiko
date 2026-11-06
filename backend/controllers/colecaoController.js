const { query } = require('../database');
const path = require('path');

// Tamanho máximo do campo nome_colecao no banco: character varying(60)
const MAX_NOME_COLECAO = 60;

exports.abrirCrudColecao = (req, res) => {
    const usuario = req.cookies.usuarioLogado; // O cookie deve conter o nome/ID do usuário

    if (usuario) {
        res.sendFile(path.join(__dirname, '../../frontend/colecao/colecao.html'));
    } else {
        // Cookie não existe. Usuário NÃO está logado.
        res.redirect('/login');
    }
};

exports.listarColecoes = async (req, res) => {
    try {
        const result = await query('SELECT * FROM colecao ORDER BY id_colecao');
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar coleções:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.criarColecao = async (req, res) => {
    try {
        // O id_colecao NÃO vem do front: quem gera é a sequence do banco
        const nome_colecao = (req.body.nome_colecao || '').trim();

        if (!nome_colecao) {
            return res.status(400).json({ error: 'O nome da coleção é obrigatório' });
        }

        if (nome_colecao.length > MAX_NOME_COLECAO) {
            return res.status(400).json({
                error: `O nome da coleção deve ter no máximo ${MAX_NOME_COLECAO} caracteres`
            });
        }

        const result = await query(
            'INSERT INTO colecao (nome_colecao) VALUES ($1) RETURNING *',
            [nome_colecao]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar coleção:', error);

        // NOT NULL violado
        if (error.code === '23502') {
            return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
        }

        // Chave primária duplicada (sequence fora de sincronia com os dados)
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Já existe uma coleção com esse ID' });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.obterColecao = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        const result = await query('SELECT * FROM colecao WHERE id_colecao = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Coleção não encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao obter coleção:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.atualizarColecao = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        const nome_colecao = (req.body.nome_colecao || '').trim();

        if (!nome_colecao) {
            return res.status(400).json({ error: 'O nome da coleção é obrigatório' });
        }

        if (nome_colecao.length > MAX_NOME_COLECAO) {
            return res.status(400).json({
                error: `O nome da coleção deve ter no máximo ${MAX_NOME_COLECAO} caracteres`
            });
        }

        const result = await query(
            'UPDATE colecao SET nome_colecao = $1 WHERE id_colecao = $2 RETURNING *',
            [nome_colecao, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Coleção não encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar coleção:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.deletarColecao = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        // A FK produto -> colecao NÃO tem ON DELETE CASCADE,
        // então coleção em uso por algum produto gera erro 23503 (tratado abaixo)
        const result = await query(
            'DELETE FROM colecao WHERE id_colecao = $1 RETURNING id_colecao',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Coleção não encontrada' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar coleção:', error);

        // Violação de foreign key (existem produtos nessa coleção)
        if (error.code === '23503') {
            return res.status(409).json({
                error: 'Não é possível deletar: existem produtos associados a esta coleção'
            });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};