
const API_BASE_URL = 'http://localhost:3001';
const API_IMAGEM_PREFIX = '/view-image';

const carrosselWrapper = document.getElementById('carrossel-wrapper');
const contadorCarrinho = document.getElementById('contadorCarrinho');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const itemMenuCadastros = document.getElementById('itemMenuCadastros');

// ======================================================
// USUÁRIO E LOGIN
// ======================================================

function handleUserAction(action) {
    if (action === 'sair') {
        logout();
    }
}

async function logout() {
    try {
        const res = await fetch(`${API_BASE_URL}/login/logout`, {
            credentials: 'include'
        });

        window.location.href = '../login/login.html';
        return res.ok;

    } catch (error) {
        console.error('Erro ao sair:', error);
        window.location.href = '../login/login.html';
        return false;
    }
}

async function verificarAutorizacao() {
    try {
        const res = await fetch(
            `${API_BASE_URL}/login/verificaSeUsuarioEstaLogado`,
            { credentials: 'include' }
        );

        const usuarioResposta = await res.json();

        if (usuarioResposta.status !== 'ok') {
            window.location.href = '../login/login.html';
            return false;
        }

        const usuarioObjeto = JSON.parse(
            usuarioResposta.usuario || '{}'
        );

        const cargo = usuarioObjeto.ehFuncionario
            ? usuarioObjeto.ehFuncionario.nome_cargo
            : 'Cliente';

        if (itemMenuCadastros) {
            itemMenuCadastros.classList.toggle(
                'gerente-acesso-total',
                cargo === 'Gerente'
            );
        }

        const usuarioSelect = document.getElementById('oUsuario');

        if (usuarioSelect && usuarioSelect.options.length > 0) {
            usuarioSelect.options[0].text =
                `${usuarioObjeto.nome} - ${cargo}`;
        }

        return true;

    } catch (error) {
        console.error('Erro ao verificar login:', error);
        return false;
    }
}

// ======================================================
// CARRINHO
// ======================================================

function obterCarrinho() {
    try {
        return JSON.parse(
            sessionStorage.getItem('carrinho')
        ) || [];
    } catch (error) {
        console.error('Erro ao ler carrinho:', error);
        return [];
    }
}

function salvarCarrinho(carrinho) {
    sessionStorage.setItem(
        'carrinho',
        JSON.stringify(carrinho)
    );

    atualizarContadorCarrinho();
}

function atualizarContadorCarrinho() {
    const carrinho = obterCarrinho();

    const totalUnidades = carrinho.reduce(
        (total, item) => total + Number(item.quantidade || 0),
        0
    );

    if (contadorCarrinho) {
        contadorCarrinho.textContent = totalUnidades;
    }
}

// ======================================================
// FORMATAÇÃO DE PREÇO
// ======================================================

function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// ======================================================
// CRIAR CARD DO PRODUTO
// ======================================================

