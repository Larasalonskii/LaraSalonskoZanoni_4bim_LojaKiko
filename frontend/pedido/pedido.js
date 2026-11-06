// URL base do backend (o frontend também pode ser aberto por Live Server, em outra porta)
const API_BASE_URL = 'http://localhost:3001';
const API_PEDIDO = `${API_BASE_URL}/pedido`;

const $ = (id) => document.getElementById(id);

const campoBusca = $('searchId');
const campoId = $('id_pedido');
const campoData = $('data_pedido');
const campoCliente = $('cliente_pessoa_cpf_pessoa');
const campoFuncionario = $('funcionario_pessoa_cpf_pessoa');
const spanTotal = $('totalPedido');
const spanPago = $('infoPago');

const btnBuscar = $('btnBuscar');
const btnIncluir = $('btnIncluir');
const btnAlterar = $('btnAlterar');
const btnExcluir = $('btnExcluir');
const btnSalvar = $('btnSalvar');
const btnCancelar = $('btnCancelar');
const btnAdicionarItem = $('btnAdicionarItem');

const itensCorpo = $('itensTableBody');
const tabelaCorpo = $('pedidosTableBody');
const containerMensagem = $('messageContainer');

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Opções dos selects (carregadas de GET /pedido/opcoes)
let produtosTom = [];

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

// Converte AAAA-MM-DD em DD/MM/AAAA sem passar por Date (evita erro de fuso)
function formatarData(iso) {
    if (!iso) return '—';
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
}

function dataDeHoje() {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
}

function exibir(elemento, visivel) {
    elemento.style.display = visivel ? '' : 'none';
}

function preencherSelect(select, textoInicial, opcoes) {
    select.replaceChildren();

    const inicial = document.createElement('option');
    inicial.value = '';
    inicial.textContent = textoInicial;
    select.appendChild(inicial);

    opcoes.forEach(({ valor, texto }) => {
        const opcao = document.createElement('option');
        opcao.value = valor;
        opcao.textContent = texto;
        select.appendChild(opcao);
    });
}

// ---------------------------------------------------------------
// Linhas de itens (parte N:N do formulário)
// ---------------------------------------------------------------
function precoAtualDoProdutoTom(id) {
    const produto = produtosTom.find((p) => String(p.id_produto_tom) === String(id));
    return produto ? produto.preco_unitario_produto : null;
}

function rotuloProdutoTom(p) {
    return `${p.nome_produto} - ${p.nome_tom} (${formatarMoeda(p.preco_unitario_produto)})`;
}

function criarLinhaItem(item = {}) {
    const tr = document.createElement('tr');

    // Guarda o item original da linha: se o produto não mudar, o preço gravado é mantido
    tr.dataset.originalId = item.produto_tom_id ?? '';
    tr.dataset.originalPreco = item.preco_unitario ?? '';
    tr.dataset.preco = item.preco_unitario ?? '';

    // Coluna: produto / tom
    const tdProduto = document.createElement('td');
    const select = document.createElement('select');
    select.className = 'item-produto';

    const inicial = document.createElement('option');
    inicial.value = '';
    inicial.textContent = 'Selecione';
    select.appendChild(inicial);

    produtosTom.forEach((p) => {
        const opcao = document.createElement('option');
        opcao.value = p.id_produto_tom;
        opcao.textContent = rotuloProdutoTom(p);
        select.appendChild(opcao);
    });

    // Item de pedido antigo cujo produto/tom não está mais na lista: mantém visível
    if (item.produto_tom_id && !produtosTom.some((p) => p.id_produto_tom === item.produto_tom_id)) {
        const opcao = document.createElement('option');
        opcao.value = item.produto_tom_id;
        opcao.textContent = `${item.nome_produto} - ${item.nome_tom}`;
        select.appendChild(opcao);
    }

    select.value = item.produto_tom_id ?? '';
    tdProduto.appendChild(select);

    // Coluna: quantidade
    const tdQtd = document.createElement('td');
    const inputQtd = document.createElement('input');
    inputQtd.type = 'number';
    inputQtd.className = 'item-quantidade';
    inputQtd.min = '1';
    inputQtd.step = '1';
    inputQtd.value = item.quantidade ?? 1;
    tdQtd.appendChild(inputQtd);

    // Colunas: preço unitário e subtotal (somente exibição)
    const tdPreco = document.createElement('td');
    tdPreco.className = 'item-preco';
    const tdSubtotal = document.createElement('td');
    tdSubtotal.className = 'item-subtotal';

    // Coluna: remover linha
    const tdRemover = document.createElement('td');
    const btnRemover = document.createElement('button');
    btnRemover.type = 'button';
    btnRemover.textContent = '✖';
    btnRemover.title = 'Remover item';
    btnRemover.addEventListener('click', () => {
        tr.remove();
        atualizarTotal();
    });
    tdRemover.appendChild(btnRemover);

    select.addEventListener('change', () => {
        if (select.value !== '' && select.value === tr.dataset.originalId) {
            // Voltou ao produto original: preço gravado no pedido
            tr.dataset.preco = tr.dataset.originalPreco;
        } else {
            // Produto novo: o servidor usará o preço atual do produto
            const atual = precoAtualDoProdutoTom(select.value);
            tr.dataset.preco = atual ?? '';
        }
        atualizarTotal();
    });
    inputQtd.addEventListener('input', atualizarTotal);

    tr.append(tdProduto, tdQtd, tdPreco, tdSubtotal, tdRemover);
    return tr;
}

