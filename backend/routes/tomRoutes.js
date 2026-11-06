const express = require('express');
const router = express.Router();
const tomController = require('./../controllers/tomController');

// CRUD de Tons

router.get('/abrirCrudTom', tomController.abrirCrudTom);
router.get('/', tomController.listarTons);
router.post('/', tomController.criarTom);
router.get('/:id', tomController.obterTom);
router.put('/:id', tomController.atualizarTom);
router.delete('/:id', tomController.deletarTom);

module.exports = router;