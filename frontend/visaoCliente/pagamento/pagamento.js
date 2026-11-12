
const API_BASE_URL = 'http://localhost:3001';

document.addEventListener('DOMContentLoaded', async function () {

    // ==========================================
    // RECUPERAR DADOS DO PEDIDO
    // ==========================================

    let objetoDadosPedido;

    try {
        const dadosDoPedido = sessionStorage.getItem('dadosPagamento');

        if (!dadosDoPedido) {
            throw new Error('Dados do pedido não encontrados.');
        }

        objetoDadosPedido = JSON.parse(dadosDoPedido);

    } catch (erro) {
        alert('Não foi possível recuperar os dados do pedido.');
        console.error(erro);
        return;
    }

    const valorTotal = Number(objetoDadosPedido.valor_total);
    const idPedido = Number(objetoDadosPedido.id_pedido);

    if (
        !Number.isInteger(idPedido) ||
        idPedido <= 0 ||
        !Number.isFinite(valorTotal) ||
        valorTotal <= 0
    ) {
        alert('Os dados do pedido são inválidos.');
        return;
    }

    // Trabalhar com centavos evita erros de arredondamento
    const totalCentavos = Math.round(valorTotal * 100);

    let valorRestante = totalCentavos;
    let formasPagamento = [];
    let formasDisponiveis = [];

    // ==========================================
    // ELEMENTOS HTML
    // ==========================================

    const elementoValorTotal = document.getElementById('valor-total');
    const elementoValorRestante = document.getElementById('valor-restante');
    const selectFormaPagamento = document.getElementById('forma-pagamento');
    const btnAdicionar = document.getElementById('btn-adicionar');
    const containerFormas = document.getElementById('formas-adicionadas');
    const formPagamento = document.getElementById('form-pagamento');
    const btnFinalizar = document.getElementById('btn-finalizar');

    if (
        !elementoValorTotal ||
        !elementoValorRestante ||
        !selectFormaPagamento ||
        !btnAdicionar ||
        !containerFormas ||
        !formPagamento ||
        !btnFinalizar
    ) {
        console.error('Um ou mais elementos da tela de pagamento não foram encontrados.');
        return;
    }

    // ==========================================
    // UTILITÁRIOS
    // ==========================================

    function formatarPreco(centavos) {
        return (centavos / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }

    function obterTipoForma(nome) {
        const nomeNormalizado = String(nome)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        if (nomeNormalizado.includes('pix')) {
            return 'pix';
        }

        if (
            nomeNormalizado.includes('cartao') ||
            nomeNormalizado.includes('credito') ||
            nomeNormalizado.includes('debito')
        ) {
            return 'cartao';
        }

        if (nomeNormalizado.includes('boleto')) {
            return 'boleto';
        }

        return 'outro';
    }

    function atualizarValores() {
        elementoValorTotal.textContent = formatarPreco(totalCentavos);
        elementoValorRestante.textContent = formatarPreco(valorRestante);

        elementoValorRestante.style.color =
            valorRestante === 0 ? '#1a5d3c' : '#d9534f';

        // Só habilita quando todo o valor estiver distribuído
        btnFinalizar.disabled = valorRestante !== 0;
    }

    // ==========================================
    // CARREGAR FORMAS DE PAGAMENTO
    // ==========================================

    async function carregarFormasPagamento() {
        try {
            const resposta = await fetch(
                `${API_BASE_URL}/forma_pagamento`
            );

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.error || 'Erro ao carregar formas de pagamento.'
                );
            }

            formasDisponiveis = dados;

            selectFormaPagamento.innerHTML =
                '<option value="">Selecione uma forma de pagamento</option>';

            formasDisponiveis.forEach(forma => {
                const option = document.createElement('option');

                option.value = forma.id_forma_pagamento;
                option.textContent = forma.nome_forma_pagamento;

                selectFormaPagamento.appendChild(option);
            });

            console.log('Formas de pagamento carregadas:', formasDisponiveis);

        } catch (erro) {
            console.error('Erro ao carregar formas de pagamento:', erro);
            alert('Não foi possível carregar as formas de pagamento.');
        }
    }

    // ==========================================
    // ADICIONAR FORMA DE PAGAMENTO
    // ==========================================

    btnAdicionar.addEventListener('click', function () {

        const formaId = Number(selectFormaPagamento.value);

        if (!formaId) {
            alert('Por favor, selecione uma forma de pagamento.');
            return;
        }

        if (valorRestante <= 0) {
            alert('O valor total já foi distribuído.');
            return;
        }

        // Impede repetir a mesma forma
        if (formasPagamento.some(f => f.forma_pagamento_id === formaId)) {
            alert('Essa forma de pagamento já foi adicionada.');
            return;
        }

        const formaEncontrada = formasDisponiveis.find(
            f => Number(f.id_forma_pagamento) === formaId
        );

        if (!formaEncontrada) {
            alert('Forma de pagamento inválida.');
            return;
        }

        adicionarFormaPagamento(formaEncontrada);

        selectFormaPagamento.value = '';
    });

    function adicionarFormaPagamento(formaBanco) {

        const id = Date.now();

        const tipo = obterTipoForma(formaBanco.nome_forma_pagamento);

        const valorInicial = valorRestante;

        const forma = {
            id: id,
            forma_pagamento_id: Number(formaBanco.id_forma_pagamento),
            nome: formaBanco.nome_forma_pagamento,
            tipo: tipo,
            valor_centavos: valorInicial
        };

        formasPagamento.push(forma);

        const formaElement = document.createElement('div');

        formaElement.className = 'forma-pagamento-item';
        formaElement.id = `forma-${id}`;

        formaElement.innerHTML = `
            <div class="cabecalho-forma">
                <span class="tipo-pagamento">
                    ${forma.nome}
                </span>

                <button type="button" class="btn-remover">
                    Remover
                </button>
            </div>

            <div class="campo-valor">
                <label for="valor-${id}">Valor (R$):</label>

                <input
                    type="number"
                    id="valor-${id}"
                    min="0.01"
                    step="0.01"
                    value="${(valorInicial / 100).toFixed(2)}"
                >

                <div class="erro" id="erro-${id}" style="display:none;">
                    Valor inválido
                </div>
            </div>

            <div class="detalhes-pagamento" id="detalhes-${id}">
                ${gerarDetalhesFormaPagamento(tipo, id)}
            </div>
        `;

        containerFormas.appendChild(formaElement);

        const inputValor = document.getElementById(`valor-${id}`);

        inputValor.addEventListener('input', function () {
            atualizarValorForma(id, this.value);
        });

        formaElement
            .querySelector('.btn-remover')
            .addEventListener('click', function () {
                removerFormaPagamento(id);
            });

        // CORREÇÃO: recalcula o restante depois de adicionar a forma
        recalcularRestante();
    }

    // ==========================================
    // ATUALIZAR VALOR DE UMA FORMA
    // ==========================================

    function atualizarValorForma(id, valorInformado) {

        const forma = formasPagamento.find(f => f.id === id);

        if (!forma) return;

        const input = document.getElementById(`valor-${id}`);
        const erro = document.getElementById(`erro-${id}`);

        const valor = Number(valorInformado);

        if (
            valorInformado.trim() === '' ||
            !Number.isFinite(valor) ||
            valor < 0.01
        ) {
            forma.valor_centavos = 0;

            erro.style.display = 'block';
            input.style.borderColor = '#d9534f';

            recalcularRestante();
            return;
        }

        const outrosValores = formasPagamento
            .filter(f => f.id !== id)
            .reduce((soma, f) => soma + f.valor_centavos, 0);

        const maximo = totalCentavos - outrosValores;

        let novoValor = Math.round(valor * 100);

        if (novoValor > maximo) {
            novoValor = maximo;
            input.value = (novoValor / 100).toFixed(2);
        }

        forma.valor_centavos = novoValor;

        erro.style.display = 'none';
        input.style.borderColor = '#ddd';

        recalcularRestante();
    }

    // ==========================================
    // RECALCULAR VALOR RESTANTE
    // ==========================================

    function recalcularRestante() {

        const totalDistribuido = formasPagamento.reduce(
            (soma, f) => soma + f.valor_centavos,
            0
        );

        valorRestante = totalCentavos - totalDistribuido;

        atualizarValores();
    }

    // ==========================================
    // REMOVER FORMA DE PAGAMENTO
    // ==========================================

    function removerFormaPagamento(id) {

        formasPagamento = formasPagamento.filter(f => f.id !== id);

        const elemento = document.getElementById(`forma-${id}`);

        if (elemento) {
            elemento.remove();
        }

        recalcularRestante();
    }

    // ==========================================
    // DETALHES DA FORMA DE PAGAMENTO
    // ==========================================

    function gerarDetalhesFormaPagamento(tipo, id) {

        switch (tipo) {

            case 'cartao':
                return `
                    <div class="campo">
                        <label for="numero-cartao-${id}">
                            Número do Cartão
                        </label>

                        <input
                            type="text"
                            id="numero-cartao-${id}"
                            placeholder="1234 5678 9012 3456"
                            maxlength="19"
                        >
                    </div>

                    <div class="campo">
                        <label for="nome-cartao-${id}">
                            Nome no Cartão
                        </label>

                        <input
                            type="text"
                            id="nome-cartao-${id}"
                            placeholder="NOME NO CARTÃO"
                        >
                    </div>

                    <div class="campo-duplo">
                        <div class="campo">
                            <label for="validade-${id}">
                                Validade
                            </label>

                            <input
                                type="text"
                                id="validade-${id}"
                                placeholder="MM/AA"
                                maxlength="5"
                            >
                        </div>

                        <div class="campo">
                            <label for="cvv-${id}">
                                CVV
                            </label>

                            <input
                                type="password"
                                id="cvv-${id}"
                                maxlength="4"
                                placeholder="123"
                            >
                        </div>
                    </div>
                `;

            case 'pix':
                return `
                    <p>
                        Após confirmar o pagamento, siga as instruções
                        para realizar a transferência PIX.
                    </p>
                `;

            case 'boleto':
                return `
                    <p>
                        O boleto poderá ser gerado após a confirmação.
                    </p>
                    <p>Vencimento: 3 dias úteis.</p>
                `;

            default:
                return '';
        }
    }

    // ==========================================
    // VALIDAR CARTÃO
    // ==========================================

    function validarCartao(id) {

        const numero = document
            .getElementById(`numero-cartao-${id}`)
            .value.replace(/\s/g, '');

        const nome = document
            .getElementById(`nome-cartao-${id}`)
            .value;

        const validade = document
            .getElementById(`validade-${id}`)
            .value;

        const cvv = document
            .getElementById(`cvv-${id}`)
            .value;

        if (!/^\d{16}$/.test(numero)) {
            alert('Informe um número de cartão com 16 dígitos.');
            return false;
        }

        if (!nome.trim()) {
            alert('Informe o nome impresso no cartão.');
            return false;
        }

        if (!/^\d{2}\/\d{2}$/.test(validade)) {
            alert('Informe a validade no formato MM/AA.');
            return false;
        }

        if (!/^\d{3,4}$/.test(cvv)) {
            alert('Informe um CVV válido.');
            return false;
        }

        return true;
    }

    // ==========================================
    // ENVIAR PAGAMENTO AO BACKEND
    // ==========================================

    async function enviarPagamento() {

        const formasInvalidas = formasPagamento.some(
            f => !Number.isInteger(f.valor_centavos) ||
                 f.valor_centavos <= 0
        );

        if (formasPagamento.length === 0 || formasInvalidas) {
            alert('Adicione formas de pagamento com valores válidos.');
            return;
        }

        if (valorRestante !== 0) {
            alert(
                `Ainda falta distribuir ${formatarPreco(valorRestante)}.`
            );
            return;
        }

        for (const forma of formasPagamento) {
            if (forma.tipo === 'cartao' && !validarCartao(forma.id)) {
                return;
            }
        }

        // Data e hora local, sem Z e sem milissegundos
        const agora = new Date();

        const dataPagamento =
            `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}T${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}:${String(agora.getSeconds()).padStart(2, '0')}`;

        const corpo = {
            pedido_id_pedido: idPedido,
            data_pagamento: dataPagamento,
            formas: formasPagamento.map(forma => ({
                forma_pagamento_id: forma.forma_pagamento_id,
                valor_pago: Number(
                    (forma.valor_centavos / 100).toFixed(2)
                )
            }))
        };

        console.log('DADOS ENVIADOS AO BACKEND:', corpo);

        btnFinalizar.disabled = true;
        btnFinalizar.textContent = 'Processando pagamento...';

        try {

            const resposta = await fetch(
                `${API_BASE_URL}/pagamento`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(corpo)
                }
            );

            const dados = await resposta.json().catch(() => ({}));

            if (!resposta.ok) {
                throw new Error(
                    dados.error ||
                    dados.message ||
                    `Erro ao processar pagamento. Status: ${resposta.status}`
                );
            }

            console.log('PAGAMENTO REGISTRADO:', dados);

            alert('Pagamento registrado com sucesso!');

            sessionStorage.removeItem('carrinho');
            sessionStorage.removeItem('dadosPagamento');

            window.location.href = '../menu/menu.html';

        } catch (erro) {

            console.error('ERRO AO PROCESSAR PAGAMENTO:', erro);

            alert(erro.message || 'Erro ao processar pagamento.');

            btnFinalizar.disabled = false;
            btnFinalizar.textContent = 'Finalizar Pagamento';
        }
    }

    // ==========================================
    // EVENTO DE FINALIZAÇÃO
    // ==========================================

    formPagamento.addEventListener('submit', function (evento) {
        evento.preventDefault();
        enviarPagamento();
    });

    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================

    atualizarValores();

    await carregarFormasPagamento();

});
