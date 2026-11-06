const express = require('express');
const router = express.Router();
const pagamentoController = require('./../controllers/pagamentoController');

// CRUD de Pagamentos

router.get('/abrirCrudPagamento', pagamentoController.abrirCrudPagamento);
router.get('/', pagamentoController.listarPagamentos);
router.post('/', pagamentoController.criarPagamento);
router.get('/:id', pagamentoController.obterPagamento);
router.put('/:id', pagamentoController.atualizarPagamento);
router.delete('/:id', pagamentoController.deletarPagamento);

module.exports = router;