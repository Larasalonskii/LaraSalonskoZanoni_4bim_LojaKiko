const { query } = require('../database');
const path = require('path');

// Tamanho máximo do campo nome_produto no banco: character varying(45)
const MAX_NOME_PRODUTO = 45;

exports.abrirCrudProduto = (req, res) => {
    const usuario = req.cookies.usuarioLogado;

    if (usuario) {
        res.sendFile(path.join(__dirname, '../../frontend/produto/produto.html'));
    } else {
        res.redirect('/login');
    }
};

// Valida e normaliza os dados recebidos (usado no criar e no atualizar)
// Retorna { erro } ou { dados }
function validarProduto(body) {
    const nome_produto = (body.nome_produto || '').trim();

    if (!nome_produto) {
        return { erro: 'O nome do produto é obrigatório' };
    }

    if (nome_produto.length > MAX_NOME_PRODUTO) {
        return { erro: `O nome do produto deve ter no máximo ${MAX_NOME_PRODUTO} caracteres` };
    }

    // Preço (obrigatório, número >= 0)
    const preco = parseFloat(body.preco_unitario_produto);
    if (isNaN(preco) || preco < 0) {
        return { erro: 'O preço unitário deve ser um número maior ou igual a zero' };
    }

    // Estoque (opcional, inteiro >= 0)
    let quantidade = null;
    if (body.quantidade_estoque_produto !== undefined &&
        body.quantidade_estoque_produto !== null &&
        body.quantidade_estoque_produto !== '') {
        quantidade = parseInt(body.quantidade_estoque_produto);
        if (isNaN(quantidade) || quantidade < 0) {
            return { erro: 'A quantidade em estoque deve ser um número inteiro maior ou igual a zero' };
        }
    }

    // Coleção (opcional)
    let colecao = null;
    if (body.colecao_id_colecao !== undefined &&
        body.colecao_id_colecao !== null &&
        body.colecao_id_colecao !== '') {
        colecao = parseInt(body.colecao_id_colecao);
        if (isNaN(colecao)) {
            return { erro: 'Coleção inválida' };
        }
    }

    return {
        dados: {
            nome_produto,
            quantidade_estoque_produto: quantidade,
            preco_unitario_produto: preco,
            colecao_id_colecao: colecao
        }
    };
}

exports.listarProdutos = async (req, res) => {
    try {
        // LEFT JOIN para mostrar o nome da coleção (produto pode não ter coleção)
        const result = await query(
            `SELECT p.*, c.nome_colecao
               FROM produto p
               LEFT JOIN colecao c ON c.id_colecao = p.colecao_id_colecao
              ORDER BY p.id_produto`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar produtos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.criarProduto = async (req, res) => {
    try {
        // O id_produto NÃO vem do front: quem gera é a sequence do banco
        const { erro, dados } = validarProduto(req.body);

        if (erro) {
            return res.status(400).json({ error: erro });
        }

        const result = await query(
            `INSERT INTO produto
                (nome_produto, quantidade_estoque_produto, preco_unitario_produto, colecao_id_colecao)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [
                dados.nome_produto,
                dados.quantidade_estoque_produto,
                dados.preco_unitario_produto,
                dados.colecao_id_colecao
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar produto:', error);

        // NOT NULL violado
        if (error.code === '23502') {
            return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
        }

        // Chave primária duplicada (sequence fora de sincronia com os dados)
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Já existe um produto com esse ID' });
        }

        // FK inválida (coleção não existe)
        if (error.code === '23503') {
            return res.status(400).json({ error: 'A coleção informada não existe' });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.obterProduto = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        const result = await query('SELECT * FROM produto WHERE id_produto = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao obter produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.atualizarProduto = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        const { erro, dados } = validarProduto(req.body);

        if (erro) {
            return res.status(400).json({ error: erro });
        }

        const result = await query(
            `UPDATE produto
                SET nome_produto = $1,
                    quantidade_estoque_produto = $2,
                    preco_unitario_produto = $3,
                    colecao_id_colecao = $4
              WHERE id_produto = $5
              RETURNING *`,
            [
                dados.nome_produto,
                dados.quantidade_estoque_produto,
                dados.preco_unitario_produto,
                dados.colecao_id_colecao,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);

        // FK inválida (coleção não existe)
        if (error.code === '23503') {
            return res.status(400).json({ error: 'A coleção informada não existe' });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.deletarProduto = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        // A FK produto_tom -> produto NÃO tem ON DELETE CASCADE,
        // então produto com tons cadastrados gera erro 23503 (tratado abaixo)
        const result = await query(
            'DELETE FROM produto WHERE id_produto = $1 RETURNING id_produto',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar produto:', error);

        // Violação de foreign key (existem tons vinculados a esse produto)
        if (error.code === '23503') {
            return res.status(400).json({
                error: 'Não é possível deletar: existem tons (ou pedidos) associados a este produto'
            });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};