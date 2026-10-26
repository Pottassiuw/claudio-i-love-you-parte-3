const pool = require('../config/db');

async function gerarRelatorioPerformance({ inicio, fim }) {
  try {
    if (!inicio || !fim) {
      const err = new Error('Os parâmetros "inicio" e "fim" são obrigatórios (formato YYYY-MM-DD).');
      err.status = 400;
      throw err;
    }

    const dataInicio = `${inicio.split('T')[0]} 00:00:00`;
    const dataFim = `${fim.split('T')[0]} 23:59:59`;

    // 1. Total geral e médias
    const [totais] = await pool.execute(
      `SELECT
        COUNT(id_venda) AS quantidade_vendas,
        COALESCE(SUM(valor_venda), 0) AS valor_total_vendido,
        COALESCE(SUM(valor_comissao), 0) AS valor_total_comissao,
        COALESCE(AVG(valor_comissao), 0) AS comissao_media_geral,
        COALESCE(AVG(valor_venda), 0) AS ticket_medio
       FROM vendas
       WHERE data_venda BETWEEN ? AND ?`,
      [dataInicio, dataFim]
    );

    // 2. Vendas por região (JOIN + GROUP BY + SUM + AVG + COUNT)
    const [vendasRegiao] = await pool.execute(
      `SELECT
        r.id_regiao,
        r.nome_regiao,
        COUNT(v.id_venda) AS quantidade_vendas,
        COALESCE(SUM(v.valor_venda), 0) AS total_vendas_reais,
        COALESCE(SUM(v.valor_comissao), 0) AS total_comissao_reais,
        COALESCE(AVG(v.valor_comissao), 0) AS comissao_media_por_regiao
       FROM regioes r
       LEFT JOIN vendas v ON r.id_regiao = v.id_regiao AND v.data_venda BETWEEN ? AND ?
       GROUP BY r.id_regiao, r.nome_regiao
       ORDER BY total_vendas_reais DESC`,
      [dataInicio, dataFim]
    );

    // 3. Vendas por tipo de cliente (GROUP BY + SUM + COUNT)
    const [vendasTipoCliente] = await pool.execute(
      `SELECT
        tipo_cliente,
        COUNT(id_venda) AS quantidade_vendas,
        COALESCE(SUM(valor_venda), 0) AS total_vendas_reais,
        COALESCE(SUM(valor_comissao), 0) AS total_comissao_reais
       FROM vendas
       WHERE data_venda BETWEEN ? AND ?
       GROUP BY tipo_cliente
       ORDER BY total_vendas_reais DESC`,
      [dataInicio, dataFim]
    );

    // 4. Vendedor com maior valor vendido
    const [melhorVendedor] = await pool.execute(
      `SELECT
        v.id_vendedor,
        ven.nome,
        COALESCE(SUM(v.valor_venda), 0) AS total_vendido_reais,
        COALESCE(SUM(v.valor_comissao), 0) AS total_comissao_reais
       FROM vendas v
       INNER JOIN vendedores ven ON v.id_vendedor = ven.id_vendedor
       WHERE v.data_venda BETWEEN ? AND ?
       GROUP BY v.id_vendedor, ven.nome
       ORDER BY total_vendido_reais DESC
       LIMIT 1`,
      [dataInicio, dataFim]
    );

    // 5. Vendedor com maior comissão acumulada
    const [maiorComissao] = await pool.execute(
      `SELECT
        v.id_vendedor,
        ven.nome,
        COALESCE(SUM(v.valor_comissao), 0) AS total_comissao_reais,
        COALESCE(SUM(v.valor_venda), 0) AS total_vendido_reais
       FROM vendas v
       INNER JOIN vendedores ven ON v.id_vendedor = ven.id_vendedor
       WHERE v.data_venda BETWEEN ? AND ?
       GROUP BY v.id_vendedor, ven.nome
       ORDER BY total_comissao_reais DESC
       LIMIT 1`,
      [dataInicio, dataFim]
    );

    // 6. Indicador de metas batidas por vendedor no período
    const [desempenhoMetas] = await pool.execute(
      `SELECT
        ven.id_vendedor,
        ven.nome,
        ven.meta_mensal,
        COALESCE(SUM(v.valor_venda), 0) AS total_vendido,
        ROUND((COALESCE(SUM(v.valor_venda), 0) / ven.meta_mensal) * 100, 2) AS percentual_atingido,
        CASE WHEN COALESCE(SUM(v.valor_venda), 0) >= ven.meta_mensal THEN 1 ELSE 0 END AS atingiu_meta
       FROM vendedores ven
       LEFT JOIN vendas v ON ven.id_vendedor = v.id_vendedor AND v.data_venda BETWEEN ? AND ?
       WHERE ven.ativo = 1
       GROUP BY ven.id_vendedor, ven.nome, ven.meta_mensal
       ORDER BY total_vendido DESC`,
      [dataInicio, dataFim]
    );

    const vendedoresAtingiram = desempenhoMetas.filter(m => m.atingiu_meta === 1);

    return {
      periodo: {
        inicio,
        fim
      },
      indicadores: {
        total_vendas: Number(totais[0].quantidade_vendas),
        valor_total_vendido: Number(totais[0].valor_total_vendido),
        valor_total_comissoes: Number(totais[0].valor_total_comissao),
        comissao_media_geral: Number(Number(totais[0].comissao_media_geral).toFixed(2)),
        ticket_medio: Number(Number(totais[0].ticket_medio).toFixed(2)),
        vendas_por_regiao: vendasRegiao.map(r => ({
          id_regiao: r.id_regiao,
          regiao: r.nome_regiao,
          quantidade_vendas: Number(r.quantidade_vendas),
          total_vendas: Number(r.total_vendas_reais),
          total_comissao: Number(r.total_comissao_reais),
          comissao_media: Number(Number(r.comissao_media_por_regiao).toFixed(2))
        })),
        vendas_por_tipo_cliente: vendasTipoCliente.map(c => ({
          tipo_cliente: c.tipo_cliente,
          quantidade_vendas: Number(c.quantidade_vendas),
          total_vendas: Number(c.total_vendas_reais),
          total_comissao: Number(c.total_comissao_reais)
        })),
        melhor_vendedor: melhorVendedor.length > 0 ? {
          id_vendedor: melhorVendedor[0].id_vendedor,
          nome: melhorVendedor[0].nome,
          total_vendido: Number(melhorVendedor[0].total_vendido_reais),
          total_comissao: Number(melhorVendedor[0].total_comissao_reais)
        } : null,
        maior_comissao: maiorComissao.length > 0 ? {
          id_vendedor: maiorComissao[0].id_vendedor,
          nome: maiorComissao[0].nome,
          total_comissao: Number(maiorComissao[0].total_comissao_reais),
          total_vendido: Number(maiorComissao[0].total_vendido_reais)
        } : null,
        metas_atingidas: {
          quantidade_vendedores_atingiram: vendedoresAtingiram.length,
          total_vendedores_ativos: desempenhoMetas.length,
          vendedores: desempenhoMetas.map(v => ({
            id_vendedor: v.id_vendedor,
            nome: v.nome,
            meta_mensal: Number(v.meta_mensal),
            total_vendido: Number(v.total_vendido),
            percentual_atingido: Number(v.percentual_atingido),
            atingiu_meta: Boolean(v.atingiu_meta)
          }))
        }
      }
    };
  } catch (erro) {
    if (!erro.status) console.error('Erro ao gerar relatório de performance:', erro.message);
    throw erro;
  }
}

module.exports = {
  gerarRelatorioPerformance
};
