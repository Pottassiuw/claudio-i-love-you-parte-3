function errorHandler(erro, req, res, next) {
  const status = erro.status || 500;
  res.status(status).json({
    sucesso: false,
    status,
    erro: erro.message || 'Erro interno no servidor.'
  });
}

module.exports = errorHandler;
