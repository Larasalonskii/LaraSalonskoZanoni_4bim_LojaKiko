const API_BASE_URL = 'http://localhost:3001'; // Define o host e a porta do servidor


// ---------- Utilitários ----------

function somenteDigitos(valor) {
    return valor.replace(/\D/g, '');
}

function mascaraCPF(valor) {
    let v = somenteDigitos(valor).slice(0, 11);
    v = v.replace(/^(\d{3})(\d)/, '$1.$2');
    v = v.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
    v = v.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
    return v;
}

function mascaraTelefone(valor) {
    const v = somenteDigitos(valor).slice(0, 11);
    if (v.length > 10) return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    if (v.length > 6) return v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
    return v ? `(${v}` : '';
}

// Valida os dois dígitos verificadores do CPF
function cpfValido(cpf) {
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    for (let t = 9; t < 11; t++) {
        let soma = 0;
        for (let i = 0; i < t; i++) {
            soma += Number(cpf[i]) * (t + 1 - i);
        }
        const dv = ((soma * 10) % 11) % 10;
        if (dv !== Number(cpf[t])) return false;
    }
    return true;
}

function mostrarMensagem(texto, tipo = 'erro') {
    const el = document.getElementById("mensagem");
    el.innerText = texto;
    el.style.color = tipo === 'sucesso' ? 'green' : 'crimson';
}


// ---------- Validação ----------

function validarDados(d) {
    if (d.nome.split(/\s+/).filter(Boolean).length < 2) {
        return "Digite seu nome completo (nome e sobrenome).";
    }
    if (!/^[a-zA-Z0-9._]{3,30}$/.test(d.usuario)) {
        return "Usuário deve ter de 3 a 30 caracteres (letras, números, ponto ou _).";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
        return "Digite um e-mail válido.";
    }
    if (!cpfValido(d.cpf)) {
        return "CPF inválido.";
    }
    if (!d.dataNascimento) {
        return "Informe sua data de nascimento.";
    }
    if (new Date(d.dataNascimento) > new Date()) {
        return "A data de nascimento não pode estar no futuro.";
    }
    if (d.telefone.length < 10 || d.telefone.length > 11) {
        return "Telefone inválido. Use DDD + número.";
    }
    if (d.senha.length < 6) {
        return "A senha deve ter pelo menos 6 caracteres.";
    }
    return null; // tudo certo
}


// ---------- Cadastro ----------

async function cadastrar() {
    const dados = {
        nome: document.getElementById("nome").value.trim(),
        usuario: document.getElementById("usuario").value.trim(),
        email: document.getElementById("email").value.trim(),
        cpf: somenteDigitos(document.getElementById("cpf").value),
        dataNascimento: document.getElementById("dataNascimento").value,
        telefone: somenteDigitos(document.getElementById("telefone").value),
        senha: document.getElementById("senha").value
    };

    const erro = validarDados(dados);
    if (erro) {
        mostrarMensagem(erro, 'erro');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/cadastro/cadastrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const data = await response.json();
        console.log("Resposta do servidor sobre o cadastro: " + JSON.stringify(data));

        switch (data.status) {
            case 'ok':
                mostrarMensagem("Cadastro realizado com sucesso! Redirecionando para o login...", 'sucesso');
                setTimeout(() => { window.location.href = "login.html"; }, 1500);
                break;
            case 'email_existe':
                mostrarMensagem("Este e-mail já está cadastrado.");
                break;
            case 'cpf_existe':
                mostrarMensagem("Este CPF já está cadastrado.");
                break;
            case 'usuario_existe':
                mostrarMensagem("Este nome de usuário já está em uso.");
                break;
            default:
                mostrarMensagem("Não foi possível concluir o cadastro. Tente novamente.");
        }
    } catch (err) {
        console.error("Erro ao cadastrar:", err);
        mostrarMensagem("Não foi possível conectar ao servidor.");
    }
}


// ---------- Inicialização ----------

document.addEventListener("DOMContentLoaded", () => {
    const cpf = document.getElementById("cpf");
    const telefone = document.getElementById("telefone");
    const dataNascimento = document.getElementById("dataNascimento");

    cpf.addEventListener("input", () => { cpf.value = mascaraCPF(cpf.value); });
    telefone.addEventListener("input", () => { telefone.value = mascaraTelefone(telefone.value); });

    // Não deixa escolher data futura
    dataNascimento.max = new Date().toISOString().split("T")[0];

    // Se veio da tela de login com o e-mail digitado, já preenche
    const emailUrl = new URLSearchParams(window.location.search).get("email");
    if (emailUrl) document.getElementById("email").value = emailUrl;

    // Enter em qualquer campo envia o formulário
    document.querySelectorAll("#cadastroFrame input").forEach(input => {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") cadastrar();
        });
    });
});