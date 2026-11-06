
// Configuração da API, IP e porta.
const API_BASE_URL = 'http://localhost:3001';
let currentPersonId = null;
let operacao = null;

// Elementos do DOM
const form = document.getElementById('cargoForm');
const searchId = document.getElementById('searchId');
const btnBuscar = document.getElementById('btnBuscar');
const btnIncluir = document.getElementById('btnIncluir');
const btnAlterar = document.getElementById('btnAlterar');
const btnExcluir = document.getElementById('btnExcluir');
const btnCancelar = document.getElementById('btnCancelar');
const btnSalvar = document.getElementById('btnSalvar');
const cargosTableBody = document.getElementById('cargosTableBody');
const messageContainer = document.getElementById('messageContainer');

// Carregar lista de cargos ao inicializar
document.addEventListener('DOMContentLoaded', () => {
    carregarCargos();
});

// Event Listeners
btnBuscar.addEventListener('click', buscarCargo);
btnIncluir.addEventListener('click', incluirCargo);
btnAlterar.addEventListener('click', alterarCargo);
btnExcluir.addEventListener('click', excluirCargo);
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

// Função para formatar data para exibição
function formatarData(dataString) {
    if (!dataString) return '';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
}

// Função para converter data para formato ISO
function converterDataParaISO(dataString) {
    if (!dataString) return null;
    return new Date(dataString).toISOString();
}

// Função para buscar cargo por ID
async function buscarCargo() {
    const id = searchId.value.trim();
    if (!id) {
        mostrarMensagem('Digite um ID para buscar', 'warning');
        return;
    }
    bloquearCampos(false);
    //focus no campo searchId
    searchId.focus();
    try {
        const response = await fetch(`${API_BASE_URL}/cargo/${id}`);
        console.log(JSON.stringify(response));

        if (response.ok) {
            const cargo = await response.json();
            preencherFormulario(cargo);

            mostrarBotoes(true, false, true, true, false, false);// mostrarBotoes(btBuscar, btIncluir, btAlterar, btExcluir, btSalvar, btCancelar)
            mostrarMensagem('Cargo encontrado!', 'success');

        } else if (response.status === 404) {
            limparFormulario();
            searchId.value = id;
            mostrarBotoes(true, true, false, false, false, false); //mostrarBotoes(btBuscar, btIncluir, btAlterar, btExcluir, btSalvar, btCancelar)
            mostrarMensagem('Cargo não encontrado. Você pode incluir um novo cargo.', 'info');
            bloquearCampos(false);//bloqueia a pk e libera os demais campos
            //enviar o foco para o campo de nome
        } else {
            throw new Error('Erro ao buscar cargo');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao buscar cargo', 'error');
    }
}

// Função para preencher formulário com dados da cargo
function preencherFormulario(cargo) {
    console.log(JSON.stringify(cargo));


    currentPersonId = cargo.id_cargo;
    searchId.value = cargo.id_cargo;
    document.getElementById('nome_cargo').value = cargo.nome_cargo || '';

}


// Função para incluir cargo
async function incluirCargo() {

    mostrarMensagem('Digite os dados!', 'success');
    currentPersonId = searchId.value;
    // console.log('Incluir nova cargo - currentPersonId: ' + currentPersonId);
    limparFormulario();
    searchId.value = currentPersonId;
    bloquearCampos(true);

    mostrarBotoes(false, false, false, false, true, true); // mostrarBotoes(btBuscar, btIncluir, btAlterar, btExcluir, btSalvar, btCancelar)
    document.getElementById('nome_cargo').focus();
    operacao = 'incluir';
    // console.log('fim nova cargo - currentPersonId: ' + currentPersonId);
}

// Função para alterar cargo
async function alterarCargo() {
    mostrarMensagem('Digite os dados!', 'success');
    bloquearCampos(true);
    mostrarBotoes(false, false, false, false, true, true);// mostrarBotoes(btBuscar, btIncluir, btAlterar, btExcluir, btSalvar, btCancelar)
    document.getElementById('nome_cargo').focus();
    operacao = 'alterar';
}

// Função para excluir cargo
async function excluirCargo() {
    mostrarMensagem('Excluindo cargo...', 'info');
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
    const cargo = {
        id_cargo: searchId.value,
        nome_cargo: formData.get('nome_cargo'),

    };
    let response = null;
    try {
        if (operacao === 'incluir') {
            response = await fetch(`${API_BASE_URL}/cargo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cargo)
            });
        } else if (operacao === 'alterar') {
            response = await fetch(`${API_BASE_URL}/cargo/${currentPersonId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cargo)
            });
        } else if (operacao === 'excluir') {
            // console.log('Excluindo cargo com ID:', currentPersonId);
            response = await fetch(`${API_BASE_URL}/cargo/${currentPersonId}`, {
                method: 'DELETE'
            });
            console.log('Cargo excluído' + response.status);
        }
        if (response.ok && (operacao === 'incluir' || operacao === 'alterar')) {
            const novaCargo = await response.json();
            mostrarMensagem('Operação ' + operacao + ' realizada com sucesso!', 'success');
            limparFormulario();
            carregarCargos();

        } else if (operacao !== 'excluir') {
            const error = await response.json();
            mostrarMensagem(error.error || 'Erro ao incluir cargo', 'error');
        } else {
            mostrarMensagem('Cargo excluída com sucesso!', 'success');
            limparFormulario();
            carregarCargos();
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao incluir ou alterar a cargo', 'error');
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

// Função para carregar lista de cargos
async function carregarCargos() {
    try {
        const rota = `${API_BASE_URL}/cargo`;
        // console.log("a rota " + rota);


        const response = await fetch(rota);
        //   console.log(JSON.stringify(response));


        //    debugger
        if (response.ok) {
            const cargos = await response.json();
            renderizarTabelaCargos(cargos);
        } else {
            throw new Error('Erro ao carregar cargos');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao carregar lista de cargos', 'error');
    }
}

// Função para renderizar tabela de cargos
function renderizarTabelaCargos(cargos) {
    cargosTableBody.innerHTML = '';

    cargos.forEach(cargo => {
        const row = document.createElement('tr');
        row.innerHTML = `
                    <td>
                        <button class="btn-id" onclick="selecionarCargo(${cargo.id_cargo})">
                            ${cargo.id_cargo}
                        </button>
                    </td>
                    <td>${cargo.nome_cargo}</td>                  
                `;
        cargosTableBody.appendChild(row);
    });
}

// Função para selecionar cargo da tabela
async function selecionarCargo(id) {
    searchId.value = id;
    await buscarCargo();
}
