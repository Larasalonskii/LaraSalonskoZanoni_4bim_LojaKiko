const { query } = require('../database');
const path = require('path');

// Tamanho máximo do CPF no banco: character varying(20)
const MAX_CPF = 20;

// Funcionário é uma especialização de Pessoa: o nome vem da tabela pessoa
// e o nome do cargo vem da tabela cargo.
const SELECT_FUNCIONARIO = `
  SELECT f.pessoa_cpf_pessoa,
         p.nome_pessoa,
         f.salario_funcionario,
         f.cargo_id_cargo,
         c.nome_cargo
  FROM funcionario f
  JOIN pessoa p ON p.cpf_pessoa = f.pessoa_cpf_pessoa
  LEFT JOIN cargo c ON c.id_cargo = f.cargo_id_cargo`;

// Valida o salário: número finito e maior ou igual a zero (aceita vírgula decimal)
function normalizarSalario(valor) {
    if (valor === undefined || valor === null || String(valor).trim() === '') {
        return { ok: false, erro: 'O salário do funcionário é obrigatório' };
    }

    const numero = Number(String(valor).trim().replace(',', '.'));

    if (!Number.isFinite(numero) || numero < 0) {
        return { ok: false, erro: 'O salário deve ser um número maior ou igual a zero' };
    }

    return { ok: true, valor: numero };
}

// Valida o id do cargo. Atenção: o cargo de id 0 (Vendedor online) existe,
// então NÃO se pode usar "if (!id)" aqui.
function normalizarCargo(valor) {
    if (valor === undefined || valor === null || String(valor).trim() === '') {
        return { ok: false, erro: 'O cargo do funcionário é obrigatório' };
    }

    const id = Number(valor);

    if (!Number.isInteger(id) || id < 0) {
        return { ok: false, erro: 'Cargo inválido' };
    }

    return { ok: true, valor: id };
}

exports.abrirCrudFuncionario = (req, res) => {
    const usuario = req.cookies.usuarioLogado; // O cookie deve conter o nome/ID do usuário

    if (usuario) {
        res.sendFile(path.join(__dirname, '../../frontend/funcionario/funcionario.html'));
    } else {
        // Cookie não existe. Usuário NÃO está logado.
        res.redirect('/login');
    }
};

exports.listarFuncionarios = async (req, res) => {
    try {
        const result = await query(`${SELECT_FUNCIONARIO} ORDER BY f.pessoa_cpf_pessoa`);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar funcionários:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.criarFuncionario = async (req, res) => {
    try {
        // O CPF é a chave da pessoa: ela precisa existir antes de virar funcionário
        const cpf = String(req.body.pessoa_cpf_pessoa || '').trim();

        if (!cpf) {
            return res.status(400).json({ error: 'O CPF do funcionário é obrigatório' });
        }

        if (cpf.length > MAX_CPF) {
            return res.status(400).json({
                error: `O CPF deve ter no máximo ${MAX_CPF} caracteres`
            });
        }

        const salario = normalizarSalario(req.body.salario_funcionario);
        if (!salario.ok) {
            return res.status(400).json({ error: salario.erro });
        }

        const cargo = normalizarCargo(req.body.cargo_id_cargo);
        if (!cargo.ok) {
            return res.status(400).json({ error: cargo.erro });
        }

        await query(
            'INSERT INTO funcionario (pessoa_cpf_pessoa, salario_funcionario, cargo_id_cargo) VALUES ($1, $2, $3)',
            [cpf, salario.valor, cargo.valor]
        );

        const result = await query(`${SELECT_FUNCIONARIO} WHERE f.pessoa_cpf_pessoa = $1`, [cpf]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar funcionário:', error);

        // Chave primária duplicada: essa pessoa já é funcionário
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Já existe um funcionário com esse CPF' });
        }

        // FK violada: ou o cargo não existe, ou não existe pessoa com esse CPF
        if (error.code === '23503') {
            if (error.constraint && error.constraint.includes('cargo')) {
                return res.status(400).json({ error: 'O cargo informado não existe' });
            }
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

exports.obterFuncionario = async (req, res) => {
    try {
        // O CPF é texto (varchar), então NÃO pode passar por parseInt
        const cpf = String(req.params.id || '').trim();

        if (!cpf) {
            return res.status(400).json({ error: 'CPF é obrigatório' });
        }

        const result = await query(`${SELECT_FUNCIONARIO} WHERE f.pessoa_cpf_pessoa = $1`, [cpf]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Funcionário não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao obter funcionário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.atualizarFuncionario = async (req, res) => {
    try {
        const cpf = String(req.params.id || '').trim();

        if (!cpf) {
            return res.status(400).json({ error: 'CPF é obrigatório' });
        }

        const salario = normalizarSalario(req.body.salario_funcionario);
        if (!salario.ok) {
            return res.status(400).json({ error: salario.erro });
        }

        const cargo = normalizarCargo(req.body.cargo_id_cargo);
        if (!cargo.ok) {
            return res.status(400).json({ error: cargo.erro });
        }

        // Só salário e cargo são do funcionário; nome e demais dados são editados no CRUD de pessoa
        const update = await query(
            `UPDATE funcionario
          SET salario_funcionario = $1, cargo_id_cargo = $2
        WHERE pessoa_cpf_pessoa = $3
        RETURNING pessoa_cpf_pessoa`,
            [salario.valor, cargo.valor, cpf]
        );

        if (update.rows.length === 0) {
            return res.status(404).json({ error: 'Funcionário não encontrado' });
        }

        const result = await query(`${SELECT_FUNCIONARIO} WHERE f.pessoa_cpf_pessoa = $1`, [cpf]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar funcionário:', error);

        // FK violada: o cargo informado não existe
        if (error.code === '23503') {
            return res.status(400).json({ error: 'O cargo informado não existe' });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.deletarFuncionario = async (req, res) => {
    try {
        const cpf = String(req.params.id || '').trim();

        if (!cpf) {
            return res.status(400).json({ error: 'CPF é obrigatório' });
        }

        // Remove só o registro de funcionário (a pessoa continua existindo)
        const result = await query(
            'DELETE FROM funcionario WHERE pessoa_cpf_pessoa = $1 RETURNING pessoa_cpf_pessoa',
            [cpf]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Funcionário não encontrado' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar funcionário:', error);

        // Violação de foreign key (funcionário atendeu pedidos)
        if (error.code === '23503') {
            return res.status(409).json({
                error: 'Não é possível deletar: o funcionário está associado a pedidos.'
            });
        }

        res.status(500).json({ error: 'Erro interno do servidor ao tentar excluir o funcionário.' });
    }
};