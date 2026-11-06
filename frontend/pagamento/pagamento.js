// URL base do backend (o frontend também pode ser aberto por Live Server, em outra porta)
const API_BASE_URL = 'http://localhost:3001';
const API_PAGAMENTO = `${API_BASE_URL}/pagamento`;
const API_FORMA_PAGAMENTO = `${API_BASE_URL}/forma_pagamento`;

const $ = (id) => document.getElementById(id);

const campoBusca = $('searchId');
const campoId = $('id_pagamento');
const campoPedido = $('pedido_id_pedido');
const campoCliente = $('nome_cliente');
const campoData = $('data_pagamento');
const spanTotal = $('totalPagamento');

const btnBuscar = $('btnBuscar');
const btnIncluir = $('btnIncluir');
const btnAlterar = $('btnAlterar');
const btnExcluir = $('btnExcluir');
const btnSalvar = $('btnSalvar');
const btnCancelar = $('btnCancelar');
const btnAdicionarForma = $('btnAdicionarForma');

const formasCorpo = $('formasTableBody');
const tabelaCorpo = $('pagamentosTableBody');
const containerMensagem = $('messageContainer');

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Formas de pagamento disponíveis (carregadas de GET /forma_pagamento)
let formasDisponiveis = [];

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

// Converte AAAA-MM-DDTHH:MM:SS em DD/MM/AAAA HH:MM sem passar por Date (evita erro de fuso)
function formatarDataHora(iso) {
  if (!iso) return '—';
  const [data, hora = ''] = iso.split('T');
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano} ${hora.slice(0, 5)}`.trim();
}

function exibir(elemento, visivel) {
  elemento.style.display = visivel ? '' : 'none';
}

// ---------------------------------------------------------------
// Linhas de formas de pagamento (parte N:N do formulário)
// ---------------------------------------------------------------
function criarLinhaForma(forma = {}) {
  const tr = document.createElement('tr');

  // Coluna: forma de pagamento
  const tdForma = document.createElement('td');
  const select = document.createElement('select');
  select.className = 'forma-select';

  const opcaoInicial = document.createElement('option');
  opcaoInicial.value = '';
  opcaoInicial.textContent = 'Selecione';
  select.appendChild(opcaoInicial);

  formasDisponiveis.forEach((f) => {
    const opcao = document.createElement('option');
    opcao.value = f.id_forma_pagamento;
    opcao.textContent = f.nome_forma_pagamento;
    select.appendChild(opcao);
  });

  select.value = forma.forma_pagamento_id ?? '';
  tdForma.appendChild(select);

  // Coluna: valor pago
  const tdValor = document.createElement('td');
  const inputValor = document.createElement('input');
  inputValor.type = 'number';
  inputValor.className = 'forma-valor';
  inputValor.min = '0.01';
  inputValor.step = '0.01';
  inputValor.value = forma.valor_pago ?? '';
  inputValor.addEventListener('input', atualizarTotal);
  tdValor.appendChild(inputValor);

  // Coluna: remover linha
  const tdRemover = document.createElement('td');
  const btnRemover = document.createElement('button');
  btnRemover.type = 'button';
  btnRemover.textContent = '✖';
  btnRemover.title = 'Remover forma';
  btnRemover.addEventListener('click', () => {
    tr.remove();
    atualizarTotal();
  });
  tdRemover.appendChild(btnRemover);

  tr.append(tdForma, tdValor, tdRemover);
  return tr;
}

function adicionarLinhaForma(forma = {}) {
  formasCorpo.appendChild(criarLinhaForma(forma));
  aplicarEstadoLinhas();
  atualizarTotal();
}

function lerFormasDoFormulario() {
  return Array.from(formasCorpo.querySelectorAll('tr')).map((tr) => ({
    forma_pagamento_id: tr.querySelector('.forma-select').value,
    valor_pago: tr.querySelector('.forma-valor').value
  }));
}

function atualizarTotal() {
  const total = lerFormasDoFormulario().reduce((soma, f) => {
    const valor = Number(f.valor_pago);
    return soma + (Number.isFinite(valor) ? valor : 0);
  }, 0);

  spanTotal.textContent = formatarMoeda(total);
}

// Habilita/desabilita os campos das linhas conforme o modo atual
function aplicarEstadoLinhas() {
  const editando = modo === 'incluindo' || modo === 'alterando';
  formasCorpo.querySelectorAll('select, input, button').forEach((el) => {
    el.disabled = !editando;
  });
}

// ---------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------
function limparFormulario() {
  campoId.value = '';
  campoPedido.value = '';
  campoCliente.value = '';
  campoData.value = '';
  formasCorpo.replaceChildren();
  atualizarTotal();
}

function preencherFormulario(pagamento) {
  campoId.value = pagamento.id_pagamento;
  campoPedido.value = pagamento.pedido_id_pedido;
  campoCliente.value = pagamento.nome_cliente || '';
  campoData.value = pagamento.data_pagamento || '';

  formasCorpo.replaceChildren();
  (pagamento.formas || []).forEach((f) => formasCorpo.appendChild(criarLinhaForma(f)));
  aplicarEstadoLinhas();
  atualizarTotal();
}

// ---------------------------------------------------------------
// Estado da tela
// ---------------------------------------------------------------
function definirModo(novoModo) {
  modo = novoModo;

  const editando = modo === 'incluindo' || modo === 'alterando';

  // O ID é sempre somente leitura (gerado pela sequence do banco); o cliente vem do pedido
  campoId.disabled = true;
  campoCliente.disabled = true;
  campoPedido.disabled = !editando;
  campoData.disabled = !editando;

  campoBusca.disabled = editando;
  btnBuscar.disabled = editando;

  exibir(btnIncluir, modo === 'inicial');
  exibir(btnAlterar, modo === 'consultado');
  exibir(btnExcluir, modo === 'consultado');
  exibir(btnSalvar, editando);
  exibir(btnAdicionarForma, editando);
  exibir(btnCancelar, true);

  aplicarEstadoLinhas();
}

// ---------------------------------------------------------------
// Ações
// ---------------------------------------------------------------
async function carregarFormasDisponiveis() {
  try {
    formasDisponiveis = await requisicao(API_FORMA_PAGAMENTO);
  } catch (erro) {
    mostrarMensagem(`Não foi possível carregar as formas de pagamento: ${erro.message}`, 'error');
  }
}

function descreverFormas(formas) {
  if (!formas || formas.length === 0) return '—';
  return formas.map((f) => `${f.nome_forma_pagamento}: ${formatarMoeda(f.valor_pago)}`).join(' | ');
}

async function carregarPagamentos() {
  try {
    const pagamentos = await requisicao(API_PAGAMENTO);
    tabelaCorpo.replaceChildren();

    if (pagamentos.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.textContent = 'Nenhum pagamento cadastrado';
      tr.appendChild(td);
      tabelaCorpo.appendChild(tr);
      return;
    }

    pagamentos.forEach((pagamento) => {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';

      [
        pagamento.id_pagamento,
        pagamento.pedido_id_pedido,
        pagamento.nome_cliente,
        formatarDataHora(pagamento.data_pagamento),
        descreverFormas(pagamento.formas),
        formatarMoeda(pagamento.valor_total_pagamento)
      ].forEach((valor) => {
        const td = document.createElement('td');
        td.textContent = valor ?? '—';
        tr.appendChild(td);
      });

      tr.addEventListener('click', () => buscarPagamento(pagamento.id_pagamento));
      tabelaCorpo.appendChild(tr);
    });
  } catch (erro) {
    mostrarMensagem(erro.message, 'error');
  }
}

async function buscarPagamento(idInformado) {
  const id = parseInt(idInformado ?? campoBusca.value, 10);

  if (isNaN(id)) {
    mostrarMensagem('Informe um ID válido para buscar', 'error');
    return;
  }

  try {
    const pagamento = await requisicao(`${API_PAGAMENTO}/${id}`);
    definirModo('consultado');
    preencherFormulario(pagamento);
    campoBusca.value = pagamento.id_pagamento;
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
  adicionarLinhaForma(); // começa com uma linha vazia
  campoPedido.focus();
}

function iniciarAlteracao() {
  definirModo('alterando');
  campoPedido.focus();
}

async function salvar() {
  if (campoPedido.value === '' || Number(campoPedido.value) <= 0) {
    mostrarMensagem('Informe o ID do pedido', 'error');
    campoPedido.focus();
    return;
  }

  const formas = lerFormasDoFormulario();

  if (formas.length === 0) {
    mostrarMensagem('Adicione ao menos uma forma de pagamento', 'error');
    return;
  }

  const usadas = new Set();
  for (const f of formas) {
    if (f.forma_pagamento_id === '') {
      mostrarMensagem('Selecione a forma de pagamento em todas as linhas', 'error');
      return;
    }
    if (f.valor_pago === '' || Number(f.valor_pago) <= 0) {
      mostrarMensagem('Informe um valor maior que zero em todas as formas', 'error');
      return;
    }
    if (usadas.has(f.forma_pagamento_id)) {
      mostrarMensagem('A mesma forma de pagamento não pode se repetir', 'error');
      return;
    }
    usadas.add(f.forma_pagamento_id);
  }

  // O total NÃO é enviado: o servidor calcula somando as formas
  const corpo = {
    pedido_id_pedido: Number(campoPedido.value),
    data_pagamento: campoData.value || null,
    formas: formas.map((f) => ({
      forma_pagamento_id: Number(f.forma_pagamento_id),
      valor_pago: Number(f.valor_pago)
    }))
  };

  try {
    if (modo === 'incluindo') {
      await requisicao(API_PAGAMENTO, { method: 'POST', body: JSON.stringify(corpo) });
      mostrarMensagem('Pagamento incluído com sucesso!');
    } else if (modo === 'alterando') {
      await requisicao(`${API_PAGAMENTO}/${campoId.value}`, {
        method: 'PUT',
        body: JSON.stringify(corpo)
      });
      mostrarMensagem('Pagamento alterado com sucesso!');
    } else {
      return;
    }

    cancelar();
    carregarPagamentos();
  } catch (erro) {
    mostrarMensagem(erro.message, 'error');
  }
}

async function excluir() {
  const id = campoId.value;
  if (!id) return;

  if (!confirm(`Excluir o pagamento ${id} (${spanTotal.textContent}) e suas formas de pagamento?`)) return;

  try {
    await requisicao(`${API_PAGAMENTO}/${id}`, { method: 'DELETE' });
    mostrarMensagem('Pagamento excluído com sucesso!');
    cancelar();
    carregarPagamentos();
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
btnBuscar.addEventListener('click', () => buscarPagamento());
btnIncluir.addEventListener('click', iniciarInclusao);
btnAlterar.addEventListener('click', iniciarAlteracao);
btnExcluir.addEventListener('click', excluir);
btnSalvar.addEventListener('click', salvar);
btnCancelar.addEventListener('click', cancelar);
btnAdicionarForma.addEventListener('click', () => adicionarLinhaForma());

campoBusca.addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter') {
    evento.preventDefault();
    buscarPagamento();
  }
});

// Início
(async () => {
  definirModo('inicial');
  await carregarFormasDisponiveis();
  carregarPagamentos();
})();