function criarCardProduto(produto) {

    const card = document.createElement('div');
    card.classList.add('produto-card');

    const id = produto.id_produto;
    const nome = produto.nome_produto || 'Produto';
    const preco = Number(produto.preco_unitario_produto);

    // Tons retornados pelo backend
    const tons = Array.isArray(produto.tons)
        ? produto.tons
        : [];

    // Imagem
    const imagem = document.createElement('img');

    imagem.src = `${API_BASE_URL}${API_IMAGEM_PREFIX}/${id}`;
    imagem.alt = nome;
    imagem.className = 'card-imagem';

    imagem.onerror = function () {
        this.onerror = null;
        this.src = 'https://placehold.co/400x400?text=Sem+Imagem';
    };

    // Nome
    const titulo = document.createElement('div');

    titulo.className = 'card-titulo';
    titulo.textContent = nome;

    // ID
    const detalheId = document.createElement('div');

    detalheId.className = 'card-detalhe';
    detalheId.textContent = `ID: ${id}`;

    // Preço
    const detalhePreco = document.createElement('div');

    detalhePreco.className = 'card-preco';
    detalhePreco.textContent =
        `${formatarPreco(preco)} / Unidade`;

    // ==================================================
    // SELEÇÃO DE TOM
    // ==================================================

    const areaTom = document.createElement('div');
    areaTom.className = 'card-selecao-tom';

    const labelTom = document.createElement('label');
    labelTom.textContent = 'Escolha o tom:';

    const selectTom = document.createElement('select');
    selectTom.className = 'select-tom';

    const opcaoInicial = document.createElement('option');

    opcaoInicial.value = '';
    opcaoInicial.textContent = 'Selecione um tom';

    selectTom.appendChild(opcaoInicial);

    tons.forEach(tom => {

        const option = document.createElement('option');

        option.value = tom.id_produto_tom;

        option.textContent =
            `${tom.nome_tom} (Estoque: ${tom.quantidade_estoque_tom})`;

        selectTom.appendChild(option);
    });

    labelTom.appendChild(selectTom);
    areaTom.appendChild(labelTom);

    // ==================================================
    // ESTOQUE DO TOM SELECIONADO
    // ==================================================

    const detalheEstoque = document.createElement('div');

    detalheEstoque.className = 'card-detalhe';
    detalheEstoque.textContent = tons.length > 0
        ? 'Selecione um tom'
        : 'Produto sem tons cadastrados';

    // ==================================================
    // QUANTIDADE
    // ==================================================

    const areaQuantidade = document.createElement('div');

    areaQuantidade.className = 'card-selecao-quantidade';

    const labelQuantidade = document.createElement('label');

    labelQuantidade.textContent = 'Quantidade:';

    const input = document.createElement('input');

    input.type = 'number';
    input.className = 'input-quantidade';
    input.value = 1;
    input.min = 1;
    input.step = 1;
    input.disabled = true;

    const btnMenos = document.createElement('button');

    btnMenos.type = 'button';
    btnMenos.textContent = '−';
    btnMenos.className = 'btn-quantidade';
    btnMenos.disabled = true;

    const btnMais = document.createElement('button');

    btnMais.type = 'button';
    btnMais.textContent = '+';
    btnMais.className = 'btn-quantidade';
    btnMais.disabled = true;

    // ==================================================
    // BOTÃO ADICIONAR
    // ==================================================

    const botaoAdicionar = document.createElement('button');

    botaoAdicionar.type = 'button';
    botaoAdicionar.className = 'btn-carrinho';

    botaoAdicionar.textContent =
        tons.length > 0
            ? 'ADICIONAR AO CARRINHO'
            : 'SEM TONS CADASTRADOS';

    botaoAdicionar.disabled = tons.length === 0;

    // Atualiza o estoque conforme o tom escolhido
    function atualizarEstoqueSelecionado() {

        const tomSelecionado = tons.find(
            tom =>
                String(tom.id_produto_tom) === selectTom.value
        );

        if (!tomSelecionado) {

            detalheEstoque.textContent = 'Selecione um tom';

            input.value = 1;
            input.max = 0;
            input.disabled = true;

            btnMenos.disabled = true;
            btnMais.disabled = true;
            botaoAdicionar.disabled = true;

            return;
        }

        const estoque = Number(
            tomSelecionado.quantidade_estoque_tom
        );

        detalheEstoque.textContent =
            `Estoque do tom ${tomSelecionado.nome_tom}: ${estoque} unidade(s)`;

        input.max = estoque;
        input.value = estoque > 0 ? 1 : 0;
        input.disabled = estoque <= 0;

        btnMenos.disabled = estoque <= 0;
        btnMais.disabled = estoque <= 0;
        botaoAdicionar.disabled = estoque <= 0;

        if (estoque <= 0) {
            botaoAdicionar.textContent = 'SEM ESTOQUE';
        } else {
            botaoAdicionar.textContent = 'ADICIONAR AO CARRINHO';
        }
    }

    selectTom.addEventListener(
        'change',
        atualizarEstoqueSelecionado
    );

    // Diminuir quantidade
    btnMenos.addEventListener('click', () => {

        const quantidade = Number(input.value);

        if (quantidade > 1) {
            input.value = quantidade - 1;
        }
    });

    // Aumentar quantidade
    btnMais.addEventListener('click', () => {

        const quantidade = Number(input.value);
        const estoque = Number(input.max);

        if (quantidade < estoque) {
            input.value = quantidade + 1;
        } else {
            alert('Quantidade máxima disponível para este tom.');
        }
    });

    // Validar quantidade digitada
    input.addEventListener('change', () => {

        const estoque = Number(input.max);

        let quantidade = Number(input.value);

        if (!Number.isInteger(quantidade) || quantidade < 1) {
            quantidade = 1;
        }

        if (quantidade > estoque) {
            quantidade = estoque;
            alert('Quantidade maior que o estoque disponível.');
        }

        input.value = quantidade;
    });

    areaQuantidade.append(
        labelQuantidade,
        btnMenos,
        input,
        btnMais
    );

    // ==================================================
    // ADICIONAR PRODUTO E TOM AO CARRINHO
    // ==================================================

    botaoAdicionar.addEventListener('click', () => {

        if (!selectTom.value) {
            alert('Selecione um tom antes de adicionar ao carrinho.');
            return;
        }

        adicionarAoCarrinho(
            id,
            selectTom.value,
            input.value
        );
    });

    // Montagem do card
    card.append(
        imagem,
        titulo,
        detalheId,
        detalhePreco,
        areaTom,
        detalheEstoque,
        areaQuantidade,
        botaoAdicionar
    );

    return card;
}

// ======================================================
// ADICIONAR AO CARRINHO
// ======================================================

