const tabela = document.getElementById("tabela-itens");
const novoItemBtn = document.getElementById("novo-item");
const totalSpan = document.getElementById("total");

function atualizarTotal() {
    let total = 0;
    document.querySelectorAll(".subtotal").forEach(td => {
        total += parseFloat(td.textContent.replace("R$ ", "").replace(",", ".") || 0);
    });
    totalSpan.textContent = "R$ " + total.toFixed(2).replace(".", ",");
}

function criarLinha() {
    const tr = document.createElement("tr");

    tr.innerHTML = `
    <td><input type="text" class="id-produto" placeholder="ID"></td>
    <td>
      <select class="produto">
        <option value="10" data-preco="5.50">Ovos Brancos</option>
        <option value="11" data-preco="6.20">Ovos Vermelhos</option>
        <option value="12" data-preco="4.80">Ovos Caipiras</option>
      </select>
    </td>
    <td><input type="number" min="1" value="1" class="quantidade"></td>
    <td class="preco-unitario">R$ 0,00</td>
    <td class="subtotal">R$ 0,00</td>
    <td>
      <button class="editar">Editar</button>
      <button class="excluir">Excluir</button>
    </td>
  `;

    tabela.appendChild(tr);

    const produtoSelect = tr.querySelector(".produto");
    const qtdInput = tr.querySelector(".quantidade");
    const precoTd = tr.querySelector(".preco-unitario");
    const subtotalTd = tr.querySelector(".subtotal");
    const excluirBtn = tr.querySelector(".excluir");

    function atualizarLinha() {
        const preco = parseFloat(produtoSelect.selectedOptions[0].dataset.preco);
        const qtd = parseInt(qtdInput.value) || 0;
        precoTd.textContent = "R$ " + preco.toFixed(2).replace(".", ",");
        subtotalTd.textContent = "R$ " + (preco * qtd).toFixed(2).replace(".", ",");
        atualizarTotal();
    }

    produtoSelect.addEventListener("change", atualizarLinha);
    qtdInput.addEventListener("input", atualizarLinha);
    excluirBtn.addEventListener("click", () => {
        tr.remove();
        atualizarTotal();
    });

    atualizarLinha();
}

novoItemBtn.addEventListener("click", (e) => {
    e.preventDefault();
    criarLinha();
});
