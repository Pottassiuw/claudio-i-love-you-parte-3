const express = require('express');
const router = express.Router();
const controller = require('../controllers/vendedores.controller');

router.post('/', controller.cadastrar);
router.get('/', controller.listar);
router.get('/:id', controller.consultarPorId);
router.put('/:id', controller.atualizar);
router.patch('/:id/desativar', controller.desativar);

module.exports = router;
