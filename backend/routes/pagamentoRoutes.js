
const express = require('express');
const path = require('path');
const router = express.Router();
const pagamentoController = require('./../controllers/pagamentoController');

// Tela de pagamento do cliente
router.get('/abrirTelaPagamento', (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            '../../frontend/visaoCliente/pagamento/pagamento.html'
        )
    );
});

// CRUD administrativo de pagamentos
router.get('/abrirCrudPagamento', pagamentoController.abrirCrudPagamento);

router.get('/', pagamentoController.listarPagamentos);
router.post('/', pagamentoController.criarPagamento);
router.get('/:id', pagamentoController.obterPagamento);
router.put('/:id', pagamentoController.atualizarPagamento);
router.delete('/:id', pagamentoController.deletarPagamento);

module.exports = router;