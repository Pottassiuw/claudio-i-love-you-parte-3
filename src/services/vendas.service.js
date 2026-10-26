const pool = require('../config/db');
const { calcularComissao } = require('./comissao.service');
const { consultarVendedorPorId } = require('./vendedores.service');

async function registrarVenda({
  id_venda,
  id_vendedor,
  id_regiao,
  data_venda,
  valor_venda,
  tipo_cliente
}) {
  try {
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

    const valor = Number(valor_venda);
    if (isNaN(valor) || valor <= 0) {
      const err = new Error('O valor da venda deve ser um número maior que zero.');
      err.status = 400;
      throw err;
    }

    if (!['PF', 'PJ'].includes(tipo_cliente)) {
      const err = new Error(`Tipo de cliente inválido: "${tipo_cliente}". Informe 'PF' ou 'PJ'.`);
      err.status = 400;
      throw err;
    }

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

    const [regioes] = await pool.execute(
      'SELECT id_regiao, nome_regiao, percentual_bonus FROM regioes WHERE id_regiao = ?',
      [id_regiao]
    );
    if (regioes.length === 0) {
      const err = new Error(`Região com ID ${id_regiao} não encontrada.`);
      err.status = 404;
      throw err;
    }
    const regiao = regioes[0];

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

module.exports = {
  registrarVenda,
  listarVendas,
  consultarVendasPorVendedor,
  consultarVendasPorRegiao,
  excluirVenda
};
