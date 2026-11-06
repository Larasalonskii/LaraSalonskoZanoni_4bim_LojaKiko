const { query } = require('../database');
const path = require('path');

// Tamanhos máximos dos campos no banco
const MAX = {
    cpf: 20,
    nome: 60,
    endereco: 150,
    senha: 50,
    email: 75,
    usuario: 50,
    telefone: 20
};

// to_char evita que a data de nascimento volte como Date com fuso horário
const COLUNAS = `cpf_pessoa, nome_pessoa,
                 to_char(data_nascimento_pessoa, 'YYYY-MM-DD') AS data_nascimento_pessoa,
                 endereco_pessoa, senha_pessoa, email_pessoa, usuario_pessoa, telefone_pessoa`;

exports.abrirCrudPessoa = (req, res) => {
    const usuario = req.cookies.usuarioLogado;

    if (usuario) {
        res.sendFile(path.join(__dirname, '../../frontend/pessoa/pessoa.html'));
    } else {
        res.redirect('/login');
    }
};

// Texto opcional: string vazia vira NULL
function textoOpcional(valor) {
    const t = (valor || '').toString().trim();
    return t === '' ? null : t;
}

// Valida e normaliza os dados (usado no criar e no atualizar)
// Retorna { erro } ou { dados }
function validarPessoa(body) {
    const nome_pessoa = (body.nome_pessoa || '').trim();

    if (!nome_pessoa) {
        return { erro: 'O nome da pessoa é obrigatório' };
    }
    if (nome_pessoa.length > MAX.nome) {
        return { erro: `O nome deve ter no máximo ${MAX.nome} caracteres` };
    }

    const endereco_pessoa = textoOpcional(body.endereco_pessoa);
    if (endereco_pessoa && endereco_pessoa.length > MAX.endereco) {
        return { erro: `O endereço deve ter no máximo ${MAX.endereco} caracteres` };
    }

    const senha_pessoa = textoOpcional(body.senha_pessoa);
    if (senha_pessoa && senha_pessoa.length > MAX.senha) {
        return { erro: `A senha deve ter no máximo ${MAX.senha} caracteres` };
    }

    const email_pessoa = textoOpcional(body.email_pessoa);
    if (email_pessoa) {
        if (email_pessoa.length > MAX.email) {
            return { erro: `O e-mail deve ter no máximo ${MAX.email} caracteres` };
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_pessoa)) {
            return { erro: 'E-mail inválido' };
        }
    }

    const usuario_pessoa = textoOpcional(body.usuario_pessoa);
    if (usuario_pessoa && usuario_pessoa.length > MAX.usuario) {
        return { erro: `O usuário deve ter no máximo ${MAX.usuario} caracteres` };
    }

    const telefone_pessoa = textoOpcional(body.telefone_pessoa);
    if (telefone_pessoa && telefone_pessoa.length > MAX.telefone) {
        return { erro: `O telefone deve ter no máximo ${MAX.telefone} caracteres` };
    }

    // Data de nascimento (opcional, formato YYYY-MM-DD)
    const data_nascimento_pessoa = textoOpcional(body.data_nascimento_pessoa);
    if (data_nascimento_pessoa && !/^\d{4}-\d{2}-\d{2}$/.test(data_nascimento_pessoa)) {
        return { erro: 'Data de nascimento inválida' };
    }

    return {
        dados: {
            nome_pessoa,
            data_nascimento_pessoa,
            endereco_pessoa,
            senha_pessoa,
            email_pessoa,
            usuario_pessoa,
            telefone_pessoa
        }
    };
}

