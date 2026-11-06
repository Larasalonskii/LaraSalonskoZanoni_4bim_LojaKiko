const express = require('express');
const router = express.Router();
const colecaoController = require('./../controllers/colecaoController');

// CRUD de Coleções

router.get('/abrirCrudColecao', colecaoController.abrirCrudColecao);
router.get('/', colecaoController.listarColecoes);
router.post('/', colecaoController.criarColecao);
router.get('/:id', colecaoController.obterColecao);
router.put('/:id', colecaoController.atualizarColecao);
router.delete('/:id', colecaoController.deletarColecao);

module.exports = router;