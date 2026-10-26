const relatoriosService = require('../services/relatorios.service');

async function performance(req, res, next) {
  try {
    const { inicio, fim } = req.query;
    const relatorio = await relatoriosService.gerarRelatorioPerformance({ inicio, fim });
    res.status(200).json(relatorio);
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  performance
};