exports.listarPessoas = async (req, res) => {
    try {
        // A senha não vai na listagem
        const result = await query(
            `SELECT cpf_pessoa, nome_pessoa,
                    to_char(data_nascimento_pessoa, 'YYYY-MM-DD') AS data_nascimento_pessoa,
                    endereco_pessoa, email_pessoa, usuario_pessoa, telefone_pessoa
               FROM pessoa
              ORDER BY nome_pessoa`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar pessoas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.criarPessoa = async (req, res) => {
    try {
        // Na pessoa o CPF É a chave primária e vem do front (não há sequence)
        const cpf_pessoa = (req.body.cpf_pessoa || '').toString().trim();

        if (!cpf_pessoa) {
            return res.status(400).json({ error: 'O CPF é obrigatório' });
        }
        if (cpf_pessoa.length > MAX.cpf) {
            return res.status(400).json({ error: `O CPF deve ter no máximo ${MAX.cpf} caracteres` });
        }

        const { erro, dados } = validarPessoa(req.body);

        if (erro) {
            return res.status(400).json({ error: erro });
        }

        const result = await query(
            `INSERT INTO pessoa
                (cpf_pessoa, nome_pessoa, data_nascimento_pessoa, endereco_pessoa,
                 senha_pessoa, email_pessoa, usuario_pessoa, telefone_pessoa)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING ${COLUNAS}`,
            [
                cpf_pessoa,
                dados.nome_pessoa,
                dados.data_nascimento_pessoa,
                dados.endereco_pessoa,
                dados.senha_pessoa,
                dados.email_pessoa,
                dados.usuario_pessoa,
                dados.telefone_pessoa
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar pessoa:', error);

        // NOT NULL violado
        if (error.code === '23502') {
            return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
        }

        // UNIQUE violado: pode ser o CPF (PK) ou o e-mail
        if (error.code === '23505') {
            if (error.constraint && error.constraint.includes('email')) {
                return res.status(409).json({ error: 'Já existe uma pessoa com esse e-mail' });
            }
            return res.status(409).json({ error: 'Já existe uma pessoa com esse CPF' });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.obterPessoa = async (req, res) => {
    try {
        const id = (req.params.id || '').trim();

        if (!id) {
            return res.status(400).json({ error: 'CPF inválido' });
        }

        const result = await query(
            `SELECT ${COLUNAS} FROM pessoa WHERE cpf_pessoa = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pessoa não encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao obter pessoa:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.atualizarPessoa = async (req, res) => {
    try {
        const id = (req.params.id || '').trim();

        if (!id) {
            return res.status(400).json({ error: 'CPF inválido' });
        }

        const { erro, dados } = validarPessoa(req.body);

        if (erro) {
            return res.status(400).json({ error: erro });
        }

        // O CPF (PK) não é alterado: é usado só no WHERE
        const result = await query(
            `UPDATE pessoa
                SET nome_pessoa = $1,
                    data_nascimento_pessoa = $2,
                    endereco_pessoa = $3,
                    senha_pessoa = $4,
                    email_pessoa = $5,
                    usuario_pessoa = $6,
                    telefone_pessoa = $7
              WHERE cpf_pessoa = $8
              RETURNING ${COLUNAS}`,
            [
                dados.nome_pessoa,
                dados.data_nascimento_pessoa,
                dados.endereco_pessoa,
                dados.senha_pessoa,
                dados.email_pessoa,
                dados.usuario_pessoa,
                dados.telefone_pessoa,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pessoa não encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar pessoa:', error);

        // E-mail já usado por outra pessoa
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Já existe uma pessoa com esse e-mail' });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.deletarPessoa = async (req, res) => {
    try {
        const id = (req.params.id || '').trim();

        if (!id) {
            return res.status(400).json({ error: 'CPF inválido' });
        }

        // As FKs funcionario -> pessoa e cliente -> pessoa NÃO têm ON DELETE CASCADE,
        // então pessoa que já é funcionário/cliente gera erro 23503 (tratado abaixo)
        const result = await query(
            'DELETE FROM pessoa WHERE cpf_pessoa = $1 RETURNING cpf_pessoa',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pessoa não encontrada' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar pessoa:', error);

        // Violação de foreign key (pessoa é funcionário e/ou cliente)
        if (error.code === '23503') {
            return res.status(400).json({
                error: 'Não é possível deletar: esta pessoa está cadastrada como funcionário ou cliente'
            });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};