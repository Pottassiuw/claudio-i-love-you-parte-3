const express = require('express');
const router = express.Router();

const vendedoresRoutes = require('./vendedores.routes');
const vendasRoutes = require('./vendas.routes');
const relatoriosRoutes = require('./relatorios.routes');

router.get('/', (req, res) => {
  res.json({
    sistema: 'API de Vendas e Comissões',
    status: 'online',
    versao: '1.0.0'
  });
});

router.use('/vendedores', vendedoresRoutes);
router.use('/vendas', vendasRoutes);
router.use('/relatorios', relatoriosRoutes);

module.exports = router;