async function adicionarAoCarrinho(
    produtoId,
    produtoTomId,
    quantidadeInformada
) {

    const quantidade = Number(quantidadeInformada);

    if (!Number.isInteger(quantidade) || quantidade < 1) {
        alert('Informe uma quantidade válida.');
        return;
    }

    try {

        const resposta = await fetch(
            `${API_BASE_URL}/produto/${produtoId}`
        );

        if (!resposta.ok) {
            throw new Error('Não foi possível buscar o produto.');
        }

        const produto = await resposta.json();

        console.log('PRODUTO RECEBIDO:', produto);

        // Encontrar o tom escolhido dentro do produto
        const tomSelecionado = (produto.tons || []).find(
            tom =>
                String(tom.id_produto_tom) === String(produtoTomId)
        );

        if (!tomSelecionado) {
            throw new Error(
                'O tom selecionado não está associado a este produto.'
            );
        }

        const idProdutoTom = Number(
            tomSelecionado.id_produto_tom
        );

        const estoque = Number(
            tomSelecionado.quantidade_estoque_tom
        );

        if (!Number.isInteger(idProdutoTom) || idProdutoTom <= 0) {
            throw new Error('ID do produto com tom inválido.');
        }

        const carrinho = obterCarrinho();

        // O mesmo produto em tons diferentes gera itens separados
        const existente = carrinho.find(
            item =>
                Number(item.id_produto_tom) === idProdutoTom
        );

        const quantidadeNoCarrinho = existente
            ? Number(existente.quantidade)
            : 0;

        if (quantidadeNoCarrinho + quantidade > estoque) {

            alert(
                `Estoque insuficiente para ${tomSelecionado.nome_tom}!\n\n` +
                `Disponível: ${estoque} unidade(s)\n` +
                `Já no carrinho: ${quantidadeNoCarrinho} unidade(s)`
            );

            return;
        }

        if (existente) {

            existente.quantidade =
                Number(existente.quantidade) + quantidade;

        } else {

            carrinho.push({

                id: Number(produto.id_produto),

                codigo: Number(produto.id_produto),

                id_produto_tom: idProdutoTom,

                nome: produto.nome_produto,

                nome_tom: tomSelecionado.nome_tom,

                preco: Number(produto.preco_unitario_produto),

                quantidade: quantidade,

                estoque: estoque
            });
        }

        salvarCarrinho(carrinho);

        console.log('ITEM ADICIONADO AO CARRINHO:', {
            id_produto: produto.id_produto,
            id_produto_tom: idProdutoTom,
            produto: produto.nome_produto,
            tom: tomSelecionado.nome_tom,
            quantidade: quantidade
        });

        alert(
            `${produto.nome_produto} - ${tomSelecionado.nome_tom}\n` +
            `${quantidade} unidade(s) adicionada(s) ao carrinho!`
        );

    } catch (error) {

        console.error('Erro ao adicionar produto:', error);

        alert(error.message);
    }
}

// ======================================================
// MOSTRAR PRODUTOS
// ======================================================

function renderizarProdutos(dados) {

    if (!carrosselWrapper) {
        console.error('Elemento carrossel-wrapper não encontrado.');
        return;
    }

    carrosselWrapper.innerHTML = '';

    const produtos = Array.isArray(dados)
        ? dados
        : (dados.products || []);

    if (produtos.length === 0) {

        carrosselWrapper.innerHTML =
            '<div class="mensagem-info">Nenhum produto encontrado.</div>';

        return;
    }

    produtos.forEach(produto => {

        const card = criarCardProduto(produto);

        carrosselWrapper.appendChild(card);
    });
}

// ======================================================
// BUSCAR PRODUTOS NA API
// ======================================================

async function buscarProdutos() {

    try {

        const resposta = await fetch(
            `${API_BASE_URL}/produto`
        );

        if (!resposta.ok) {
            throw new Error('Erro na resposta da API.');
        }

        const dados = await resposta.json();

        console.log('PRODUTOS E TONS RECEBIDOS:', dados);

        renderizarProdutos(dados);

    } catch (erro) {

        console.error('Erro ao carregar produtos:', erro);

        if (carrosselWrapper) {
            carrosselWrapper.innerHTML = `
                <div class="mensagem-info" style="color:red;">
                    Erro ao carregar os produtos.
                    Verifique se o servidor está ligado.
                </div>
            `;
        }
    }
}

// ======================================================
// CARROSSEL
// ======================================================

if (prevBtn && carrosselWrapper) {

    prevBtn.addEventListener('click', () => {

        carrosselWrapper.scrollBy({
            left: -300,
            behavior: 'smooth'
        });
    });
}

if (nextBtn && carrosselWrapper) {

    nextBtn.addEventListener('click', () => {

        carrosselWrapper.scrollBy({
            left: 300,
            behavior: 'smooth'
        });
    });
}

// ======================================================
// INICIALIZAÇÃO
// ======================================================

document.addEventListener('DOMContentLoaded', async () => {

    await verificarAutorizacao();

    await buscarProdutos();

    atualizarContadorCarrinho();

});
