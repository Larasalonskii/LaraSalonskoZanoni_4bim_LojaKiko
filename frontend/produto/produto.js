// Configuração da API, IP e porta.
const API_BASE_URL = 'http://localhost:3001';
let currentPersonId = null;
let operacao = null;

// Elementos do DOM
const form = document.getElementById('produtoForm');
const searchId = document.getElementById('searchId');
const btnBuscar = document.getElementById('btnBuscar');
const btnIncluir = document.getElementById('btnIncluir');
const btnAlterar = document.getElementById('btnAlterar');
const btnExcluir = document.getElementById('btnExcluir');
const btnCancelar = document.getElementById('btnCancelar');
const btnSalvar = document.getElementById('btnSalvar');
const produtosTableBody = document.getElementById('produtosTableBody');
const messageContainer = document.getElementById('messageContainer');
const selectColecao = document.getElementById('colecao_id_colecao');

// Carregar coleções (para o select) e lista de produtos ao inicializar
document.addEventListener('DOMContentLoaded', () => {
    carregarColecoes();
    carregarProdutos();
});

// Event Listeners
btnBuscar.addEventListener('click', buscarProduto);
btnIncluir.addEventListener('click', incluirProduto);
btnAlterar.addEventListener('click', alterarProduto);
btnExcluir.addEventListener('click', excluirProduto);
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

// Função para formatar valor em reais
function formatarPreco(valor) {
    if (valor === null || valor === undefined) return '';
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Função para carregar as coleções no select
async function carregarColecoes() {
    try {
        const response = await fetch(`${API_BASE_URL}/colecao`);

        if (response.ok) {
            const colecoes = await response.json();
            selectColecao.innerHTML = '<option value="">Sem coleção</option>';
            colecoes.forEach(colecao => {
                const option = document.createElement('option');
                option.value = colecao.id_colecao;
                option.textContent = colecao.nome_colecao;
                selectColecao.appendChild(option);
            });
        } else {
            throw new Error('Erro ao carregar coleções');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao carregar lista de coleções', 'error');
    }
}

// Função para buscar produto por ID
async function buscarProduto() {
    const id = searchId.value.trim();
    if (!id) {
        mostrarMensagem('Digite um ID para buscar', 'warning');
        return;
    }
    bloquearCampos(false);
    //focus no campo searchId
    searchId.focus();
    try {
        const response = await fetch(`${API_BASE_URL}/produto/${id}`);
        console.log(JSON.stringify(response));

        if (response.ok) {
            const produto = await response.json();
            preencherFormulario(produto);

            mostrarBotoes(true, false, true, true, false, false);// mostrarBotoes(btBuscar, btIncluir, btAlterar, btExcluir, btSalvar, btCancelar)
            mostrarMensagem('Produto encontrado!', 'success');

        } else if (response.status === 404) {
            limparFormulario();
            searchId.value = id;
            mostrarBotoes(true, true, false, false, false, false); //mostrarBotoes(btBuscar, btIncluir, btAlterar, btExcluir, btSalvar, btCancelar)
            mostrarMensagem('Produto não encontrado. Você pode incluir um novo produto.', 'info');
            bloquearCampos(false);//bloqueia a pk e libera os demais campos
        } else {
            throw new Error('Erro ao buscar produto');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao buscar produto', 'error');
    }
}

// Função para preencher formulário com dados do produto
function preencherFormulario(produto) {
    console.log(JSON.stringify(produto));

    currentPersonId = produto.id_produto;
    searchId.value = produto.id_produto;
    document.getElementById('nome_produto').value = produto.nome_produto || '';
    document.getElementById('quantidade_estoque_produto').value = produto.quantidade_estoque_produto ?? '';
    document.getElementById('preco_unitario_produto').value = produto.preco_unitario_produto ?? '';
    selectColecao.value = produto.colecao_id_colecao ?? '';
}


// Função para incluir produto
async function incluirProduto() {

    mostrarMensagem('Digite os dados!', 'success');
    currentPersonId = searchId.value;
    limparFormulario();
    searchId.value = currentPersonId;
    bloquearCampos(true);

    mostrarBotoes(false, false, false, false, true, true); // mostrarBotoes(btBuscar, btIncluir, btAlterar, btExcluir, btSalvar, btCancelar)
    document.getElementById('nome_produto').focus();
    operacao = 'incluir';
}

// Função para alterar produto
async function alterarProduto() {
    mostrarMensagem('Digite os dados!', 'success');
    bloquearCampos(true);
    mostrarBotoes(false, false, false, false, true, true);// mostrarBotoes(btBuscar, btIncluir, btAlterar, btExcluir, btSalvar, btCancelar)
    document.getElementById('nome_produto').focus();
    operacao = 'alterar';
}

// Função para excluir produto
async function excluirProduto() {
    mostrarMensagem('Excluindo produto...', 'info');
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
    const produto = {
        id_produto: searchId.value,
        nome_produto: formData.get('nome_produto'),
        quantidade_estoque_produto: formData.get('quantidade_estoque_produto'),
        preco_unitario_produto: formData.get('preco_unitario_produto'),
        colecao_id_colecao: formData.get('colecao_id_colecao')
    };
    let response = null;
    try {
        if (operacao === 'incluir') {
            response = await fetch(`${API_BASE_URL}/produto`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(produto)
            });
        } else if (operacao === 'alterar') {
            response = await fetch(`${API_BASE_URL}/produto/${currentPersonId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(produto)
            });
        } else if (operacao === 'excluir') {
            response = await fetch(`${API_BASE_URL}/produto/${currentPersonId}`, {
                method: 'DELETE'
            });
            console.log('Produto excluído' + response.status);
        }
        if (response.ok && (operacao === 'incluir' || operacao === 'alterar')) {
            await response.json();
            mostrarMensagem('Operação ' + operacao + ' realizada com sucesso!', 'success');
            limparFormulario();
            carregarProdutos();

        } else if (operacao !== 'excluir') {
            const error = await response.json();
            mostrarMensagem(error.error || 'Erro ao incluir produto', 'error');
        } else if (response.ok) {
            mostrarMensagem('Produto excluído com sucesso!', 'success');
            limparFormulario();
            carregarProdutos();
        } else {
            // Ex.: produto com tons vinculados (erro 400 do backend)
            const error = await response.json();
            mostrarMensagem(error.error || 'Erro ao excluir produto', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao incluir, alterar ou excluir o produto', 'error');
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

// Função para carregar lista de produtos
async function carregarProdutos() {
    try {
        const response = await fetch(`${API_BASE_URL}/produto`);

        if (response.ok) {
            const produtos = await response.json();
            renderizarTabelaProdutos(produtos);
        } else {
            throw new Error('Erro ao carregar produtos');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao carregar lista de produtos', 'error');
    }
}

// Função para renderizar tabela de produtos
function renderizarTabelaProdutos(produtos) {
    produtosTableBody.innerHTML = '';

    produtos.forEach(produto => {
        const row = document.createElement('tr');
        row.innerHTML = `
                    <td>
                        <button class="btn-id" onclick="selecionarProduto(${produto.id_produto})">
                            ${produto.id_produto}
                        </button>
                    </td>
                    <td>${produto.nome_produto ?? ''}</td>
                    <td>${produto.quantidade_estoque_produto ?? ''}</td>
                    <td>${formatarPreco(produto.preco_unitario_produto)}</td>
                    <td>${produto.nome_colecao ?? '-'}</td>
                `;
        produtosTableBody.appendChild(row);
    });
}

// Função para selecionar produto da tabela
async function selecionarProduto(id) {
    searchId.value = id;
    await buscarProduto();
}