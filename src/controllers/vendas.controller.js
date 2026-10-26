const vendasService = require('../services/vendas.service');

async function registrar(req, res, next) {
  try {
    const { id_venda, id_vendedor, id_regiao, data_venda, valor_venda, tipo_cliente } = req.body;
    const novaVenda = await vendasService.registrarVenda({
      id_venda,
      id_vendedor,
      id_regiao,
      data_venda,
      valor_venda,
      tipo_cliente
    });
    res.status(201).json(novaVenda);
  } catch (erro) {
    next(erro);
  }
}

async function listar(req, res, next) {
  try {
    const vendas = await vendasService.listarVendas();
    res.status(200).json(vendas);
  } catch (erro) {
    next(erro);
  }
}

async function consultarPorVendedor(req, res, next) {
  try {
    const vendas = await vendasService.consultarVendasPorVendedor(req.params.id);
    res.status(200).json(vendas);
  } catch (erro) {
    next(erro);
  }
}

async function consultarPorRegiao(req, res, next) {
  try {
    const vendas = await vendasService.consultarVendasPorRegiao(req.params.id);
    res.status(200).json(vendas);
  } catch (erro) {
    next(erro);
  }
}

async function excluir(req, res, next) {
  try {
    const resultado = await vendasService.excluirVenda(req.params.id);
    res.status(200).json(resultado);
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  registrar,
  listar,
  consultarPorVendedor,
  consultarPorRegiao,
  excluir
};
