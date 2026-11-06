const express = require('express');
const router = express.Router();
const formaPagamentoController = require('./../controllers/forma_pagamentoController');

// CRUD de Formas de Pagamento

router.get('/abrirCrudFormaPagamento', formaPagamentoController.abrirCrudFormaPagamento);
router.get('/', formaPagamentoController.listarFormasPagamento);
router.post('/', formaPagamentoController.criarFormaPagamento);
router.get('/:id', formaPagamentoController.obterFormaPagamento);
router.put('/:id', formaPagamentoController.atualizarFormaPagamento);
router.delete('/:id', formaPagamentoController.deletarFormaPagamento);

module.exports = router;