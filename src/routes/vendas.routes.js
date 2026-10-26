const express = require('express');
const router = express.Router();
const controller = require('../controllers/vendas.controller');

router.post('/', controller.registrar);
router.get('/', controller.listar);
router.get('/vendedor/:id', controller.consultarPorVendedor);
router.get('/regiao/:id', controller.consultarPorRegiao);
router.delete('/:id', controller.excluir);

module.exports = router;
