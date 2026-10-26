const pool = require('./db');
const { calcularComissao } = require('./regras');

/**
 * Cadastra um novo vendedor no banco de dados.
 */
async function cadastrarVendedor({ nome, meta_mensal, percentual_base, ativo = true }) {
  try {
    if (!nome || typeof nome !== 'string' || nome.trim() === '') {
      const err = new Error('O campo "nome" é obrigatório.');
      err.status = 400;
      throw err;
    }
    const meta = Number(meta_mensal);
    const base = Number(percentual_base);

    if (isNaN(meta) || meta < 0) {
      const err = new Error('A "meta_mensal" deve ser um valor numérico não negativo.');
      err.status = 400;
      throw err;
    }
    if (isNaN(base) || base < 0) {
      const err = new Error('O "percentual_base" deve ser um valor numérico não negativo.');
      err.status = 400;
      throw err;
    }

    const [result] = await pool.execute(
      'INSERT INTO vendedores (nome, meta_mensal, percentual_base, ativo) VALUES (?, ?, ?, ?)',
      [nome.trim(), meta, base, ativo ? 1 : 0]
    );

    return {
      id_vendedor: result.insertId,
      nome: nome.trim(),
      meta_mensal: meta,
      percentual_base: base,
      ativo: Boolean(ativo)
    };
  } catch (erro) {
    if (!erro.status) console.error('Erro ao cadastrar vendedor:', erro.message);
    throw erro;
  }
}

/**
 * Lista todos os vendedores. Permite filtro opcional por status ativo.
 */
async function listarVendedores(filtros = {}) {
  try {
    let query = 'SELECT id_vendedor, nome, meta_mensal, percentual_base, ativo FROM vendedores';
    const params = [];

    if (filtros.ativo !== undefined) {
      query += ' WHERE ativo = ?';
      params.push(filtros.ativo ? 1 : 0);
    }

    query += ' ORDER BY id_vendedor ASC';
    const [resultados] = await pool.execute(query, params);
    return resultados.map(r => ({ ...r, ativo: Boolean(r.ativo) }));
  } catch (erro) {
    console.error('Erro ao consultar vendedores:', erro.message);
    throw erro;
  }
}

/**
 * Consulta um vendedor por ID.
 */
async function consultarVendedorPorId(id_vendedor) {
  try {
    const [rows] = await pool.execute(
      'SELECT id_vendedor, nome, meta_mensal, percentual_base, ativo FROM vendedores WHERE id_vendedor = ?',
      [id_vendedor]
    );

    if (rows.length === 0) {
      const err = new Error(`Vendedor com ID ${id_vendedor} não encontrado.`);
      err.status = 404;
      throw err;
    }

    return { ...rows[0], ativo: Boolean(rows[0].ativo) };
  } catch (erro) {
    if (!erro.status) console.error('Erro ao consultar vendedor por ID:', erro.message);
    throw erro;
  }
}

/**
 * Atualiza meta mensal, percentual base ou nome de um vendedor.
 */
async function atualizarVendedor(id_vendedor, { meta_mensal, percentual_base, nome }) {
  try {
    // Garante que o vendedor existe
    const vendedorAtual = await consultarVendedorPorId(id_vendedor);

    const campos = [];
    const valores = [];

    if (nome !== undefined) {
      if (typeof nome !== 'string' || nome.trim() === '') {
        const err = new Error('Nome inválido para atualização.');
        err.status = 400;
        throw err;
      }
      campos.push('nome = ?');
      valores.push(nome.trim());
    }

    if (meta_mensal !== undefined) {
      const meta = Number(meta_mensal);
      if (isNaN(meta) || meta < 0) {
        const err = new Error('A meta mensal deve ser um número positivo.');
        err.status = 400;
        throw err;
      }
      campos.push('meta_mensal = ?');
      valores.push(meta);
    }

    if (percentual_base !== undefined) {
      const base = Number(percentual_base);
      if (isNaN(base) || base < 0) {
        const err = new Error('O percentual base deve ser um número positivo.');
        err.status = 400;
        throw err;
      }
      campos.push('percentual_base = ?');
      valores.push(base);
    }

    if (campos.length === 0) {
      const err = new Error('Nenhum campo fornecido para atualização.');
      err.status = 400;
      throw err;
    }

    valores.push(id_vendedor);
    await pool.execute(
      `UPDATE vendedores SET ${campos.join(', ')} WHERE id_vendedor = ?`,
      valores
    );

    return await consultarVendedorPorId(id_vendedor);
  } catch (erro) {
    if (!erro.status) console.error('Erro ao atualizar vendedor:', erro.message);
    throw erro;
  }
}

/**
 * Desativa um vendedor (soft delete), mantendo histórico de vendas intacto.
 */
async function desativarVendedor(id_vendedor) {
  try {
    await consultarVendedorPorId(id_vendedor);

    await pool.execute(
      'UPDATE vendedores SET ativo = 0 WHERE id_vendedor = ?',
      [id_vendedor]
    );

    return {
      id_vendedor: Number(id_vendedor),
      ativo: false,
      mensagem: `Vendedor ${id_vendedor} desativado com sucesso. Histórico de vendas preservado.`
    };
  } catch (erro) {
    if (!erro.status) console.error('Erro ao desativar vendedor:', erro.message);
    throw erro;
  }
}

