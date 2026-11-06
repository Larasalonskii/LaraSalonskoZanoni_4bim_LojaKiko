const API_BASE_URL = 'http://localhost:3001';


async function verificarAutorizacao() {
    try {
        const res = await fetch(API_BASE_URL + '/login/verificaSeUsuarioEstaLogado', {
            credentials: 'include'
        });

        const oUsuario = await res.json();

        if (oUsuario.status !== 'ok') {
            //console.log("Usuário não logado, redirecionando...");
            window.location.href = "../login/login.html";
            return false;
        }

        const usuarioObjeto = JSON.parse(oUsuario.usuario || '{}');
        const oCargo = usuarioObjeto.ehFuncionario ? usuarioObjeto.ehFuncionario.nome_cargo : 'Cliente';

        alert(usuarioObjeto)

        document.getElementById("oUsuario").options[0].text = `${usuarioObjeto.nome} - ${oCargo}`;
        return true;

    } catch (error) {
        console.error("Erro ao verificar login:", error);
        return false;
    }
}


function formatarPreco(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function carregarCarrinho() {
    // MUDANÇA: Usando sessionStorage para carregar o carrinho
    const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || [];
    const corpo = document.getElementById('corpo-tabela');
    const totalGeral = document.getElementById('total-geral');
    corpo.innerHTML = '';
    let total = 0;

    if (carrinho.length === 0) {
        corpo.innerHTML = `<tr><td colspan="6" style="text-align:center;">Seu carrinho está vazio.</td></tr>`;
        document.getElementById('btn-finalizar').disabled = true;
        document.getElementById('btn-limpar').disabled = true;
        return;
    }

    carrinho.forEach((item, index) => {
        // Cálculo do subtotal (item.preco é o preço por Kg, item.quantidade é em gramas)
        const subtotal = item.preco * (item.quantidade / 1000);
        total += subtotal;

        const linha = document.createElement('tr');
        linha.innerHTML = `
          <td>${item.id}</td>
          <td>${item.nome}</td>
          <td>
            <input type="number" min="50" step="50" value="${item.quantidade}" onchange="atualizarQuantidade(${index}, this.value)">
          </td>
          <td>${formatarPreco(item.preco)}</td>
          <td>${formatarPreco(subtotal)}</td>
          <td><button class="btn-remover" onclick="removerItem(${index})">Remover</button></td>
        `;
        corpo.appendChild(linha);
    });

    totalGeral.textContent = `Total: ${formatarPreco(total)}`;
    document.getElementById('btn-finalizar').disabled = false;
    document.getElementById('btn-limpar').disabled = false;
}

function removerItem(index) {
    // MUDANÇA: Usando sessionStorage
    const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || [];
    carrinho.splice(index, 1);
    // MUDANÇA: Usando sessionStorage
    sessionStorage.setItem('carrinho', JSON.stringify(carrinho));
    carregarCarrinho();
}

function atualizarQuantidade(index, novaQtd) {
    // MUDANÇA: Usando sessionStorage
    const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || [];
    // Garante que a quantidade seja um número inteiro
    carrinho[index].quantidade = parseInt(novaQtd);
    // MUDANÇA: Usando sessionStorage
    sessionStorage.setItem('carrinho', JSON.stringify(carrinho));
    carregarCarrinho();
}

function limparCarrinho() {
    if (confirm("Tem certeza que deseja limpar todo o carrinho?")) {
        // MUDANÇA: Usando sessionStorage
        sessionStorage.removeItem('carrinho');
        carregarCarrinho();
    }
}

function finalizarPedido() {
    // MUDANÇA: Usando sessionStorage
    const carrinho = JSON.parse(sessionStorage.getItem('carrinho')) || [];
    if (carrinho.length === 0) {
        alert("Seu carrinho está vazio.");
        return;
    }
    window.location.href = "http://localhost:3001/login/visaoclientefinalizar";
}

document.getElementById('btn-finalizar').addEventListener('click', finalizarPedido);
document.getElementById('btn-limpar').addEventListener('click', limparCarrinho);


window.onload = function () {
    verificarAutorizacao();
    carregarCarrinho();
};