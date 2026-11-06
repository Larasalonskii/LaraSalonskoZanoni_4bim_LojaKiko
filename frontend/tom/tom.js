// Configuração da API, IP e porta.
const API_BASE_URL = 'http://localhost:3001';
let currentPersonId = null;
let operacao = null;

// Elementos do DOM
const form = document.getElementById('tomForm');
const searchId = document.getElementById('searchId');
const btnBuscar = document.getElementById('btnBuscar');
const btnIncluir = document.getElementById('btnIncluir');
const btnAlterar = document.getElementById('btnAlterar');
const btnExcluir = document.getElementById('btnExcluir');
const btnCancelar = document.getElementById('btnCancelar');
const btnSalvar = document.getElementById('btnSalvar');
const tonsTableBody = document.getElementById('tonsTableBody');
const messageContainer = document.getElementById('messageContainer');

// Carregar lista de tons ao inicializar
document.addEventListener('DOMContentLoaded', () => {
    carregarTons();
});

// Event Listeners
btnBuscar.addEventListener('click', buscarTom);
btnIncluir.addEventListener('click', incluirTom);
btnAlterar.addEventListener('click', alterarTom);
btnExcluir.addEventListener('click', excluirTom);
btnCancelar.addEventListener('click', cancelarOperacao);
btnSalvar.addEventListener('click', salvarOperacao);

mostrarBotoes(true, false, false, false, false, false);// mostrarBotoes(btBuscar, btIncluir, btAlterar, btExcluir, btSalvar, btCancelar)
bloquearCampos(false);//libera pk e bloqueia os demais campos

// Função para mostrar mensagens
function mostrarMensagem(texto, tipo = 'info') {
    messageContainer.innerHTML = `<div class="message ${tipo}">${texto}</div>`;
    setTimeout(() => {
        messageContainer.innerHTML = '';
    }, 3000);
}

function bloquearCampos(bloquearPrimeiro) {
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach((input, index) => {
        if (index === 0) {
            // Primeiro elemento - bloqueia se bloquearPrimeiro for true, libera se for false
            input.disabled = bloquearPrimeiro;
        } else {
            // Demais elementos - faz o oposto do primeiro
            input.disabled = !bloquearPrimeiro;
        }
    });
}

// Função para limpar formulário
function limparFormulario() {
    form.reset();
}


function mostrarBotoes(btBuscar, btIncluir, btAlterar, btExcluir, btSalvar, btCancelar) {
    btnBuscar.style.display = btBuscar ? 'inline-block' : 'none';
    btnIncluir.style.display = btIncluir ? 'inline-block' : 'none';
    btnAlterar.style.display = btAlterar ? 'inline-block' : 'none';
    btnExcluir.style.display = btExcluir ? 'inline-block' : 'none';
    btnSalvar.style.display = btSalvar ? 'inline-block' : 'none';
    btnCancelar.style.display = btCancelar ? 'inline-block' : 'none';
}

