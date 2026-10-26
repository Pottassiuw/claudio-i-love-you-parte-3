const vendedoresService = require('./services/vendedores.service');
const vendasService = require('./services/vendas.service');
const relatoriosService = require('./services/relatorios.service');
const comissaoService = require('./services/comissao.service');

module.exports = {
  // Vendedores
  cadastrarVendedor: vendedoresService.cadastrarVendedor,
  listarVendedores: vendedoresService.listarVendedores,
  consultarVendedorPorId: vendedoresService.consultarVendedorPorId,
  atualizarVendedor: vendedoresService.atualizarVendedor,
  desativarVendedor: vendedoresService.desativarVendedor,

  // Vendas
  registrarVenda: vendasService.registrarVenda,
  listarVendas: vendasService.listarVendas,
  consultarVendasPorVendedor: vendasService.consultarVendasPorVendedor,
  consultarVendasPorRegiao: vendasService.consultarVendasPorRegiao,
  excluirVenda: vendasService.excluirVenda,

  // Regras e Relatórios
  calcularComissao: comissaoService.calcularComissao,
  gerarRelatorioPerformance: relatoriosService.gerarRelatorioPerformance
};
