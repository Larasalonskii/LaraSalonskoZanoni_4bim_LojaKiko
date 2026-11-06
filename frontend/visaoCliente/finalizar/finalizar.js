let valorTotal = 0;
const API_BASE_URL = 'http://localhost:3001';

function carregarFinalizar() {
    // MUDANÇA: Agora busca a tag <tbody> pelo ID 'listaFinalizar'
    const tbodyLista = document.getElementById('listaFinalizar');
    const totalFinal = document.getElementById('total-final');
    const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || [];

    // Limpa apenas o corpo da tabela (mantendo o cabeçalho <thead>)
    tbodyLista.innerHTML = '';
    let total = 0;

    if (carrinho.length === 0) {
        // Se o carrinho estiver vazio, insere a linha de aviso no <tbody>
        tbodyLista.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Carrinho vazio. Volte e adicione itens.</td></tr>`;
        document.getElementById('btn-finalizar').disabled = true;
        document.getElementById('total-final').textContent = 'Total Final: R$ 0,00';
        return;
    }

    document.getElementById('btn-finalizar').disabled = false;

    carrinho.forEach(prod => {
        const codigo = prod.codigo || prod.id || '(sem código)';
        // O cálculo original (preço * (quantidade / 1000)) implica que o preço é por KG.
        const subtotal = prod.preco * (prod.quantidade / 1000);
        total += subtotal;

        const linha = document.createElement('tr');
        linha.innerHTML = `
        <td>${codigo}</td>
        <td>${prod.nome}</td>
        <td>R$ ${prod.preco.toFixed(2)}/kg</td> <td>${prod.quantidade} g</td>
        <td>R$ ${subtotal.toFixed(2)}</td>
    `;
        // Adiciona a linha ao corpo da tabela (tbody)
        tbodyLista.appendChild(linha);
    });

    document.getElementById('total-final').textContent = `Valor total: R$ ${total.toFixed(2)}`;
    valorTotal = total;
    
    
    
}

// ... o restante do seu código JavaScript ...

function obterCarrinhoDoStorage(idPedido, dadosStorage) {
    try {
        let carrinhoData;

        // Se for passado o objeto Storage completo, extrai o valor da chave 'carrinho'
        if (typeof dadosStorage === 'object' && dadosStorage.getItem('carrinho')) { // Ajustado para chamar getItem() no objeto Storage
            carrinhoData = JSON.parse(dadosStorage.getItem('carrinho'));
        }
        // Se for passado diretamente a string do carrinho (caso não se aplique aqui diretamente, mas mantido)
        else if (typeof dadosStorage === 'string') {
            carrinhoData = JSON.parse(dadosStorage);
        }
        else {
            console.warn('Dados do carrinho não encontrados ou formato inválido');
            return [];
        }


        // Adiciona o id_pedido em cada item do carrinho
        const carrinhoComPedido = []; // Cria um novo array vazio

        for (const item of carrinhoData) {
            // Cria o novo objeto com a estrutura desejada
            const itemFormatado = {
                id_pedido: idPedido,
                id_produto: item.id,
                nome_produto: item.nome,
                preco: item.preco,
                // Converte a quantidade de gramas para quilogramas (dividindo por 1000)
                quantidade: item.quantidade
            };

            // Adiciona o novo objeto ao array carrinhoComPedido
            carrinhoComPedido.push(itemFormatado);
        }

        return carrinhoComPedido;

    } catch (error) {
        console.error('Erro ao processar dados do carrinho:', error);
        return [];
    }
}

// ======== Envia o pedido ao backend ========
async function enviarDadosParaBD() {
    const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || [];

    if (carrinho.length === 0) {
        alert("O carrinho está vazio.");
        return;
    }

    // Monta o pedido
    const pedido = {
        data_pedido: new Date().toISOString(),
        cliente_pessoa_cpf_pessoa: '1', // substitua pelo CPF real do cliente logado
        itens: carrinho.map(item => ({
            id_produto: item.id || item.codigo,
            peso_gramas: item.quantidade,
            preco_unitario_kg: item.preco
        }))
    };

    try {
        const resposta = await fetch('http://localhost:3001/pedido/online', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedido)
        });

        if (!resposta.ok) throw new Error('Falha ao criar pedido na API.');

        const dados = await resposta.json();

        console.log('✅ Pedido enviado:', pedido);
        // MUDANÇA: Conteúdo do sessionStorage antes de limpar
        console.log('Conteúdo do sessionStorage antes de limpar:', sessionStorage);

        // MUDANÇA: Passando sessionStorage
        let dadosItensDoPedido = obterCarrinhoDoStorage(dados.id_pedido, sessionStorage);
        console.log('Conteúdo do carrinho obtido do sessionStorage:', dadosItensDoPedido);


        const rotaLote = 'http://localhost:3001/pedido_has_produto/lote'; // A rota que enviatrá os itens do pedido para tabela pedido_has_produto

        fetch(rotaLote, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dadosItensDoPedido),
        })
            .then(response => {
                if (!response.ok) {
                    // Lida com erros HTTP (400, 409, 500, etc.)
                    return response.json().then(errorData => {
                        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log('Itens inseridos com sucesso:', data);
            })
            .catch(error => {
                console.error('Falha na inserção em lote:', error.message);
            });




        //adicionar no alert os itens do pedido
        let aux = "";
        dadosItensDoPedido.forEach(item => {
            aux += `\n- ${dados.id_pedido} -  Produto: ${item.nome_produto}, Quantidade: ${item.quantidade} g, Preço: R$ ${item.preco.toFixed(2)}`;
        });

        alert(`Pedido ${dados.id_pedido} \n\n` + aux);

        //json para pagamento
        const dadosPagamento = {
            id_pedido: dados.id_pedido,
            valor_total: valorTotal          
        };

        sessionStorage.setItem('dadosPagamento', JSON.stringify(dadosPagamento));

        
        // sessionStorage.removeItem('carrinho');
        window.location.href = 'http://localhost:3001/pagamento/abrirTelaPagamento';

    } catch (erro) {
        console.error('❌ Erro ao enviar pedido:', erro);
        alert('Ocorreu um erro ao finalizar o pedido. Tente novamente.');
    }
}

// ======== Evento do botão ========
document.getElementById('btn-finalizar').addEventListener('click', enviarDadosParaBD);

// ======== Ao carregar página ========
carregarFinalizar();