/**
 * Registra uma nova venda, validando regras de negócio e calculando comissão.
 */
async function registrarVenda({
  id_venda,
  id_vendedor,
  id_regiao,
  data_venda,
  valor_venda,
  tipo_cliente
}) {
  try {
    // 1. Validar se id_venda customizado foi fornecido e se já existe
    if (id_venda !== undefined && id_venda !== null) {
      const [vendaExiste] = await pool.execute(
        'SELECT id_venda FROM vendas WHERE id_venda = ?',
        [id_venda]
      );
      if (vendaExiste.length > 0) {
        const err = new Error(`Código de venda duplicado: já existe uma venda com o código ${id_venda}.`);
        err.status = 400;
        throw err;
      }
    }

    // 2. Validar valor da venda (positivo)
    const valor = Number(valor_venda);
    if (isNaN(valor) || valor <= 0) {
      const err = new Error('O valor da venda deve ser um número maior que zero.');
      err.status = 400;
      throw err;
    }

    // 3. Validar tipo de cliente
    if (!['PF', 'PJ'].includes(tipo_cliente)) {
      const err = new Error(`Tipo de cliente inválido: "${tipo_cliente}". Informe 'PF' ou 'PJ'.`);
      err.status = 400;
      throw err;
    }

    // 4. Validar vendedor existente e ATIVO
    const [vendedores] = await pool.execute(
      'SELECT id_vendedor, nome, percentual_base, ativo FROM vendedores WHERE id_vendedor = ?',
      [id_vendedor]
    );
    if (vendedores.length === 0) {
      const err = new Error(`Vendedor com ID ${id_vendedor} não encontrado.`);
      err.status = 404;
      throw err;
    }
    const vendedor = vendedores[0];
    if (!vendedor.ativo) {
      const err = new Error(`Não é possível registrar venda: o vendedor "${vendedor.nome}" está desativado.`);
      err.status = 400;
      throw err;
    }

    // 5. Validar região existente
    const [regioes] = await pool.execute(
      'SELECT id_regiao, nome_regiao, percentual_bonus FROM regioes WHERE id_regiao = ?',
      [id_regiao]
    );
    if (regioes.length === 0) {
      const err = new Error(`Região com ID ${id_regiao} não encontrada.`);
      err.status = 400;
      throw err;
    }
    const regiao = regioes[0];

    // 6. Calcular comissão usando a regra centralizada
    const calculo = calcularComissao({
      valor_venda: valor,
      percentual_base: vendedor.percentual_base,
      tipo_cliente,
      percentual_bonus_regiao: regiao.percentual_bonus
    });

    const dataFinal = data_venda ? new Date(data_venda) : new Date();
    if (isNaN(dataFinal.getTime())) {
      const err = new Error('Data da venda inválida. Utilize o formato YYYY-MM-DD ou ISO.');
      err.status = 400;
      throw err;
    }

    // 7. Inserir venda com query parametrizada
    let idGerado = id_venda;
    if (id_venda !== undefined && id_venda !== null) {
      await pool.execute(
        `INSERT INTO vendas (id_venda, id_vendedor, id_regiao, data_venda, valor_venda, tipo_cliente, valor_comissao)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id_venda, id_vendedor, id_regiao, dataFinal, valor, tipo_cliente, calculo.valor_comissao]
      );
    } else {
      const [insertResult] = await pool.execute(
        `INSERT INTO vendas (id_vendedor, id_regiao, data_venda, valor_venda, tipo_cliente, valor_comissao)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id_vendedor, id_regiao, dataFinal, valor, tipo_cliente, calculo.valor_comissao]
      );
      idGerado = insertResult.insertId;
    }

    return {
      id_venda: idGerado,
      id_vendedor,
      nome_vendedor: vendedor.nome,
      id_regiao,
      nome_regiao: regiao.nome_regiao,
      data_venda: dataFinal.toISOString(),
      valor_venda: valor,
      tipo_cliente,
      taxa_comissao_detalhe: {
        percentual_base: Number(vendedor.percentual_base),
        percentual_cliente: calculo.percentual_cliente,
        percentual_regiao: calculo.percentual_regiao,
        percentual_total: calculo.percentual_total
      },
      valor_comissao: calculo.valor_comissao
    };
  } catch (erro) {
    if (!erro.status) console.error('Erro ao registrar venda:', erro.message);
    throw erro;
  }
}

/**
 * Lista todas as vendas cadastradas com informações de vendedor e região.
 */
