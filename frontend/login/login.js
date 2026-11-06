let emailGlobal = '';
const API_BASE_URL = 'http://localhost:3001'; // Define  o host e a porta do servidor


async function verificarEmail() {
    const email = document.getElementById("email").value;
    emailGlobal = email;

    const response = await fetch(`${API_BASE_URL}/login/verificarEmail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });

    const data = await response.json();
    console.log("Resposta do servidor sobre verificar o email: " + data.nome + " - " + data.status);

    if (data.status === 'existe') {
        document.getElementById("loginFrame").style.display = "none";
        document.getElementById("senhaFrame").style.display = "block";
        document.getElementById("nomeUsuario").innerText = `Olá, ${data.nome}`;
    } else {
        const cadastrar = confirm("E-mail não encontrado. Deseja se cadastrar?");
        if (cadastrar) {
            window.location.href = "cadastro.html?email=" + encodeURIComponent(email);
        }
    }
}



async function verificarSenha() {
    const senha = document.getElementById("senha").value;
    //  alert("Verificando senha..." + senha);
    const res = await fetch(API_BASE_URL + '/login/verificarSenha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailGlobal, senha }),
        credentials: 'include'
    });


    const data = await res.json();
    console.log("verificarSenha -> Resposta do servidor: " + JSON.stringify(data));


    if (data.status === 'ok') {
        // alert("Login bem-sucedido! Bem-vindo, " + data.nome);
        window.location.href = API_BASE_URL + "/menu";
    } else {
        alert("Senha incorreta!");
    }
}