function adicionarLinhaItem(item = {}) {
    const tr = criarLinhaItem(item);

    // Linha nova sem preço gravado: mostra o preço atual quando o produto for escolhido
    itensCorpo.appendChild(tr);
    aplicarEstadoLinhas();
    atualizarTotal();
}

function lerItensDoFormulario() {
    return Array.from(itensCorpo.querySelectorAll('tr')).map((tr) => ({
        produto_tom_id: tr.querySelector('.item-produto').value,
        quantidade: tr.querySelector('.item-quantidade').value
    }));
}

// Recalcula preço e subtotal de cada linha e o total do pedido
function atualizarTotal() {
    let total = 0;

    itensCorpo.querySelectorAll('tr').forEach((tr) => {
        const preco = tr.dataset.preco === '' ? null : Number(tr.dataset.preco);
        const quantidade = Number(tr.querySelector('.item-quantidade').value);
        const subtotal = preco !== null && Number.isFinite(quantidade) ? preco * quantidade : null;

        tr.querySelector('.item-preco').textContent = formatarMoeda(preco);
        tr.querySelector('.item-subtotal').textContent = formatarMoeda(subtotal);

        if (subtotal !== null) total += subtotal;
    });

    spanTotal.textContent = formatarMoeda(total);
}

// Habilita/desabilita os campos das linhas conforme o modo atual
function aplicarEstadoLinhas() {
    const editando = modo === 'incluindo' || modo === 'alterando';
    itensCorpo.querySelectorAll('select, input, button').forEach((el) => {
        el.disabled = !editando;
    });
}

// ---------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------
function limparFormulario() {
    campoId.value = '';
    campoData.value = '';
    campoCliente.value = '';
    campoFuncionario.value = '';
    itensCorpo.replaceChildren();
    spanPago.textContent = '';
    atualizarTotal();
}

function preencherFormulario(pedido) {
    campoId.value = pedido.id_pedido;
    campoData.value = pedido.data_pedido || '';
    campoCliente.value = pedido.cliente_pessoa_cpf_pessoa ?? '';
    campoFuncionario.value = pedido.funcionario_pessoa_cpf_pessoa ?? '';

    itensCorpo.replaceChildren();
    (pedido.itens || []).forEach((item) => itensCorpo.appendChild(criarLinhaItem(item)));
    aplicarEstadoLinhas();
    atualizarTotal();

    spanPago.textContent = ` | Pago: ${formatarMoeda(pedido.valor_pago)}`;
}

// ---------------------------------------------------------------
// Estado da tela
// ---------------------------------------------------------------
function definirModo(novoModo) {
    modo = novoModo;

    const editando = modo === 'incluindo' || modo === 'alterando';

    // O ID é sempre somente leitura (gerado pela sequence do banco)
    campoId.disabled = true;
    campoData.disabled = !editando;
    campoCliente.disabled = !editando;
    campoFuncionario.disabled = !editando;

    campoBusca.disabled = editando;
    btnBuscar.disabled = editando;

    exibir(btnIncluir, modo === 'inicial');
    exibir(btnAlterar, modo === 'consultado');
    exibir(btnExcluir, modo === 'consultado');
    exibir(btnSalvar, editando);
    exibir(btnAdicionarItem, editando);
    exibir(btnCancelar, true);

    aplicarEstadoLinhas();
}

// ---------------------------------------------------------------
// Ações
// ---------------------------------------------------------------
async function carregarOpcoes() {
    try {
        const opcoes = await requisicao(`${API_PEDIDO}/opcoes`);

        produtosTom = opcoes.produtos_tom;

        preencherSelect(
            campoCliente,
            'Selecione um cliente',
            opcoes.clientes.map((c) => ({
                valor: c.pessoa_cpf_pessoa,
                texto: `${c.nome_pessoa} (${c.pessoa_cpf_pessoa})`
            }))
        );

        preencherSelect(
            campoFuncionario,
            'Selecione um funcionário',
            opcoes.funcionarios.map((f) => ({
                valor: f.pessoa_cpf_pessoa,
                texto: `${f.nome_pessoa} (${f.pessoa_cpf_pessoa})`
            }))
        );
    } catch (erro) {
        mostrarMensagem(`Não foi possível carregar as opções do pedido: ${erro.message}`, 'error');
    }
}

