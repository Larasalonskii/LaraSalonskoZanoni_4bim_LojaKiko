// URL base do backend (o frontend também pode ser aberto por Live Server, em outra porta)
const API_BASE_URL = 'http://localhost:3001';
const API_FUNCIONARIO = `${API_BASE_URL}/funcionario`;
const API_CARGO = `${API_BASE_URL}/cargo`;

const $ = (id) => document.getElementById(id);

const campoBusca = $('searchId');
const campoCpf = $('pessoa_cpf_pessoa');
const campoNome = $('nome_pessoa');
const campoSalario = $('salario_funcionario');
const campoCargo = $('cargo_id_cargo');

const btnBuscar = $('btnBuscar');
const btnIncluir = $('btnIncluir');
const btnAlterar = $('btnAlterar');
const btnExcluir = $('btnExcluir');
const btnSalvar = $('btnSalvar');
const btnCancelar = $('btnCancelar');

const tabelaCorpo = $('funcionariosTableBody');
const containerMensagem = $('messageContainer');

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Modos da tela: inicial | consultado | incluindo | alterando
let modo = 'inicial';

// ---------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------
function mostrarMensagem(texto, tipo = 'success') {
  const div = document.createElement('div');
  div.className = `message ${tipo}`;
  div.textContent = texto;
  containerMensagem.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

async function requisicao(url, opcoes = {}) {
  const config = { credentials: 'include', ...opcoes };

  if (opcoes.body) {
    config.headers = { 'Content-Type': 'application/json', ...(opcoes.headers || {}) };
  }

  const resposta = await fetch(url, config);

  if (resposta.status === 204) return null;

  const corpo = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(corpo.error || 'Erro na requisição');
  }

  return corpo;
}

function formatarMoeda(valor) {
  if (valor === null || valor === undefined) return '—';
  return formatadorMoeda.format(valor);
}

function limparFormulario() {
  campoCpf.value = '';
  campoNome.value = '';
  campoSalario.value = '';
  campoCargo.value = '';
}

function preencherFormulario(funcionario) {
  campoCpf.value = funcionario.pessoa_cpf_pessoa;
  campoNome.value = funcionario.nome_pessoa || '';
  campoSalario.value = funcionario.salario_funcionario ?? '';
  // Atenção: o cargo de id 0 existe, então não dá para usar "||" aqui
  campoCargo.value = funcionario.cargo_id_cargo ?? '';
}

function exibir(elemento, visivel) {
  elemento.style.display = visivel ? '' : 'none';
}

// ---------------------------------------------------------------
// Estado da tela
// ---------------------------------------------------------------
function definirModo(novoModo) {
  modo = novoModo;

  const editando = modo === 'incluindo' || modo === 'alterando';

  // O CPF só pode ser digitado ao incluir (é a chave); o nome é sempre somente leitura
  campoCpf.disabled = modo !== 'incluindo';
  campoNome.disabled = true;
  campoSalario.disabled = !editando;
  campoCargo.disabled = !editando;

  campoBusca.disabled = editando;
  btnBuscar.disabled = editando;

  exibir(btnIncluir, modo === 'inicial');
  exibir(btnAlterar, modo === 'consultado');
  exibir(btnExcluir, modo === 'consultado');
  exibir(btnSalvar, editando);
  exibir(btnCancelar, true);
}

// ---------------------------------------------------------------
// Ações
// ---------------------------------------------------------------
async function carregarCargos() {
  try {
    const cargos = await requisicao(API_CARGO);

    campoCargo.replaceChildren();

    const opcaoInicial = document.createElement('option');
    opcaoInicial.value = '';
    opcaoInicial.textContent = 'Selecione um cargo';
    campoCargo.appendChild(opcaoInicial);

    cargos.forEach((cargo) => {
      const opcao = document.createElement('option');
      opcao.value = cargo.id_cargo;
      opcao.textContent = cargo.nome_cargo;
      campoCargo.appendChild(opcao);
    });
  } catch (erro) {
    mostrarMensagem(`Não foi possível carregar os cargos: ${erro.message}`, 'error');
  }
}

