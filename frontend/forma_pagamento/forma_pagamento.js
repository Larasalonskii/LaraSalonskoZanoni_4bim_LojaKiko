// URL base do backend (o frontend também pode ser aberto por Live Server, em outra porta)
const API_BASE_URL = 'http://localhost:3001';
const API_FORMA_PAGAMENTO = `${API_BASE_URL}/forma_pagamento`;

const $ = (id) => document.getElementById(id);

const campoBusca = $('searchId');
const campoId = $('id_forma_pagamento');
const campoNome = $('nome_forma_pagamento');

const btnBuscar = $('btnBuscar');
const btnIncluir = $('btnIncluir');
const btnAlterar = $('btnAlterar');
const btnExcluir = $('btnExcluir');
const btnSalvar = $('btnSalvar');
const btnCancelar = $('btnCancelar');

const tabelaCorpo = $('formasPagamentoTableBody');
const containerMensagem = $('messageContainer');

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

function limparFormulario() {
    campoId.value = '';
    campoNome.value = '';
}

function preencherFormulario(forma) {
    campoId.value = forma.id_forma_pagamento;
    campoNome.value = forma.nome_forma_pagamento || '';
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

    // O ID é sempre somente leitura (gerado pela sequence do banco)
    campoId.disabled = true;
    campoNome.disabled = !editando;

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
async function carregarFormasPagamento() {
    try {
        const formas = await requisicao(API_FORMA_PAGAMENTO);
        tabelaCorpo.replaceChildren();

        if (formas.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 2;
            td.textContent = 'Nenhuma forma de pagamento cadastrada';
            tr.appendChild(td);
            tabelaCorpo.appendChild(tr);
            return;
        }

        formas.forEach((forma) => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';

            [forma.id_forma_pagamento, forma.nome_forma_pagamento].forEach((valor) => {
                const td = document.createElement('td');
                td.textContent = valor ?? '';
                tr.appendChild(td);
            });

            tr.addEventListener('click', () => buscarFormaPagamento(forma.id_forma_pagamento));
            tabelaCorpo.appendChild(tr);
        });
    } catch (erro) {
        mostrarMensagem(erro.message, 'error');
    }
}

async function buscarFormaPagamento(idInformado) {
    const id = parseInt(idInformado ?? campoBusca.value, 10);

    if (isNaN(id)) {
        mostrarMensagem('Informe um ID válido para buscar', 'error');
        return;
    }

    try {
        const forma = await requisicao(`${API_FORMA_PAGAMENTO}/${id}`);
        preencherFormulario(forma);
        campoBusca.value = forma.id_forma_pagamento;
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
    campoNome.focus();
}

function iniciarAlteracao() {
    definirModo('alterando');
    campoNome.focus();
}

async function salvar() {
    const nome = campoNome.value.trim();

    if (!nome) {
        mostrarMensagem('O nome da forma de pagamento é obrigatório', 'error');
        campoNome.focus();
        return;
    }

    try {
        if (modo === 'incluindo') {
            await requisicao(API_FORMA_PAGAMENTO, {
                method: 'POST',
                body: JSON.stringify({ nome_forma_pagamento: nome })
            });
            mostrarMensagem('Forma de pagamento incluída com sucesso!');
        } else if (modo === 'alterando') {
            await requisicao(`${API_FORMA_PAGAMENTO}/${campoId.value}`, {
                method: 'PUT',
                body: JSON.stringify({ nome_forma_pagamento: nome })
            });
            mostrarMensagem('Forma de pagamento alterada com sucesso!');
        } else {
            return;
        }

        cancelar();
        carregarFormasPagamento();
    } catch (erro) {
        mostrarMensagem(erro.message, 'error');
    }
}

async function excluir() {
    const id = campoId.value;
    if (!id) return;

    if (!confirm(`Excluir a forma de pagamento "${campoNome.value}" (ID ${id})?`)) return;

    try {
        await requisicao(`${API_FORMA_PAGAMENTO}/${id}`, { method: 'DELETE' });
        mostrarMensagem('Forma de pagamento excluída com sucesso!');
        cancelar();
        carregarFormasPagamento();
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
btnBuscar.addEventListener('click', () => buscarFormaPagamento());
btnIncluir.addEventListener('click', iniciarInclusao);
btnAlterar.addEventListener('click', iniciarAlteracao);
btnExcluir.addEventListener('click', excluir);
btnSalvar.addEventListener('click', salvar);
btnCancelar.addEventListener('click', cancelar);

campoBusca.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
        evento.preventDefault();
        buscarFormaPagamento();
    }
});

// Início
definirModo('inicial');
carregarFormasPagamento();