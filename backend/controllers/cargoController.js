const { query } = require('../database');
const path = require('path');

// Tamanho máximo do campo nome_cargo no banco: character varying(45)
const MAX_NOME_CARGO = 45;

exports.abrirCrudCargo = (req, res) => {
    const usuario = req.cookies.usuarioLogado; // O cookie deve conter o nome/ID do usuário

    if (usuario) {
        res.sendFile(path.join(__dirname, '../../frontend/cargo/cargo.html'));
    } else {
        // Cookie não existe. Usuário NÃO está logado.
        res.redirect('/login');
    }
};

exports.listarCargos = async (req, res) => {
    try {
        const result = await query('SELECT * FROM cargo ORDER BY id_cargo');
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar cargos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.criarCargo = async (req, res) => {
    try {
        // O id_cargo NÃO vem mais do front: quem gera é a sequence do banco
        const nome_cargo = (req.body.nome_cargo || '').trim();

        if (!nome_cargo) {
            return res.status(400).json({ error: 'O nome do cargo é obrigatório' });
        }

        if (nome_cargo.length > MAX_NOME_CARGO) {
            return res.status(400).json({
                error: `O nome do cargo deve ter no máximo ${MAX_NOME_CARGO} caracteres`
            });
        }

        const result = await query(
            'INSERT INTO cargo (nome_cargo) VALUES ($1) RETURNING *',
            [nome_cargo]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar cargo:', error);

        // NOT NULL violado
        if (error.code === '23502') {
            return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
        }

        // Chave primária duplicada (sequence fora de sincronia com os dados)
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Já existe um cargo com esse ID' });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.obterCargo = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        const result = await query('SELECT * FROM cargo WHERE id_cargo = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cargo não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao obter cargo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.atualizarCargo = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        const nome_cargo = (req.body.nome_cargo || '').trim();

        if (!nome_cargo) {
            return res.status(400).json({ error: 'O nome do cargo é obrigatório' });
        }

        if (nome_cargo.length > MAX_NOME_CARGO) {
            return res.status(400).json({
                error: `O nome do cargo deve ter no máximo ${MAX_NOME_CARGO} caracteres`
            });
        }

        const result = await query(
            'UPDATE cargo SET nome_cargo = $1 WHERE id_cargo = $2 RETURNING *',
            [nome_cargo, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cargo não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar cargo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.deletarCargo = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        // No SQL novo a FK funcionario -> cargo NÃO tem ON DELETE CASCADE,
        // então cargo em uso por algum funcionário gera erro 23503 (tratado abaixo)
        const result = await query(
            'DELETE FROM cargo WHERE id_cargo = $1 RETURNING id_cargo',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cargo não encontrado' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar cargo:', error);

        // Violação de foreign key (existe funcionário com esse cargo)
        if (error.code === '23503') {
            return res.status(400).json({
                error: 'Não é possível deletar: existem funcionários associados a este cargo'
            });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};