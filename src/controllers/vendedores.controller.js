const vendedoresService = require('../services/vendedores.service');

async function cadastrar(req, res, next) {
  try {
    const { nome, meta_mensal, percentual_base, ativo } = req.body;
    const vendedor = await vendedoresService.cadastrarVendedor({ nome, meta_mensal, percentual_base, ativo });
    res.status(201).json(vendedor);
  } catch (erro) {
    next(erro);
  }
}

async function listar(req, res, next) {
  try {
    const filtros = {};
    if (req.query.ativo !== undefined) {
      filtros.ativo = req.query.ativo === 'true' || req.query.ativo === '1';
    }
    const vendedores = await vendedoresService.listarVendedores(filtros);
    res.status(200).json(vendedores);
  } catch (erro) {
    next(erro);
  }
}

async function consultarPorId(req, res, next) {
  try {
    const vendedor = await vendedoresService.consultarVendedorPorId(req.params.id);
    res.status(200).json(vendedor);
  } catch (erro) {
    next(erro);
  }
}

async function atualizar(req, res, next) {
  try {
    const { meta_mensal, percentual_base, nome } = req.body;
    const atualizado = await vendedoresService.atualizarVendedor(req.params.id, { meta_mensal, percentual_base, nome });
    res.status(200).json(atualizado);
  } catch (erro) {
    next(erro);
  }
}

async function desativar(req, res, next) {
  try {
    const resultado = await vendedoresService.desativarVendedor(req.params.id);
    res.status(200).json(resultado);
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  cadastrar,
  listar,
  consultarPorId,
  atualizar,
  desativar
};
