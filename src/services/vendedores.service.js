const pool = require('../config/db');

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

async function atualizarVendedor(id_vendedor, { meta_mensal, percentual_base, nome }) {
  try {
    await consultarVendedorPorId(id_vendedor);

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

module.exports = {
  cadastrarVendedor,
  listarVendedores,
  consultarVendedorPorId,
  atualizarVendedor,
  desativarVendedor
};
