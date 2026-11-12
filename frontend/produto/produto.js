
// ============================================================
// CRUD DE PRODUTOS - LOJA DE MAQUIAGENS
// VENDA POR UNIDADE
// ============================================================

const API_BASE_URL = 'http://localhost:3001';

let currentProductId = null;
let operacao = null;

const form = document.getElementById('produtoForm');
const searchId = document.getElementById('searchId');

const btnBuscar = document.getElementById('btnBuscar');
const btnIncluir = document.getElementById('btnIncluir');
const btnAlterar = document.getElementById('btnAlterar');
const btnExcluir = document.getElementById('btnExcluir');
const btnCancelar = document.getElementById('btnCancelar');
const btnSalvar = document.getElementById('btnSalvar');

const produtosTableBody =
    document.getElementById('produtosTableBody');

const messageContainer =
    document.getElementById('messageContainer');

const selectColecao =
    document.getElementById('colecao_id_colecao');

// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

    btnBuscar.addEventListener('click', buscarProduto);
    btnIncluir.addEventListener('click', incluirProduto);
    btnAlterar.addEventListener('click', alterarProduto);
    btnExcluir.addEventListener('click', excluirProduto);
    btnCancelar.addEventListener('click', cancelarOperacao);
    btnSalvar.addEventListener('click', salvarOperacao);

    bloquearCampos(false);

    mostrarBotoes(true, true, false, false, false, true);

    carregarColecoes();
    carregarProdutos();
});

// ============================================================
// MENSAGENS
// ============================================================

function mostrarMensagem(texto, tipo = 'info') {

    messageContainer.textContent = '';

    const mensagem = document.createElement('div');

    mensagem.className = `message ${tipo}`;
    mensagem.textContent = texto;

    messageContainer.appendChild(mensagem);

    setTimeout(() => {
        messageContainer.textContent = '';
    }, 3500);
}

// ============================================================
// CONTROLE DOS CAMPOS
// ============================================================

function bloquearCampos(editarDados) {

    const campos = [
        document.getElementById('nome_produto'),
        document.getElementById('quantidade_estoque_produto'),
        document.getElementById('preco_unitario_produto'),
        selectColecao
    ];

    campos.forEach(campo => {
        campo.disabled = !editarDados;
    });

    searchId.disabled = false;
}

function limparFormulario() {

    form.reset();
    currentProductId = null;
}

function mostrarBotoes(
    buscar,
    incluir,
    alterar,
    excluir,
    salvar,
    cancelar
) {

    btnBuscar.style.display = buscar ? 'inline-block' : 'none';
    btnIncluir.style.display = incluir ? 'inline-block' : 'none';
    btnAlterar.style.display = alterar ? 'inline-block' : 'none';
    btnExcluir.style.display = excluir ? 'inline-block' : 'none';
    btnSalvar.style.display = salvar ? 'inline-block' : 'none';
    btnCancelar.style.display = cancelar ? 'inline-block' : 'none';
}

// ============================================================
// FORMATAÇÃO
// ============================================================

