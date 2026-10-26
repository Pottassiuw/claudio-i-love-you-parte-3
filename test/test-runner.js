const http = require('http');
const app = require('../src/app');
const pool = require('../src/db');

let server;
let baseUrl;

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FALHA NA ASSERÇÃO: ${message}`);
  }
}

async function runTests() {
  console.log('=================================================================');
  console.log('INICIANDO SUÍTE DE TESTES OBRIGATÓRIOS (AVALIAÇÃO PARTE 3)');
  console.log('=================================================================\n');

  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✓ Servidor de testes inicializado em ${baseUrl}\n`);

  let testesPassados = 0;

  try {
    // -----------------------------------------------------------------
    // Teste 1: Verificar se os dados iniciais contêm no mínimo 5 vendedores e 15 vendas
    // -----------------------------------------------------------------
    console.log('1. Verificando dados iniciais no banco (mínimo 5 vendedores e 15 vendas)...');
    const resVendedores = await request('/vendedores');
    assert(resVendedores.status === 200, 'Status GET /vendedores deve ser 200');
    assert(resVendedores.data.length >= 5, `Deveria ter >= 5 vendedores, encontrou ${resVendedores.data.length}`);

    const resVendas = await request('/vendas');
    assert(resVendas.status === 200, 'Status GET /vendas deve ser 200');
    assert(resVendas.data.length >= 15, `Deveria ter >= 15 vendas, encontrou ${resVendas.data.length}`);
    console.log(`   ✓ Vendedores carregados: ${resVendedores.data.length}`);
    console.log(`   ✓ Vendas carregadas: ${resVendas.data.length}`);
    testesPassados++;

    // -----------------------------------------------------------------
    // Teste 2: Cadastro de novo vendedor e registro de venda com comissão correta
    // -----------------------------------------------------------------
    console.log('\n2. Cadastrando novo vendedor e registrando venda com validação de comissão...');
    const novoVendedorPayload = {
      nome: 'Teste Automação',
      meta_mensal: 25000.00,
      percentual_base: 5.00
    };
    const resCadVendedor = await request('/vendedores', {
      method: 'POST',
      body: JSON.stringify(novoVendedorPayload)
    });
    assert(resCadVendedor.status === 201, 'Status POST /vendedores deve ser 201');
    const idNovoVendedor = resCadVendedor.data.id_vendedor;
    assert(idNovoVendedor > 0, 'ID do novo vendedor deve ser gerado');
    console.log(`   ✓ Vendedor criado com ID: ${idNovoVendedor}`);

    // Venda de R$ 2.000,00 | Região Norte (id 1, bonus 1%) | Tipo PJ (bonus 3%) | Base (5%)
    // Esperado: 5 + 3 + 1 = 9% de comissão => R$ 180,00
    const resNovaVenda = await request('/vendas', {
      method: 'POST',
      body: JSON.stringify({
        id_vendedor: idNovoVendedor,
        id_regiao: 1, // Norte
        data_venda: '2026-10-25 15:00:00',
        valor_venda: 2000.00,
        tipo_cliente: 'PJ'
      })
    });
    assert(resNovaVenda.status === 201, 'Status POST /vendas deve ser 201');
    assert(resNovaVenda.data.valor_comissao === 180.00, `Comissão esperada: 180.00, obtida: ${resNovaVenda.data.valor_comissao}`);
    assert(resNovaVenda.data.taxa_comissao_detalhe.percentual_total === 9.00, 'Percentual total esperado: 9%');
    console.log(`   ✓ Venda registrada: R$ 2.000,00 com 9% = R$ ${resNovaVenda.data.valor_comissao}`);
    testesPassados++;

    // -----------------------------------------------------------------
    // Teste 3: Tentativa de venda com código duplicado
    // -----------------------------------------------------------------
    console.log('\n3. Testando tentativa de venda com código duplicado...');
    const idExistente = resNovaVenda.data.id_venda;
    const resDuplicado = await request('/vendas', {
      method: 'POST',
      body: JSON.stringify({
        id_venda: idExistente,
        id_vendedor: idNovoVendedor,
        id_regiao: 1,
        valor_venda: 1000.00,
        tipo_cliente: 'PF'
      })
    });
    assert(resDuplicado.status === 400, `Esperado 400 para venda duplicada, obteve ${resDuplicado.status}`);
    assert(resDuplicado.data.erro.includes('duplicado'), 'Mensagem de erro deve acusar duplicidade');
    console.log(`   ✓ Bloqueio de código duplicado validado com sucesso (HTTP 400)`);
    testesPassados++;

    // -----------------------------------------------------------------
    // Teste 4: Tentativa de venda para vendedor inexistente ou inativo
    // -----------------------------------------------------------------
    console.log('\n4. Testando tentativa de venda para vendedor inexistente e vendedor inativo...');
    // Vendedor inexistente
    const resInexistente = await request('/vendas', {
      method: 'POST',
      body: JSON.stringify({
        id_vendedor: 999999,
        id_regiao: 1,
        valor_venda: 500.00,
        tipo_cliente: 'PF'
      })
    });
    assert(resInexistente.status === 404, `Esperado 404 para vendedor inexistente, obteve ${resInexistente.status}`);

    // Vendedor inativo (cadastrado no seed como Ana Paula, id 6)
    const resInativo = await request('/vendas', {
      method: 'POST',
      body: JSON.stringify({
        id_vendedor: 6,
        id_regiao: 1,
        valor_venda: 500.00,
        tipo_cliente: 'PF'
      })
    });
    assert(resInativo.status === 400, `Esperado 400 para vendedor inativo, obteve ${resInativo.status}`);
    assert(resInativo.data.erro.includes('desativado'), 'Mensagem de erro deve informar que o vendedor está desativado');
    console.log(`   ✓ Bloqueios de vendedor inexistente (HTTP 404) e inativo (HTTP 400) validados`);
    testesPassados++;

    // -----------------------------------------------------------------
    // Teste 5: Atualização de meta mensal e desativação
    // -----------------------------------------------------------------
    console.log('\n5. Testando atualização de meta mensal e desativação de vendedor...');
    const resUpdate = await request(`/vendedores/${idNovoVendedor}`, {
      method: 'PUT',
      body: JSON.stringify({
        meta_mensal: 35000.00,
        percentual_base: 6.00
      })
    });
    assert(resUpdate.status === 200, 'Status PUT /vendedores/:id deve ser 200');
    assert(resUpdate.data.meta_mensal === 35000.00, 'Meta atualizada com sucesso');
    assert(resUpdate.data.percentual_base === 6.00, 'Percentual atualizado com sucesso');

    // Desativar vendedor
    const resDesativa = await request(`/vendedores/${idNovoVendedor}/desativar`, {
      method: 'PATCH'
    });
    assert(resDesativa.status === 200, 'Status PATCH /vendedores/:id/desativar deve ser 200');
    assert(resDesativa.data.ativo === false, 'Vendedor deve constar como inativo');
    console.log(`   ✓ Meta mensal atualizada para R$ 35.000,00 e vendedor desativado com sucesso`);
    testesPassados++;

    // -----------------------------------------------------------------
    // Teste 6: Consultas de vendas por região e por vendedor
    // -----------------------------------------------------------------
    console.log('\n6. Testando consultas por região e por vendedor...');
    const resVendasPorVendedor = await request('/vendas/vendedor/1');
    assert(resVendasPorVendedor.status === 200, 'Status GET /vendas/vendedor/1 deve ser 200');
    assert(resVendasPorVendedor.data.length > 0, 'Deve retornar vendas do vendedor 1');
    assert(resVendasPorVendedor.data.every(v => v.id_vendedor === 1), 'Todas as vendas devem ser do vendedor 1');

    const resVendasPorRegiao = await request('/vendas/regiao/3'); // Sudeste
    assert(resVendasPorRegiao.status === 200, 'Status GET /vendas/regiao/3 deve ser 200');
    assert(resVendasPorRegiao.data.length > 0, 'Deve retornar vendas da região Sudeste');
    assert(resVendasPorRegiao.data.every(v => v.id_regiao === 3), 'Todas as vendas devem ser da região 3');
    console.log(`   ✓ Vendas do vendedor 1: ${resVendasPorVendedor.data.length}`);
    console.log(`   ✓ Vendas da região 3 (Sudeste): ${resVendasPorRegiao.data.length}`);
    testesPassados++;

    // -----------------------------------------------------------------
    // Teste 7: Relatório de performance gerencial com metas e indicadores
    // -----------------------------------------------------------------
    console.log('\n7. Testando relatório gerencial de performance comercial...');
    const resRelatorio = await request('/relatorios/performance?inicio=2026-10-01&fim=2026-10-31');
    assert(resRelatorio.status === 200, 'Status GET /relatorios/performance deve ser 200');
    const { indicadores } = resRelatorio.data;
    assert(indicadores.total_vendas > 0, 'Total de vendas deve ser maior que 0');
    assert(indicadores.vendas_por_regiao.length === 4, 'Deve conter indicadores para as 4 regiões');
    assert(indicadores.vendas_por_tipo_cliente.length === 2, 'Deve conter indicadores para PF e PJ');
    assert(indicadores.melhor_vendedor !== null, 'Deve identificar o melhor vendedor');
    assert(indicadores.maior_comissao !== null, 'Deve identificar o vendedor com maior comissão');
    assert(indicadores.metas_atingidas.quantidade_vendedores_atingiram > 0, 'Deve identificar atingimento de metas');
    console.log(`   ✓ Total de Vendas no período: ${indicadores.total_vendas} vendas`);
    console.log(`   ✓ Volume Financeiro Total: R$ ${indicadores.valor_total_vendido.toLocaleString('pt-BR')}`);
    console.log(`   ✓ Melhor Vendedor: ${indicadores.melhor_vendedor.nome} (R$ ${indicadores.melhor_vendedor.total_vendido.toLocaleString('pt-BR')})`);
    console.log(`   ✓ Vendedores que atingiram a meta: ${indicadores.metas_atingidas.quantidade_vendedores_atingiram} de ${indicadores.metas_atingidas.total_vendedores_ativos}`);
    testesPassados++;

    // -----------------------------------------------------------------
    // Teste 8: Exclusão de venda
    // -----------------------------------------------------------------
    console.log('\n8. Testando exclusão de venda com verificação prévia de existência...');
    const resExcluirInexistente = await request('/vendas/999999', { method: 'DELETE' });
    assert(resExcluirInexistente.status === 404, 'Exclusão de venda inexistente deve retornar 404');

    const resExcluir = await request(`/vendas/${idExistente}`, { method: 'DELETE' });
    assert(resExcluir.status === 200, 'Exclusão de venda existente deve retornar 200');
    console.log(`   ✓ Venda excluída com sucesso`);
    testesPassados++;

    console.log('\n=================================================================');
    console.log(`TODOS OS ${testesPassados} TESTES PASSARAM COM SUCESSO DETERMINÍSTICO!`);
    console.log('=================================================================');
  } finally {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    await pool.end();
  }
}

runTests().catch(err => {
  console.error('\n✗ ERRO NA EXECUÇÃO DOS TESTES:', err.message);
  process.exit(1);
});
