
const express = require('express');
const router = express.Router();

const pedidoHasProdutoController =
    require('./../controllers/pedido_has_produtoController');

// Listar itens
router.get('/', pedidoHasProdutoController.listarItens);

// Cadastrar um item
router.post('/', pedidoHasProdutoController.criarItem);

// Cadastrar vários itens de uma vez
router.post('/lote', pedidoHasProdutoController.criarItensLote);

// Buscar item
router.get('/:pedido/:produtoTom', pedidoHasProdutoController.obterItem);

// Atualizar item
router.put('/:pedido/:produtoTom', pedidoHasProdutoController.atualizarItem);

// Excluir item
router.delete('/:pedido/:produtoTom', pedidoHasProdutoController.deletarItem);

module.exports = router;