async function carregarFuncionarios() {
  try {
    const funcionarios = await requisicao(API_FUNCIONARIO);
    tabelaCorpo.replaceChildren();

    if (funcionarios.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.textContent = 'Nenhum funcionário cadastrado';
      tr.appendChild(td);
      tabelaCorpo.appendChild(tr);
      return;
    }

    funcionarios.forEach((funcionario) => {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';

      [
        funcionario.pessoa_cpf_pessoa,
        funcionario.nome_pessoa,
        funcionario.nome_cargo,
        formatarMoeda(funcionario.salario_funcionario)
      ].forEach((valor) => {
        const td = document.createElement('td');
        td.textContent = valor ?? '—';
        tr.appendChild(td);
      });

      tr.addEventListener('click', () => buscarFuncionario(funcionario.pessoa_cpf_pessoa));
      tabelaCorpo.appendChild(tr);
    });
  } catch (erro) {
    mostrarMensagem(erro.message, 'error');
  }
}

async function buscarFuncionario(cpfInformado) {
  const cpf = String(cpfInformado ?? campoBusca.value).trim();

  if (!cpf) {
    mostrarMensagem('Informe o CPF para buscar', 'error');
    return;
  }

  try {
    const funcionario = await requisicao(`${API_FUNCIONARIO}/${encodeURIComponent(cpf)}`);
    preencherFormulario(funcionario);
    campoBusca.value = funcionario.pessoa_cpf_pessoa;
    definirModo('consultado');
  } catch (erro) {
    limparFormulario();
    definirModo('inicial');
    mostrarMensagem(erro.message, 'error');
  }
}

function iniciarInclusao() {
  limparFormulario();
  campoBusca.value = '';
  definirModo('incluindo');
  campoCpf.focus();
}

function iniciarAlteracao() {
  definirModo('alterando');
  campoSalario.focus();
}

async function salvar() {
  const cpf = campoCpf.value.trim();

  if (!cpf) {
    mostrarMensagem('O CPF do funcionário é obrigatório', 'error');
    campoCpf.focus();
    return;
  }

  if (campoSalario.value === '' || Number(campoSalario.value) < 0) {
    mostrarMensagem('Informe um salário válido (maior ou igual a zero)', 'error');
    campoSalario.focus();
    return;
  }

  if (campoCargo.value === '') {
    mostrarMensagem('Selecione o cargo do funcionário', 'error');
    campoCargo.focus();
    return;
  }

  const corpo = {
    salario_funcionario: Number(campoSalario.value),
    cargo_id_cargo: Number(campoCargo.value)
  };

  try {
    if (modo === 'incluindo') {
      await requisicao(API_FUNCIONARIO, {
        method: 'POST',
        body: JSON.stringify({ pessoa_cpf_pessoa: cpf, ...corpo })
      });
      mostrarMensagem('Funcionário incluído com sucesso!');
    } else if (modo === 'alterando') {
      await requisicao(`${API_FUNCIONARIO}/${encodeURIComponent(cpf)}`, {
        method: 'PUT',
        body: JSON.stringify(corpo)
      });
      mostrarMensagem('Funcionário alterado com sucesso!');
    } else {
      return;
    }

    cancelar();
    carregarFuncionarios();
  } catch (erro) {
    mostrarMensagem(erro.message, 'error');
  }
}

async function excluir() {
  const cpf = campoCpf.value.trim();
  if (!cpf) return;

  const confirmou = confirm(
    `Excluir o funcionário "${campoNome.value}" (CPF ${cpf})?\nA pessoa continua cadastrada; só o registro de funcionário é removido.`
  );
  if (!confirmou) return;

  try {
    await requisicao(`${API_FUNCIONARIO}/${encodeURIComponent(cpf)}`, { method: 'DELETE' });
    mostrarMensagem('Funcionário excluído com sucesso!');
    cancelar();
    carregarFuncionarios();
  } catch (erro) {
    mostrarMensagem(erro.message, 'error');
  }
}

function cancelar() {
  limparFormulario();
  campoBusca.value = '';
  definirModo('inicial');
}

// ---------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------
btnBuscar.addEventListener('click', () => buscarFuncionario());
btnIncluir.addEventListener('click', iniciarInclusao);
btnAlterar.addEventListener('click', iniciarAlteracao);
btnExcluir.addEventListener('click', excluir);
btnSalvar.addEventListener('click', salvar);
btnCancelar.addEventListener('click', cancelar);

campoBusca.addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter') {
    evento.preventDefault();
    buscarFuncionario();
  }
});

// Início
definirModo('inicial');
carregarCargos();
carregarFuncionarios();