/**
 * Regras de comissão e bonificação do sistema
 */

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

/**
 * Calcula a comissão total de uma venda somando o percentual base com os bônus
 * de tipo de cliente e de região (sem composição/juros sobre juros).
 *
 * @param {Object} params
 * @param {number} params.valor_venda - Valor total da venda em R$
 * @param {number} params.percentual_base - Percentual base de comissão do vendedor (%)
 * @param {'PF'|'PJ'} params.tipo_cliente - Tipo do cliente
 * @param {number} [params.percentual_bonus_regiao] - Bônus da região em % (opcional se nome_regiao for fornecido)
 * @param {string} [params.nome_regiao] - Nome da região (opcional se percentual_bonus_regiao for fornecido)
 * @returns {{ percentual_total: number, valor_comissao: number, percentual_cliente: number, percentual_regiao: number }}
 */
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
