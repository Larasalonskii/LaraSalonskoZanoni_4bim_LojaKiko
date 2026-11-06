const { query } = require('../database');
const path = require('path');

// Tamanho máximo do CPF no banco: character varying(20)
const MAX_CPF = 20;

// Cliente é uma especialização de Pessoa: o nome vem da tabela pessoa.
// A data é convertida para texto (YYYY-MM-DD) para não sofrer deslocamento de fuso no JSON.
const SELECT_CLIENTE = `
  SELECT cli.pessoa_cpf_pessoa,
         p.nome_pessoa,
         to_char(cli.data_cadastro_cliente, 'YYYY-MM-DD') AS data_cadastro_cliente
  FROM cliente cli
  JOIN pessoa p ON p.cpf_pessoa = cli.pessoa_cpf_pessoa`;

// Converte o valor recebido em data válida (YYYY-MM-DD) ou null (campo é opcional no banco)
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

exports.abrirCrudCliente = (req, res) => {
    const usuario = req.cookies.usuarioLogado; // O cookie deve conter o nome/ID do usuário

    if (usuario) {
        res.sendFile(path.join(__dirname, '../../frontend/cliente/cliente.html'));
    } else {
        // Cookie não existe. Usuário NÃO está logado.
        res.redirect('/login');
    }
};

exports.listarClientes = async (req, res) => {
    try {
        const result = await query(`${SELECT_CLIENTE} ORDER BY cli.pessoa_cpf_pessoa`);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar clientes:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.criarCliente = async (req, res) => {
    try {
        // O CPF é a chave da pessoa: ela precisa existir antes de virar cliente
        const cpf = String(req.body.pessoa_cpf_pessoa || '').trim();

        if (!cpf) {
            return res.status(400).json({ error: 'O CPF do cliente é obrigatório' });
        }

        if (cpf.length > MAX_CPF) {
            return res.status(400).json({
                error: `O CPF deve ter no máximo ${MAX_CPF} caracteres`
            });
        }

        const data = normalizarData(req.body.data_cadastro_cliente);
        if (!data.ok) {
            return res.status(400).json({ error: 'Data de cadastro inválida (use AAAA-MM-DD)' });
        }

        await query(
            'INSERT INTO cliente (pessoa_cpf_pessoa, data_cadastro_cliente) VALUES ($1, $2)',
            [cpf, data.valor]
        );

        const result = await query(`${SELECT_CLIENTE} WHERE cli.pessoa_cpf_pessoa = $1`, [cpf]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar cliente:', error);

        // Chave primária duplicada: essa pessoa já é cliente
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Já existe um cliente com esse CPF' });
        }

        // FK violada: não existe pessoa com esse CPF
        if (error.code === '23503') {
            return res.status(400).json({
                error: 'Não existe pessoa cadastrada com esse CPF. Cadastre a pessoa primeiro.'
            });
        }

        // NOT NULL violado
        if (error.code === '23502') {
            return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.obterCliente = async (req, res) => {
    try {
        // O CPF é texto (varchar), então NÃO pode passar por parseInt
        const cpf = String(req.params.id || '').trim();

        if (!cpf) {
            return res.status(400).json({ error: 'CPF é obrigatório' });
        }

        const result = await query(`${SELECT_CLIENTE} WHERE cli.pessoa_cpf_pessoa = $1`, [cpf]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao obter cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.atualizarCliente = async (req, res) => {
    try {
        const cpf = String(req.params.id || '').trim();

        if (!cpf) {
            return res.status(400).json({ error: 'CPF é obrigatório' });
        }

        const data = normalizarData(req.body.data_cadastro_cliente);
        if (!data.ok) {
            return res.status(400).json({ error: 'Data de cadastro inválida (use AAAA-MM-DD)' });
        }

        // Só a data de cadastro é do cliente; nome e demais dados são editados no CRUD de pessoa
        const update = await query(
            'UPDATE cliente SET data_cadastro_cliente = $1 WHERE pessoa_cpf_pessoa = $2 RETURNING pessoa_cpf_pessoa',
            [data.valor, cpf]
        );

        if (update.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        const result = await query(`${SELECT_CLIENTE} WHERE cli.pessoa_cpf_pessoa = $1`, [cpf]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.deletarCliente = async (req, res) => {
    try {
        const cpf = String(req.params.id || '').trim();

        if (!cpf) {
            return res.status(400).json({ error: 'CPF é obrigatório' });
        }

        // Remove só o registro de cliente (a pessoa continua existindo)
        const result = await query(
            'DELETE FROM cliente WHERE pessoa_cpf_pessoa = $1 RETURNING pessoa_cpf_pessoa',
            [cpf]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar cliente:', error);

        // Violação de foreign key (cliente tem pedidos)
        if (error.code === '23503') {
            return res.status(409).json({
                error: 'Não é possível deletar: o cliente está associado a pedidos.'
            });
        }

        res.status(500).json({ error: 'Erro interno do servidor ao tentar excluir o cliente.' });
    }
};