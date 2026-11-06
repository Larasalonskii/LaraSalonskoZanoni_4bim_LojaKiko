// URL base do backend (o frontend também pode ser aberto por Live Server, em outra porta)
const API_BASE_URL = 'http://localhost:3001';
const API_COLECAO = `${API_BASE_URL}/colecao`;

const $ = (id) => document.getElementById(id);

const campoBusca = $('searchId');
const campoId = $('id_colecao');
const campoNome = $('nome_colecao');

const btnBuscar = $('btnBuscar');
const btnIncluir = $('btnIncluir');
const btnAlterar = $('btnAlterar');
const btnExcluir = $('btnExcluir');
const btnSalvar = $('btnSalvar');
const btnCancelar = $('btnCancelar');

const tabelaCorpo = $('colecoesTableBody');
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

function preencherFormulario(colecao) {
    campoId.value = colecao.id_colecao;
    campoNome.value = colecao.nome_colecao || '';
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
async function carregarColecoes() {
    try {
        const colecoes = await requisicao(API_COLECAO);
        tabelaCorpo.replaceChildren();

        if (colecoes.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 2;
            td.textContent = 'Nenhuma coleção cadastrada';
            tr.appendChild(td);
            tabelaCorpo.appendChild(tr);
            return;
        }

        colecoes.forEach((colecao) => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';

            [colecao.id_colecao, colecao.nome_colecao].forEach((valor) => {
                const td = document.createElement('td');
                td.textContent = valor ?? '';
                tr.appendChild(td);
            });

            tr.addEventListener('click', () => buscarColecao(colecao.id_colecao));
            tabelaCorpo.appendChild(tr);
        });
    } catch (erro) {
        mostrarMensagem(erro.message, 'error');
    }
}

async function buscarColecao(idInformado) {
    const id = parseInt(idInformado ?? campoBusca.value, 10);

    if (isNaN(id)) {
        mostrarMensagem('Informe um ID válido para buscar', 'error');
        return;
    }

    try {
        const colecao = await requisicao(`${API_COLECAO}/${id}`);
        preencherFormulario(colecao);
        campoBusca.value = colecao.id_colecao;
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
        mostrarMensagem('O nome da coleção é obrigatório', 'error');
        campoNome.focus();
        return;
    }

    try {
        if (modo === 'incluindo') {
            await requisicao(API_COLECAO, {
                method: 'POST',
                body: JSON.stringify({ nome_colecao: nome })
            });
            mostrarMensagem('Coleção incluída com sucesso!');
        } else if (modo === 'alterando') {
            await requisicao(`${API_COLECAO}/${campoId.value}`, {
                method: 'PUT',
                body: JSON.stringify({ nome_colecao: nome })
            });
            mostrarMensagem('Coleção alterada com sucesso!');
        } else {
            return;
        }

        cancelar();
        carregarColecoes();
    } catch (erro) {
        mostrarMensagem(erro.message, 'error');
    }
}

async function excluir() {
    const id = campoId.value;
    if (!id) return;

    if (!confirm(`Excluir a coleção "${campoNome.value}" (ID ${id})?`)) return;

    try {
        await requisicao(`${API_COLECAO}/${id}`, { method: 'DELETE' });
        mostrarMensagem('Coleção excluída com sucesso!');
        cancelar();
        carregarColecoes();
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
btnBuscar.addEventListener('click', () => buscarColecao());
btnIncluir.addEventListener('click', iniciarInclusao);
btnAlterar.addEventListener('click', iniciarAlteracao);
btnExcluir.addEventListener('click', excluir);
btnSalvar.addEventListener('click', salvar);
btnCancelar.addEventListener('click', cancelar);

campoBusca.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
        evento.preventDefault();
        buscarColecao();
    }
});

// Início
definirModo('inicial');
carregarColecoes();