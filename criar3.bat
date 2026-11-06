@echo off
echo ==============================================================================
echo  Criando a arvore do projeto base + adaptacoes do Banco de Dados
echo ==============================================================================
echo.

echo [1/5] Criando pastas raiz e arquivos soltos...
mkdir .vscode 2>nul
type nul > .Rhistory
type nul > README.md
type nul > estrutura.txt
type nul > index.html
type nul > p.sh
type nul > package.json
type nul > push.sh
type nul > pushTo.sh
type nul > ss
type nul > .vscode\settings.json

echo.
echo [2/5] Criando Backend (Controllers, Routes e Arquivos base)...
mkdir backend 2>nul
mkdir backend\controllers 2>nul
mkdir backend\routes 2>nul

type nul > backend\.Rhistory
type nul > backend\database.js
type nul > backend\server.js

REM --- Misturando os Controllers da Base + Tabelas Novas do DB (colecao, tom) ---
for %%f in (cargo cliente colecao forma_pagamento funcionario image login menu pagamento pedido pedido_has_produto pessoa produto tom) do (
    type nul > backend\controllers\%%fController.js
    type nul > backend\routes\%%fRoutes.js
)

echo.
echo [3/5] Criando Frontend (Views, Menus, Visao Cliente e Testes)...
mkdir frontend 2>nul

REM --- Arquivos de Menu soltos no frontend ---
type nul > frontend\menu.css
type nul > frontend\menu.html
type nul > frontend\menu.js

REM --- Pastas CRUD padrão (Mantendo a base e adicionando as tabelas do DB) ---
for %%f in (cargo cliente colecao forma_pagamento funcionario pagamento pedido pessoa produto tom) do (
    mkdir frontend\%%f 2>nul
    type nul > frontend\%%f\%%f.html
    type nul > frontend\%%f\%%f.css
    type nul > frontend\%%f\%%f.js
)

REM --- Arquivos extras dentro da pasta Pedido ---
type nul > frontend\pedido\pesquisaDinamicaCliente.js
type nul > frontend\pedido\pesquisaDinamicaStyle.css

REM --- Login e Cadastro (Base original) ---
mkdir frontend\login\cadastro 2>nul
type nul > frontend\login\login.css
type nul > frontend\login\login.html
type nul > frontend\login\login.js
type nul > frontend\login\cadastro\cadastro.css
type nul > frontend\login\cadastro\cadastro.html
type nul > frontend\login\cadastro\cadastro.js

REM --- Visão Cliente (Base original) ---
mkdir frontend\visaoCliente\carrinho 2>nul
mkdir frontend\visaoCliente\finalizar 2>nul
mkdir frontend\visaoCliente\pagamento 2>nul

for %%f in (carrinho finalizar pagamento) do (
    type nul > frontend\visaoCliente\%%f\%%f.html
    type nul > frontend\visaoCliente\%%f\%%f.css
    type nul > frontend\visaoCliente\%%f\%%f.js
)

REM --- Testes (Base original completa) ---
mkdir frontend\testes\dragavel 2>nul
mkdir frontend\testes\pedidoItens 2>nul

type nul > frontend\testes\EmOrdem.html
type nul > frontend\testes\WireframePedidoItensPedido.html
type nul > frontend\testes\problemaCors.html
type nul > frontend\testes\renderizar.html
type nul > frontend\testes\renderizarProdutoComImagem.html
type nul > frontend\testes\renderizerCarrossel.html
type nul > frontend\testes\rotaMenu.html
type nul > frontend\testes\rotaUsuarioLogado.html
type nul > frontend\testes\testeRotaPessoa.css
type nul > frontend\testes\testeRotaPessoa.html
type nul > frontend\testes\verificaCookie.html

type nul > frontend\testes\dragavel\index.html
type nul > frontend\testes\dragavel\style.css

type nul > frontend\testes\pedidoItens\pedido.css
type nul > frontend\testes\pedidoItens\pedido.html
type nul > frontend\testes\pedidoItens\pedido.js

echo.
echo [4/5] Criando pasta Documentacao...
mkdir documentacao 2>nul
type nul > "documentacao\4º bimestre - avaliação - dw1.md"
type nul > documentacao\CandyShopDER.png
type nul > documentacao\dumpDBeaver-candyshop-202511180647.sql
type nul > documentacao\estrutura.txt
type nul > documentacao\scriptCandyShop.sql
type nul > documentacao\tutorial.md

echo.
echo [5/5] Criando pasta de Imagens (vazia, conforme solicitado)...
mkdir imagens\produto 2>nul

echo.
echo ==============================================================================
echo  Fusao concluida! Arvore base gerada com as adaptacoes do Banco de Dados.
echo ==============================================================================
pause