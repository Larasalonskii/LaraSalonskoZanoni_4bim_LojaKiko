
let valorTotal = 0;

const API_BASE_URL = 'http://localhost:3001';

// ======================================================
// OBTER CARRINHO
// ======================================================

function obterCarrinho() {
    try {
        return JSON.parse(sessionStorage.getItem('carrinho')) || [];
    } catch (error) {
        console.error('Erro ao ler carrinho:', error);
        return [];
    }
}

// ======================================================
// FORMATAR PREÇO
// ======================================================

function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// ======================================================
// CARREGAR TELA DE FINALIZAÇÃO
// ======================================================

function carregarFinalizar() {

    const tbodyLista = document.getElementById('listaFinalizar');
    const carrinho = obterCarrinho();

    tbodyLista.innerHTML = '';

    let total = 0;

    const botaoFinalizar =
        document.getElementById('btn-finalizar');

    if (carrinho.length === 0) {

        tbodyLista.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:20px;">
                    Carrinho vazio. Volte e adicione itens.
                </td>
            </tr>
        `;

        botaoFinalizar.disabled = true;

        document.getElementById('total-final').textContent =
            'Total Final: R$ 0,00';

        valorTotal = 0;

        return;
    }

    botaoFinalizar.disabled = false;

    carrinho.forEach(prod => {

        const codigo = prod.id_produto_tom || prod.id || prod.codigo;

        const quantidade = Number(prod.quantidade);

        const preco = Number(prod.preco);

        if (
            !codigo ||
            !Number.isInteger(quantidade) ||
            quantidade < 1 ||
            !Number.isFinite(preco) ||
            preco < 0
        ) {
            throw new Error(
                `Produto com dados inválidos: ${prod.nome || 'Sem nome'}`
            );
        }

        // PREÇO POR UNIDADE
        const subtotal = preco * quantidade;

        total += subtotal;

        const linha = document.createElement('tr');

        const valores = [
            codigo,
            prod.nome,
            `${formatarPreco(preco)} / unidade`,
            `${quantidade} unidade(s)`,
            formatarPreco(subtotal)
        ];

        valores.forEach(valor => {
            const td = document.createElement('td');
            td.textContent = valor;
            linha.appendChild(td);
        });

        tbodyLista.appendChild(linha);
    });

    document.getElementById('total-final').textContent =
        `Valor total: ${formatarPreco(total)}`;

    valorTotal = total;
}

// ======================================================
// PREPARAR ITENS DO PEDIDO
// ======================================================

function obterCarrinhoDoStorage(idPedido) {
    const carrinho = obterCarrinho();

    return carrinho.map(item => ({
        pedido_id_pedido: Number(idPedido),
        produto_tom_id_produto_tom: Number(item.id_produto_tom),
        quantidade: Number(item.quantidade),
        preco_unitario: Number(item.preco)
    }));
}

// ======================================================
// ENVIAR PEDIDO AO BANCO
// ======================================================

async function enviarDadosParaBD() {

    const carrinho = obterCarrinho();

    if (carrinho.length === 0) {
        alert('O carrinho está vazio.');
        return;
    }

    const botaoFinalizar =
        document.getElementById('btn-finalizar');

    try {

        // Recalcular total antes de enviar
        valorTotal = carrinho.reduce((total, item) => {
            return total +
                (Number(item.preco) * Number(item.quantidade));
        }, 0);

        // Validar itens
        for (const item of carrinho) {

            const id = item.id_produto_tom;

            if (
                !id ||
                !Number.isInteger(Number(item.quantidade)) ||
                Number(item.quantidade) < 1 ||
                !Number.isFinite(Number(item.preco)) ||
                Number(item.preco) < 0
            ) {
                throw new Error(
                    `Dados inválidos no produto: ${item.nome}`
                );
            }
        }

        botaoFinalizar.disabled = true;
        botaoFinalizar.textContent = 'Finalizando...';

        console.log('CARRINHO:', carrinho);

        // ==============================================
        // DATA DO PEDIDO
        // ==============================================

        const hoje = new Date();

        const dataAtual = [
            hoje.getFullYear(),
            String(hoje.getMonth() + 1).padStart(2, '0'),
            String(hoje.getDate()).padStart(2, '0')
        ].join('-');

        // ==============================================
        // CRIAR PEDIDO
        // ==============================================

        const pedido = {

            data_pedido: dataAtual,

            cliente_pessoa_cpf_pessoa: '1',

            funcionario_pessoa_cpf_pessoa: '14',

            // Agora são unidades, não gramas.
            itens: carrinho.map(item => ({
    produto_tom_id: Number(item.id_produto_tom),
    quantidade: Number(item.quantidade)
}))
        };

        console.log(
            'PEDIDO ENVIADO:',
            JSON.stringify(pedido, null, 2)
        );

        const resposta = await fetch(
            `${API_BASE_URL}/pedido`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pedido)
            }
        );

        const dadosResposta =
            await resposta.json().catch(() => null);

        if (!resposta.ok) {

            console.error('ERRO AO CRIAR PEDIDO:', dadosResposta);

            throw new Error(
                dadosResposta?.error ||
                dadosResposta?.message ||
                `Erro ao criar pedido. Status: ${resposta.status}`
            );
        }

        const dados = dadosResposta;

        console.log('PEDIDO CRIADO:', dados);

        if (!dados || !dados.id_pedido) {
            throw new Error(
                'O servidor não retornou o ID do pedido.'
            );
        }

        

        // ==============================================
        // PREPARAR PAGAMENTO
        // ==============================================

        const dadosPagamento = {

            id_pedido: dados.id_pedido,

            valor_total: valorTotal

        };

        sessionStorage.setItem(
            'dadosPagamento',
            JSON.stringify(dadosPagamento)
        );

        // ==============================================
        // IR PARA PAGAMENTO
        // ==============================================

        window.location.href =
    `${API_BASE_URL}/pagamento/abrirCrudPagamento`; 

    } catch (erro) {

        console.error(
            'ERRO COMPLETO AO FINALIZAR:',
            erro
        );

        alert(
            `Ocorreu um erro ao finalizar o pedido.\n\nDetalhes: ${erro.message}`
        );

        botaoFinalizar.disabled = false;

        botaoFinalizar.textContent = 'Finalizar Pedido';
    }
}

// ======================================================
// EVENTOS
// ======================================================

document.addEventListener('DOMContentLoaded', () => {

    document
        .getElementById('btn-finalizar')
        .addEventListener('click', enviarDadosParaBD);

    carregarFinalizar();

});