async function listarVendas() {
  try {
    const query = `
      SELECT
        v.id_venda,
        v.data_venda,
        v.valor_venda,
        v.tipo_cliente,
        v.valor_comissao,
        ven.id_vendedor,
        ven.nome AS nome_vendedor,
        r.id_regiao,
        r.nome_regiao
      FROM vendas v
      INNER JOIN vendedores ven ON v.id_vendedor = ven.id_vendedor
      INNER JOIN regioes r ON v.id_regiao = r.id_regiao
      ORDER BY v.data_venda DESC, v.id_venda DESC
    `;
    const [linhas] = await pool.execute(query);
    return linhas;
  } catch (erro) {
    console.error('Erro ao listar vendas:', erro.message);
    throw erro;
  }
}

/**
 * Consulta vendas filtradas por vendedor.
 */
async function consultarVendasPorVendedor(id_vendedor) {
  try {
    await consultarVendedorPorId(id_vendedor);

    const query = `
      SELECT
        v.id_venda,
        v.data_venda,
        v.valor_venda,
        v.tipo_cliente,
        v.valor_comissao,
        v.id_vendedor,
        ven.nome AS nome_vendedor,
        v.id_regiao,
        r.nome_regiao
      FROM vendas v
      INNER JOIN vendedores ven ON v.id_vendedor = ven.id_vendedor
      INNER JOIN regioes r ON v.id_regiao = r.id_regiao
      WHERE v.id_vendedor = ?
      ORDER BY v.data_venda DESC
    `;
    const [linhas] = await pool.execute(query, [id_vendedor]);
    return linhas;
  } catch (erro) {
    if (!erro.status) console.error('Erro ao consultar vendas por vendedor:', erro.message);
    throw erro;
  }
}

/**
 * Consulta vendas filtradas por região.
 */
async function consultarVendasPorRegiao(id_regiao) {
  try {
    const [regioes] = await pool.execute('SELECT id_regiao, nome_regiao FROM regioes WHERE id_regiao = ?', [id_regiao]);
    if (regioes.length === 0) {
      const err = new Error(`Região com ID ${id_regiao} não encontrada.`);
      err.status = 404;
      throw err;
    }

    const query = `
      SELECT
        v.id_venda,
        v.data_venda,
        v.valor_venda,
        v.tipo_cliente,
        v.valor_comissao,
        v.id_vendedor,
        ven.nome AS nome_vendedor,
        v.id_regiao,
        r.nome_regiao
      FROM vendas v
      INNER JOIN vendedores ven ON v.id_vendedor = ven.id_vendedor
      INNER JOIN regioes r ON v.id_regiao = r.id_regiao
      WHERE v.id_regiao = ?
      ORDER BY v.data_venda DESC
    `;
    const [linhas] = await pool.execute(query, [id_regiao]);
    return linhas;
  } catch (erro) {
    if (!erro.status) console.error('Erro ao consultar vendas por região:', erro.message);
    throw erro;
  }
}

/**
 * Exclui uma venda após verificar previamente a sua existência.
 */
async function excluirVenda(id_venda) {
  try {
    const [vendas] = await pool.execute('SELECT id_venda, valor_venda FROM vendas WHERE id_venda = ?', [id_venda]);
    if (vendas.length === 0) {
      const err = new Error(`Venda com ID ${id_venda} não encontrada para exclusão.`);
      err.status = 404;
      throw err;
    }

    await pool.execute('DELETE FROM vendas WHERE id_venda = ?', [id_venda]);

    return {
      id_venda: Number(id_venda),
      mensagem: `Venda ${id_venda} excluída com sucesso.`
    };
  } catch (erro) {
    if (!erro.status) console.error('Erro ao excluir venda:', erro.message);
    throw erro;
  }
}

/**
 * Gera relatório gerencial e analítico de performance comercial no período informado.
 * Utiliza SQL com JOIN, GROUP BY, SUM(), AVG() e COUNT().
 */
async function gerarRelatorioPerformance({ inicio, fim }) {
  try {
    if (!inicio || !fim) {
      const err = new Error('Os parâmetros "inicio" e "fim" são obrigatórios (formato YYYY-MM-DD).');
      err.status = 400;
      throw err;
    }

    // Garante que o fim cubra o dia inteiro caso passe apenas data
    const dataInicio = `${inicio.split('T')[0]} 00:00:00`;
    const dataFim = `${fim.split('T')[0]} 23:59:59`;

    // 1. Totalizadores gerais (COUNT, SUM, AVG)
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

    // 2. Vendas e comissões por região (JOIN + GROUP BY + SUM + AVG + COUNT)
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

    // 4. Melhor vendedor em valor total vendido (JOIN + GROUP BY + SUM + ORDER BY LIMIT 1)
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

    // 5. Maior comissão acumulada (JOIN + GROUP BY + SUM + ORDER BY LIMIT 1)
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

    // 6. Metas atingidas pelos vendedores no período (LEFT JOIN + GROUP BY + SUM)
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
  cadastrarVendedor,
  listarVendedores,
  consultarVendedorPorId,
  atualizarVendedor,
  desativarVendedor,
  registrarVenda,
  listarVendas,
  consultarVendasPorVendedor,
  consultarVendasPorRegiao,
  excluirVenda,
  gerarRelatorioPerformance,
  calcularComissao
};
