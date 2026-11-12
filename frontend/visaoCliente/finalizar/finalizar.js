
let valorTotal = 0;
const API_BASE_URL = 'http://localhost:3001';

function carregarFinalizar() {
    const tbodyLista = document.getElementById('listaFinalizar');
    const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || [];

    tbodyLista.innerHTML = '';

    let total = 0;

    if (carrinho.length === 0) {
        tbodyLista.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px;">
                    Carrinho vazio. Volte e adicione itens.
                </td>
            </tr>
        `;

        document.getElementById('btn-finalizar').disabled = true;
        document.getElementById('total-final').textContent =
            'Total Final: R$ 0,00';

        return;
    }

    document.getElementById('btn-finalizar').disabled = false;

    carrinho.forEach(prod => {
        const codigo = prod.codigo || prod.id || '(sem código)';

        // O preço está sendo considerado como valor por KG
        const subtotal = prod.preco * (prod.quantidade / 1000);
        total += subtotal;

        const linha = document.createElement('tr');

        linha.innerHTML = `
            <td>${codigo}</td>
            <td>${prod.nome}</td>
            <td>R$ ${Number(prod.preco).toFixed(2)}/kg</td>
            <td>${prod.quantidade} g</td>
            <td>R$ ${subtotal.toFixed(2)}</td>
        `;

        tbodyLista.appendChild(linha);
    });

    document.getElementById('total-final').textContent =
        `Valor total: R$ ${total.toFixed(2)}`;

    valorTotal = total;
}


function obterCarrinhoDoStorage(idPedido) {
    try {
        const carrinhoData =
            JSON.parse(sessionStorage.getItem('carrinho')) || [];

        return carrinhoData.map(item => ({
            id_pedido: idPedido,
            id_produto: item.id || item.codigo,
            nome_produto: item.nome,
            preco: Number(item.preco),
            quantidade: Number(item.quantidade)
        }));

    } catch (error) {
        console.error('Erro ao processar dados do carrinho:', error);
        return [];
    }
}


// ======== Envia o pedido ao backend ========

async function enviarDadosParaBD() {
    const carrinho =
        JSON.parse(sessionStorage.getItem('carrinho')) || [];

    if (carrinho.length === 0) {
        alert('O carrinho está vazio.');
        return;
    }

    const botaoFinalizar =
        document.getElementById('btn-finalizar');

    try {
        botaoFinalizar.disabled = true;
        botaoFinalizar.textContent = 'Finalizando...';

        /*
         * IMPORTANTE:
         * Substitua '1' pelo CPF real do cliente logado.
         * Se o banco não possuir um cliente com CPF 1,
         * o pedido pode dar erro.
         */
        const pedido = {
            data_pedido: new Date().toISOString(),
            cliente_pessoa_cpf_pessoa: '1',

            itens: carrinho.map(item => ({
                id_produto: item.id || item.codigo,
                peso_gramas: Number(item.quantidade),
                preco_unitario_kg: Number(item.preco)
            }))
        };

        // ======== CRIAR PEDIDO ========

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

        // Tenta ler a resposta do backend
        const dadosResposta = await resposta.json().catch(() => null);

        if (!resposta.ok) {
            console.error(
                'Erro retornado pelo servidor:',
                dadosResposta
            );

            throw new Error(
                dadosResposta?.error ||
                dadosResposta?.message ||
                `Erro ao criar pedido. Status: ${resposta.status}`
            );
        }

        const dados = dadosResposta;

        console.log('Pedido criado com sucesso:', dados);

        if (!dados || !dados.id_pedido) {
            throw new Error(
                'O servidor criou o pedido, mas não retornou o ID do pedido.'
            );
        }


        // ======== PREPARAR ITENS ========

        const dadosItensDoPedido =
            obterCarrinhoDoStorage(dados.id_pedido);

        if (dadosItensDoPedido.length === 0) {
            throw new Error(
                'Não foi possível recuperar os itens do carrinho.'
            );
        }

        console.log(
            'Itens que serão enviados:',
            dadosItensDoPedido
        );


        // ======== SALVAR ITENS DO PEDIDO ========

        const respostaItens = await fetch(
            `${API_BASE_URL}/pedido_has_produto/lote`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosItensDoPedido)
            }
        );

        const dadosItensResposta =
            await respostaItens.json().catch(() => null);

        if (!respostaItens.ok) {
            console.error(
                'Erro ao inserir itens:',
                dadosItensResposta
            );

            throw new Error(
                dadosItensResposta?.error ||
                dadosItensResposta?.message ||
                `Erro ao salvar itens. Status: ${respostaItens.status}`
            );
        }

        console.log(
            'Itens inseridos com sucesso:',
            dadosItensResposta
        );


        // ======== DADOS PARA O PAGAMENTO ========

        const dadosPagamento = {
            id_pedido: dados.id_pedido,
            valor_total: valorTotal
        };

        sessionStorage.setItem(
            'dadosPagamento',
            JSON.stringify(dadosPagamento)
        );


        // ======== IR PARA PAGAMENTO ========

        window.location.href =
            `${API_BASE_URL}/pagamento/abrirTelaPagamento`;

    } catch (erro) {
        console.error(
            '❌ Erro completo ao finalizar pedido:',
            erro
        );

        alert(
            `Ocorreu um erro ao finalizar o pedido.\n\nDetalhes: ${erro.message}`
        );

        botaoFinalizar.disabled = false;
        botaoFinalizar.textContent = 'Finalizar Pedido';
    }
}


// ======== EVENTO DO BOTÃO ========

document
    .getElementById('btn-finalizar')
    .addEventListener('click', enviarDadosParaBD);


// ======== AO CARREGAR A PÁGINA ========

carregarFinalizar();