async function carregarPedidos() {
    try {
        const pedidos = await requisicao(API_PEDIDO);
        tabelaCorpo.replaceChildren();

        if (pedidos.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 7;
            td.textContent = 'Nenhum pedido cadastrado';
            tr.appendChild(td);
            tabelaCorpo.appendChild(tr);
            return;
        }

        pedidos.forEach((pedido) => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';

            [
                pedido.id_pedido,
                formatarData(pedido.data_pedido),
                pedido.nome_cliente,
                pedido.nome_funcionario,
                (pedido.itens || []).length,
                formatarMoeda(pedido.valor_total),
                formatarMoeda(pedido.valor_pago)
            ].forEach((valor) => {
                const td = document.createElement('td');
                td.textContent = valor ?? '—';
                tr.appendChild(td);
            });

            tr.addEventListener('click', () => buscarPedido(pedido.id_pedido));
            tabelaCorpo.appendChild(tr);
        });
    } catch (erro) {
        mostrarMensagem(erro.message, 'error');
    }
}

async function buscarPedido(idInformado) {
    const id = parseInt(idInformado ?? campoBusca.value, 10);

    if (isNaN(id)) {
        mostrarMensagem('Informe um ID válido para buscar', 'error');
        return;
    }

    try {
        const pedido = await requisicao(`${API_PEDIDO}/${id}`);
        definirModo('consultado');
        preencherFormulario(pedido);
        campoBusca.value = pedido.id_pedido;
    } catch (erro) {
        limparFormulario();
        definirModo('inicial');
        mostrarMensagem(erro.message, 'error');
    }
}

function iniciarInclusao() {
    limparFormulario();
    campoBusca.value = '';
    campoData.value = dataDeHoje(); // sugestão: hoje (pode ser alterada)
    definirModo('incluindo');
    adicionarLinhaItem(); // começa com uma linha vazia
    campoCliente.focus();
}

function iniciarAlteracao() {
    definirModo('alterando');
    campoData.focus();
}

async function salvar() {
    if (campoCliente.value === '') {
        mostrarMensagem('Selecione o cliente', 'error');
        campoCliente.focus();
        return;
    }

    if (campoFuncionario.value === '') {
        mostrarMensagem('Selecione o funcionário', 'error');
        campoFuncionario.focus();
        return;
    }

    const itens = lerItensDoFormulario();

    if (itens.length === 0) {
        mostrarMensagem('Adicione ao menos um item ao pedido', 'error');
        return;
    }

    const usados = new Set();
    for (const item of itens) {
        if (item.produto_tom_id === '') {
            mostrarMensagem('Selecione o produto em todas as linhas', 'error');
            return;
        }
        if (!Number.isInteger(Number(item.quantidade)) || Number(item.quantidade) <= 0) {
            mostrarMensagem('A quantidade deve ser um número inteiro maior que zero', 'error');
            return;
        }
        if (usados.has(item.produto_tom_id)) {
            mostrarMensagem('O mesmo produto/tom não pode se repetir no pedido', 'error');
            return;
        }
        usados.add(item.produto_tom_id);
    }

    // O preço unitário NÃO é enviado: o servidor usa o preço do produto
    const corpo = {
        data_pedido: campoData.value || null,
        cliente_pessoa_cpf_pessoa: campoCliente.value,
        funcionario_pessoa_cpf_pessoa: campoFuncionario.value,
        itens: itens.map((i) => ({
            produto_tom_id: Number(i.produto_tom_id),
            quantidade: Number(i.quantidade)
        }))
    };

    try {
        if (modo === 'incluindo') {
            await requisicao(API_PEDIDO, { method: 'POST', body: JSON.stringify(corpo) });
            mostrarMensagem('Pedido incluído com sucesso!');
        } else if (modo === 'alterando') {
            await requisicao(`${API_PEDIDO}/${campoId.value}`, {
                method: 'PUT',
                body: JSON.stringify(corpo)
            });
            mostrarMensagem('Pedido alterado com sucesso!');
        } else {
            return;
        }

        cancelar();
        carregarPedidos();
    } catch (erro) {
        mostrarMensagem(erro.message, 'error');
    }
}

async function excluir() {
    const id = campoId.value;
    if (!id) return;

    if (!confirm(`Excluir o pedido ${id} (${spanTotal.textContent}) e seus itens?`)) return;

    try {
        await requisicao(`${API_PEDIDO}/${id}`, { method: 'DELETE' });
        mostrarMensagem('Pedido excluído com sucesso!');
        cancelar();
        carregarPedidos();
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
btnBuscar.addEventListener('click', () => buscarPedido());
btnIncluir.addEventListener('click', iniciarInclusao);
btnAlterar.addEventListener('click', iniciarAlteracao);
btnExcluir.addEventListener('click', excluir);
btnSalvar.addEventListener('click', salvar);
btnCancelar.addEventListener('click', cancelar);
btnAdicionarItem.addEventListener('click', () => adicionarLinhaItem());

campoBusca.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
        evento.preventDefault();
        buscarPedido();
    }
});

// Início
(async () => {
    definirModo('inicial');
    await carregarOpcoes();
    carregarPedidos();
})();