// Escapa texto vindo do banco antes de colocar no innerHTML
function escapeHtml(texto) {
    if (texto === null || texto === undefined) return '';
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Função para buscar tom por ID
async function buscarTom() {
    const id = searchId.value.trim();
    if (!id) {
        mostrarMensagem('Digite um ID para buscar', 'warning');
        return;
    }
    bloquearCampos(false);
    //focus no campo searchId
    searchId.focus();
    try {
        const response = await fetch(`${API_BASE_URL}/tom/${id}`);
        console.log(JSON.stringify(response));

        if (response.ok) {
            const tom = await response.json();
            preencherFormulario(tom);

            mostrarBotoes(true, false, true, true, false, false);// mostrarBotoes(btBuscar, btIncluir, btAlterar, btExcluir, btSalvar, btCancelar)
            mostrarMensagem('Tom encontrado!', 'success');

        } else if (response.status === 404) {
            limparFormulario();
            searchId.value = id;
            mostrarBotoes(true, true, false, false, false, false); //mostrarBotoes(btBuscar, btIncluir, btAlterar, btExcluir, btSalvar, btCancelar)
            mostrarMensagem('Tom não encontrado. Você pode incluir um novo tom.', 'info');
            bloquearCampos(false);//bloqueia a pk e libera os demais campos
        } else {
            throw new Error('Erro ao buscar tom');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao buscar tom', 'error');
    }
}

// Função para preencher formulário com dados do tom
function preencherFormulario(tom) {
    console.log(JSON.stringify(tom));

    currentPersonId = tom.id_tom;
    searchId.value = tom.id_tom;
    document.getElementById('nome_tom').value = tom.nome_tom || '';
}


// Função para incluir tom
async function incluirTom() {

    mostrarMensagem('Digite os dados!', 'success');
    currentPersonId = searchId.value;
    limparFormulario();
    searchId.value = currentPersonId;
    bloquearCampos(true);

    mostrarBotoes(false, false, false, false, true, true); // mostrarBotoes(btBuscar, btIncluir, btAlterar, btExcluir, btSalvar, btCancelar)
    document.getElementById('nome_tom').focus();
    operacao = 'incluir';
}

// Função para alterar tom
async function alterarTom() {
    mostrarMensagem('Digite os dados!', 'success');
    bloquearCampos(true);
    mostrarBotoes(false, false, false, false, true, true);// mostrarBotoes(btBuscar, btIncluir, btAlterar, btExcluir, btSalvar, btCancelar)
    document.getElementById('nome_tom').focus();
    operacao = 'alterar';
}

// Função para excluir tom
async function excluirTom() {
    mostrarMensagem('Excluindo tom...', 'info');
    currentPersonId = searchId.value;
    //bloquear searchId
    searchId.disabled = true;
    bloquearCampos(false); // libera os demais campos
    mostrarBotoes(false, false, false, false, true, true);// mostrarBotoes(btBuscar, btIncluir, btAlterar, btExcluir, btSalvar, btCancelar)
    operacao = 'excluir';
}

async function salvarOperacao() {
    console.log('Operação:', operacao + ' - currentPersonId: ' + currentPersonId + ' - searchId: ' + searchId.value);

    const formData = new FormData(form);
    const tom = {
        id_tom: searchId.value,
        nome_tom: formData.get('nome_tom')
    };
    let response = null;
    try {
        if (operacao === 'incluir') {
            response = await fetch(`${API_BASE_URL}/tom`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tom)
            });
        } else if (operacao === 'alterar') {
            response = await fetch(`${API_BASE_URL}/tom/${currentPersonId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tom)
            });
        } else if (operacao === 'excluir') {
            response = await fetch(`${API_BASE_URL}/tom/${currentPersonId}`, {
                method: 'DELETE'
            });
            console.log('Tom excluído ' + response.status);
        }
        if (response.ok && (operacao === 'incluir' || operacao === 'alterar')) {
            await response.json();
            mostrarMensagem('Operação ' + operacao + ' realizada com sucesso!', 'success');
            limparFormulario();
            carregarTons();

        } else if (operacao !== 'excluir') {
            const error = await response.json();
            mostrarMensagem(error.error || 'Erro ao incluir tom', 'error');
        } else if (response.ok) {
            mostrarMensagem('Tom excluído com sucesso!', 'success');
            limparFormulario();
            carregarTons();
        } else {
            // Ex.: tom em uso por algum produto (erro 400 do backend)
            const error = await response.json();
            mostrarMensagem(error.error || 'Erro ao excluir tom', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao incluir, alterar ou excluir o tom', 'error');
    }

    mostrarBotoes(true, false, false, false, false, false);// mostrarBotoes(btBuscar, btIncluir, btAlterar, btExcluir, btSalvar, btCancelar)
    bloquearCampos(false);//libera pk e bloqueia os demais campos
    document.getElementById('searchId').focus();
}

// Função para cancelar operação
function cancelarOperacao() {
    limparFormulario();
    mostrarBotoes(true, false, false, false, false, false);// mostrarBotoes(btBuscar, btIncluir, btAlterar, btExcluir, btSalvar, btCancelar)
    bloquearCampos(false);//libera pk e bloqueia os demais campos
    document.getElementById('searchId').focus();
    mostrarMensagem('Operação cancelada', 'info');
}

// Função para carregar lista de tons
async function carregarTons() {
    try {
        const response = await fetch(`${API_BASE_URL}/tom`);

        if (response.ok) {
            const tons = await response.json();
            renderizarTabelaTons(tons);
        } else {
            throw new Error('Erro ao carregar tons');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao carregar lista de tons', 'error');
    }
}

// Função para renderizar tabela de tons
function renderizarTabelaTons(tons) {
    tonsTableBody.innerHTML = '';

    tons.forEach(tom => {
        const row = document.createElement('tr');
        row.innerHTML = `
                    <td>
                        <button class="btn-id" onclick="selecionarTom(${tom.id_tom})">
                            ${tom.id_tom}
                        </button>
                    </td>
                    <td>${escapeHtml(tom.nome_tom)}</td>
                `;
        tonsTableBody.appendChild(row);
    });
}

// Função para selecionar tom da tabela
async function selecionarTom(id) {
    searchId.value = id;
    await buscarTom();
}