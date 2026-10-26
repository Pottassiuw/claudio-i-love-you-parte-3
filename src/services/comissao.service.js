const BONUS_CLIENTE = {
  PF: 2.00,
  PJ: 3.00
};

const BONUS_REGIAO = {
  Norte: 1.00,
  Nordeste: 1.00,
  Sudeste: 0.00,
  Sul: 0.50
};

function calcularComissao({ valor_venda, percentual_base, tipo_cliente, percentual_bonus_regiao, nome_regiao }) {
  const valor = Number(valor_venda);
  const base = Number(percentual_base);

  if (isNaN(valor) || valor <= 0) {
    throw new Error('O valor da venda deve ser um número positivo.');
  }

  const bonusCliente = BONUS_CLIENTE[tipo_cliente];
  if (bonusCliente === undefined) {
    throw new Error(`Tipo de cliente inválido: ${tipo_cliente}. Use 'PF' ou 'PJ'.`);
  }

  let bonusRegiao = 0;
  if (percentual_bonus_regiao !== undefined && percentual_bonus_regiao !== null) {
    bonusRegiao = Number(percentual_bonus_regiao);
  } else if (nome_regiao && BONUS_REGIAO[nome_regiao] !== undefined) {
    bonusRegiao = BONUS_REGIAO[nome_regiao];
  }

  const percentualTotal = Number((base + bonusCliente + bonusRegiao).toFixed(2));
  const valorComissao = Number(((valor * percentualTotal) / 100).toFixed(2));

  return {
    percentual_total: percentualTotal,
    percentual_cliente: bonusCliente,
    percentual_regiao: bonusRegiao,
    valor_comissao: valorComissao
  };
}

module.exports = {
  BONUS_CLIENTE,
  BONUS_REGIAO,
  calcularComissao
};
