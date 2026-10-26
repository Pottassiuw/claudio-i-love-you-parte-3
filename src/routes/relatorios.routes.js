const express = require('express');
const router = express.Router();
const controller = require('../controllers/relatorios.controller');

router.get('/performance', controller.performance);

module.exports = router;
