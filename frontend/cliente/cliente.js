// URL base do backend (o frontend também pode ser aberto por Live Server, em outra porta)
const API_BASE_URL = 'http://localhost:3001';
const API_CLIENTE = `${API_BASE_URL}/cliente`;

const $ = (id) => document.getElementById(id);

const campoBusca = $('searchId');
const campoCpf = $('pessoa_cpf_pessoa');
const campoNome = $('nome_pessoa');
const campoData = $('data_cadastro_cliente');

const btnBuscar = $('btnBuscar');
const btnIncluir = $('btnIncluir');
const btnAlterar = $('btnAlterar');
const btnExcluir = $('btnExcluir');
const btnSalvar = $('btnSalvar');
const btnCancelar = $('btnCancelar');

const tabelaCorpo = $('clientesTableBody');
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

function dataDeHoje() {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
}

// Converte AAAA-MM-DD em DD/MM/AAAA sem passar por Date (evita erro de fuso)
function formatarData(iso) {
    if (!iso) return '—';
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
}

function limparFormulario() {
    campoCpf.value = '';
    campoNome.value = '';
    campoData.value = '';
}

function preencherFormulario(cliente) {
    campoCpf.value = cliente.pessoa_cpf_pessoa;
    campoNome.value = cliente.nome_pessoa || '';
    campoData.value = cliente.data_cadastro_cliente || '';
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
    campoData.disabled = !editando;

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
async function carregarClientes() {
    try {
        const clientes = await requisicao(API_CLIENTE);
        tabelaCorpo.replaceChildren();

        if (clientes.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 3;
            td.textContent = 'Nenhum cliente cadastrado';
            tr.appendChild(td);
            tabelaCorpo.appendChild(tr);
            return;
        }

        clientes.forEach((cliente) => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';

            [cliente.pessoa_cpf_pessoa, cliente.nome_pessoa, formatarData(cliente.data_cadastro_cliente)]
                .forEach((valor) => {
                    const td = document.createElement('td');
                    td.textContent = valor ?? '';
                    tr.appendChild(td);
                });

            tr.addEventListener('click', () => buscarCliente(cliente.pessoa_cpf_pessoa));
            tabelaCorpo.appendChild(tr);
        });
    } catch (erro) {
        mostrarMensagem(erro.message, 'error');
    }
}

async function buscarCliente(cpfInformado) {
    const cpf = String(cpfInformado ?? campoBusca.value).trim();

    if (!cpf) {
        mostrarMensagem('Informe o CPF para buscar', 'error');
        return;
    }

    try {
        const cliente = await requisicao(`${API_CLIENTE}/${encodeURIComponent(cpf)}`);
        preencherFormulario(cliente);
        campoBusca.value = cliente.pessoa_cpf_pessoa;
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
    campoData.value = dataDeHoje(); // sugestão: hoje (pode ser apagada)
    definirModo('incluindo');
    campoCpf.focus();
}

function iniciarAlteracao() {
    definirModo('alterando');
    campoData.focus();
}

async function salvar() {
    const cpf = campoCpf.value.trim();

    if (!cpf) {
        mostrarMensagem('O CPF do cliente é obrigatório', 'error');
        campoCpf.focus();
        return;
    }

    const corpo = { data_cadastro_cliente: campoData.value || null };

    try {
        if (modo === 'incluindo') {
            await requisicao(API_CLIENTE, {
                method: 'POST',
                body: JSON.stringify({ pessoa_cpf_pessoa: cpf, ...corpo })
            });
            mostrarMensagem('Cliente incluído com sucesso!');
        } else if (modo === 'alterando') {
            await requisicao(`${API_CLIENTE}/${encodeURIComponent(cpf)}`, {
                method: 'PUT',
                body: JSON.stringify(corpo)
            });
            mostrarMensagem('Cliente alterado com sucesso!');
        } else {
            return;
        }

        cancelar();
        carregarClientes();
    } catch (erro) {
        mostrarMensagem(erro.message, 'error');
    }
}

async function excluir() {
    const cpf = campoCpf.value.trim();
    if (!cpf) return;

    const confirmou = confirm(
        `Excluir o cliente "${campoNome.value}" (CPF ${cpf})?\nA pessoa continua cadastrada; só o registro de cliente é removido.`
    );
    if (!confirmou) return;

    try {
        await requisicao(`${API_CLIENTE}/${encodeURIComponent(cpf)}`, { method: 'DELETE' });
        mostrarMensagem('Cliente excluído com sucesso!');
        cancelar();
        carregarClientes();
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
btnBuscar.addEventListener('click', () => buscarCliente());
btnIncluir.addEventListener('click', iniciarInclusao);
btnAlterar.addEventListener('click', iniciarAlteracao);
btnExcluir.addEventListener('click', excluir);
btnSalvar.addEventListener('click', salvar);
btnCancelar.addEventListener('click', cancelar);

campoBusca.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
        evento.preventDefault();
        buscarCliente();
    }
});

// Início
definirModo('inicial');
carregarClientes();