const express = require('express');
const router = express.Router();
const pedidoHasProdutoController = require('./../controllers/pedido_has_produtoController');

// Rotas do relacionamento Pedido_has_Produto (sem página própria)
// A chave é composta, então as rotas por item usam /:pedido/:produtoTom

router.get('/', pedidoHasProdutoController.listarItens);
router.post('/', pedidoHasProdutoController.criarItem);
router.get('/:pedido/:produtoTom', pedidoHasProdutoController.obterItem);
router.put('/:pedido/:produtoTom', pedidoHasProdutoController.atualizarItem);
router.delete('/:pedido/:produtoTom', pedidoHasProdutoController.deletarItem);

module.exports = router;