function formatarPreco(valor) {

    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

async function lerResposta(response) {

    const texto = await response.text();

    if (!texto) return null;

    try {
        return JSON.parse(texto);
    } catch {
        return { message: texto };
    }
}

function obterMensagemErro(dados, mensagem) {

    return dados?.error ||
           dados?.message ||
           mensagem;
}

// ============================================================
// CARREGAR COLEÇÕES
// ============================================================

async function carregarColecoes() {

    try {

        const response = await fetch(`${API_BASE_URL}/colecao`);

        const colecoes = await lerResposta(response);

        if (!response.ok) {
            throw new Error(
                obterMensagemErro(colecoes, 'Erro ao carregar coleções.')
            );
        }

        selectColecao.innerHTML =
            '<option value="">Sem coleção</option>';

        (Array.isArray(colecoes) ? colecoes : []).forEach(colecao => {

            const option = document.createElement('option');

            option.value = colecao.id_colecao;
            option.textContent = colecao.nome_colecao;

            selectColecao.appendChild(option);
        });

    } catch (error) {

        console.error(error);
        mostrarMensagem(error.message, 'error');
    }
}

// ============================================================
// BUSCAR PRODUTO
// ============================================================

async function buscarProduto() {

    const id = searchId.value.trim();

    if (!id) {
        mostrarMensagem('Digite um ID para buscar.', 'warning');
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/produto/${encodeURIComponent(id)}`
        );

        const produto = await lerResposta(response);

        if (response.status === 404) {

            limparFormulario();
            searchId.value = id;

            bloquearCampos(true);

            mostrarBotoes(true, true, false, false, false, true);

            operacao = null;

            mostrarMensagem(
                'Produto não encontrado. Você pode cadastrar um novo.',
                'info'
            );

            return;
        }

        if (!response.ok) {
            throw new Error(
                obterMensagemErro(produto, 'Erro ao buscar produto.')
            );
        }

        preencherFormulario(produto);

        bloquearCampos(false);

        mostrarBotoes(true, false, true, true, false, true);

        operacao = null;

        mostrarMensagem('Produto encontrado!', 'success');

    } catch (error) {

        console.error(error);
        mostrarMensagem(error.message, 'error');
    }
}

// ============================================================
// PREENCHER FORMULÁRIO
// ============================================================

function preencherFormulario(produto) {

    currentProductId = produto.id_produto;

    searchId.value = produto.id_produto;

    document.getElementById('nome_produto').value =
        produto.nome_produto ?? '';

    document.getElementById('quantidade_estoque_produto').value =
        produto.quantidade_estoque_produto ?? 0;

    document.getElementById('preco_unitario_produto').value =
        produto.preco_unitario_produto ?? '';

    selectColecao.value =
        produto.colecao_id_colecao ?? '';
}

// ============================================================
// INCLUIR
// ============================================================

function incluirProduto() {

    const idDigitado = searchId.value.trim();

    limparFormulario();

    searchId.value = idDigitado;

    bloquearCampos(true);

    mostrarBotoes(false, false, false, false, true, true);

    operacao = 'incluir';

    document.getElementById('nome_produto').focus();

    mostrarMensagem('Preencha os dados do novo produto.', 'info');
}

// ============================================================
// ALTERAR
// ============================================================

function alterarProduto() {

    if (!currentProductId) {
        mostrarMensagem('Busque um produto primeiro.', 'warning');
        return;
    }

    bloquearCampos(true);

    mostrarBotoes(false, false, false, false, true, true);

    operacao = 'alterar';

    mostrarMensagem('Altere os dados do produto.', 'info');
}

// ============================================================
// EXCLUIR
// ============================================================

async function excluirProduto() {

    if (!currentProductId) {
        mostrarMensagem('Busque um produto primeiro.', 'warning');
        return;
    }

    if (!confirm('Deseja realmente excluir este produto?')) {
        return;
    }

    try {

        btnExcluir.disabled = true;

        const response = await fetch(
            `${API_BASE_URL}/produto/${encodeURIComponent(currentProductId)}`,
            { method: 'DELETE' }
        );

        const dados = await lerResposta(response);

        if (!response.ok) {
            throw new Error(
                obterMensagemErro(dados, 'Erro ao excluir produto.')
            );
        }

        mostrarMensagem('Produto excluído com sucesso!', 'success');

        cancelarOperacao();

        await carregarProdutos();

    } catch (error) {

        console.error(error);
        mostrarMensagem(error.message, 'error');

    } finally {

        btnExcluir.disabled = false;
    }
}

// ============================================================
// SALVAR PRODUTO
// ============================================================

async function salvarOperacao() {

    if (!['incluir', 'alterar'].includes(operacao)) {
        mostrarMensagem('Inicie uma operação primeiro.', 'warning');
        return;
    }

    const nome =
        document.getElementById('nome_produto').value.trim();

    const estoque =
        Number(document.getElementById('quantidade_estoque_produto').value);

    const preco =
        Number(document.getElementById('preco_unitario_produto').value);

    const colecaoValor = selectColecao.value;

    if (!nome) {
        mostrarMensagem('Informe o nome do produto.', 'warning');
        return;
    }

    if (!Number.isInteger(estoque) || estoque < 0) {
        mostrarMensagem('O estoque deve ser um número inteiro.', 'warning');
        return;
    }

    if (!Number.isFinite(preco) || preco < 0) {
        mostrarMensagem('Informe um preço válido.', 'warning');
        return;
    }

    // PREÇO POR UNIDADE
    // NÃO UTILIZAR PESO OU QUILOGRAMA

    const produto = {

        nome_produto: nome,

        quantidade_estoque_produto: estoque,

        preco_unitario_produto: preco,

        colecao_id_colecao:
            colecaoValor ? Number(colecaoValor) : null
    };

    if (operacao === 'alterar') {
        produto.id_produto = Number(currentProductId);
    }

    try {

        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Salvando...';

        const url = operacao === 'incluir'
            ? `${API_BASE_URL}/produto`
            : `${API_BASE_URL}/produto/${encodeURIComponent(currentProductId)}`;

        const response = await fetch(url, {

            method: operacao === 'incluir' ? 'POST' : 'PUT',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify(produto)
        });

        const dados = await lerResposta(response);

        if (!response.ok) {
            throw new Error(
                obterMensagemErro(dados, 'Erro ao salvar produto.')
            );
        }

        mostrarMensagem(
            operacao === 'incluir'
                ? 'Produto cadastrado com sucesso!'
                : 'Produto alterado com sucesso!',
            'success'
        );

        cancelarOperacao();

        await carregarProdutos();

    } catch (error) {

        console.error(error);
        mostrarMensagem(error.message, 'error');

    } finally {

        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Salvar';
    }
}

// ============================================================
// CANCELAR
// ============================================================

function cancelarOperacao() {

    limparFormulario();

    operacao = null;

    bloquearCampos(false);

    mostrarBotoes(true, true, false, false, false, true);

    searchId.value = '';
}

// ============================================================
// CARREGAR PRODUTOS
// ============================================================

async function carregarProdutos() {

    try {

        const response = await fetch(`${API_BASE_URL}/produto`);

        const produtos = await lerResposta(response);

        if (!response.ok) {
            throw new Error(
                obterMensagemErro(produtos, 'Erro ao carregar produtos.')
            );
        }

        renderizarTabelaProdutos(
            Array.isArray(produtos) ? produtos : []
        );

    } catch (error) {

        console.error(error);
        mostrarMensagem(error.message, 'error');
    }
}

// ============================================================
// MOSTRAR PRODUTOS NA TABELA
// ============================================================

function renderizarTabelaProdutos(produtos) {

    produtosTableBody.innerHTML = '';

    if (produtos.length === 0) {

        produtosTableBody.innerHTML = `
            <tr>
                <td colspan="5">
                    Nenhum produto cadastrado.
                </td>
            </tr>
        `;

        return;
    }

    produtos.forEach(produto => {

        const linha = document.createElement('tr');

        const valores = [
            produto.id_produto,
            produto.nome_produto,
            `${produto.quantidade_estoque_produto} unidade(s)`,
            `${formatarPreco(produto.preco_unitario_produto)} / unidade`,
            produto.nome_colecao || '-'
        ];

        valores.forEach((valor, indice) => {

            const coluna = document.createElement('td');

            if (indice === 0) {

                const botao = document.createElement('button');

                botao.type = 'button';
                botao.textContent = valor;

                botao.addEventListener('click', () => {
                    selecionarProduto(produto.id_produto);
                });

                coluna.appendChild(botao);

            } else {

                coluna.textContent = valor;
            }

            linha.appendChild(coluna);
        });

        produtosTableBody.appendChild(linha);
    });
}

// ============================================================
// SELECIONAR PRODUTO
// ============================================================

async function selecionarProduto(id) {

    searchId.value = id;

    await buscarProduto();
}
