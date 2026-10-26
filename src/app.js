const express = require('express');
const funcoes = require('./funcoes');

const app = express();

app.use(express.json());

// Rota raiz informativa
app.get('/', (req, res) => {
  res.json({
    sistema: 'API de Vendas, Comissões e Performance',
    versao: '1.0.0',
    status: 'online',
    documentacao: 'Consulte o README.md para a lista completa de rotas e exemplos.'
  });
});

// =====================================================================
// ROTAS DE VENDEDORES
// =====================================================================

// POST /vendedores - Cadastrar vendedor
app.post('/vendedores', async (req, res, next) => {
  try {
    const { nome, meta_mensal, percentual_base, ativo } = req.body;
    const vendedor = await funcoes.cadastrarVendedor({ nome, meta_mensal, percentual_base, ativo });
    res.status(201).json(vendedor);
  } catch (erro) {
    next(erro);
  }
});

// GET /vendedores - Listar vendedores
app.get('/vendedores', async (req, res, next) => {
  try {
    const filtros = {};
    if (req.query.ativo !== undefined) {
      filtros.ativo = req.query.ativo === 'true' || req.query.ativo === '1';
    }
    const vendedores = await funcoes.listarVendedores(filtros);
    res.status(200).json(vendedores);
  } catch (erro) {
    next(erro);
  }
});

// GET /vendedores/:id - Consultar vendedor por ID
app.get('/vendedores/:id', async (req, res, next) => {
  try {
    const vendedor = await funcoes.consultarVendedorPorId(req.params.id);
    res.status(200).json(vendedor);
  } catch (erro) {
    next(erro);
  }
});

// PUT /vendedores/:id - Atualizar meta mensal e/ou percentual base
app.put('/vendedores/:id', async (req, res, next) => {
  try {
    const { meta_mensal, percentual_base, nome } = req.body;
    const atualizado = await funcoes.atualizarVendedor(req.params.id, { meta_mensal, percentual_base, nome });
    res.status(200).json(atualizado);
  } catch (erro) {
    next(erro);
  }
});

// PATCH /vendedores/:id/desativar - Desativar vendedor
app.patch('/vendedores/:id/desativar', async (req, res, next) => {
  try {
    const resultado = await funcoes.desativarVendedor(req.params.id);
    res.status(200).json(resultado);
  } catch (erro) {
    next(erro);
  }
});

// =====================================================================
// ROTAS DE VENDAS
// =====================================================================

// POST /vendas - Registrar venda
app.post('/vendas', async (req, res, next) => {
  try {
    const { id_venda, id_vendedor, id_regiao, data_venda, valor_venda, tipo_cliente } = req.body;
    const novaVenda = await funcoes.registrarVenda({
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
});

// GET /vendas - Listar todas as vendas
app.get('/vendas', async (req, res, next) => {
  try {
    const vendas = await funcoes.listarVendas();
    res.status(200).json(vendas);
  } catch (erro) {
    next(erro);
  }
});

// GET /vendas/vendedor/:id - Consultar vendas por vendedor
app.get('/vendas/vendedor/:id', async (req, res, next) => {
  try {
    const vendas = await funcoes.consultarVendasPorVendedor(req.params.id);
    res.status(200).json(vendas);
  } catch (erro) {
    next(erro);
  }
});

// GET /vendas/regiao/:id - Consultar vendas por região
app.get('/vendas/regiao/:id', async (req, res, next) => {
  try {
    const vendas = await funcoes.consultarVendasPorRegiao(req.params.id);
    res.status(200).json(vendas);
  } catch (erro) {
    next(erro);
  }
});

// DELETE /vendas/:id - Excluir venda após verificar existência
app.delete('/vendas/:id', async (req, res, next) => {
  try {
    const resultado = await funcoes.excluirVenda(req.params.id);
    res.status(200).json(resultado);
  } catch (erro) {
    next(erro);
  }
});

// =====================================================================
// ROTAS DE RELATÓRIO
// =====================================================================

// GET /relatorios/performance?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
app.get('/relatorios/performance', async (req, res, next) => {
  try {
    const { inicio, fim } = req.query;
    const relatorio = await funcoes.gerarRelatorioPerformance({ inicio, fim });
    res.status(200).json(relatorio);
  } catch (erro) {
    next(erro);
  }
});

// =====================================================================
// TRATAMENTO CENTRALIZADO DE ERROS (Middleware Express)
// =====================================================================
app.use((erro, req, res, next) => {
  const status = erro.status || 500;
  res.status(status).json({
    sucesso: false,
    status,
    erro: erro.message || 'Erro interno no servidor.'
  });
});

module.exports = app;
