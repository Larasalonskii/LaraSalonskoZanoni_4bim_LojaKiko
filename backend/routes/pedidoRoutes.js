const express = require('express');
const router = express.Router();
const pedidoController = require('./../controllers/pedidoController');

// CRUD de Pedidos
// Atenção: as rotas fixas (/abrirCrudPedido e /opcoes) precisam vir ANTES de /:id

router.get('/abrirCrudPedido', pedidoController.abrirCrudPedido);
router.get('/opcoes', pedidoController.listarOpcoes);
router.get('/', pedidoController.listarPedidos);
router.post('/', pedidoController.criarPedido);
router.get('/:id', pedidoController.obterPedido);
router.put('/:id', pedidoController.atualizarPedido);
router.delete('/:id', pedidoController.deletarPedido);

module.exports = router;