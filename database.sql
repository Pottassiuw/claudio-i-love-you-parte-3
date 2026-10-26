-- =====================================================================
-- Sistema de Vendas com Comissões, Metas e Performance
-- Script DDL & DML (MySQL 8+)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS db_vendas;
USE db_vendas;

-- Desativa checagem de FK para recriação limpa caso executado novamente
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS vendas;
DROP TABLE IF EXISTS vendedores;
DROP TABLE IF EXISTS regioes;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 1. Tabela: regioes
-- ---------------------------------------------------------------------
CREATE TABLE regioes (
    id_regiao INT AUTO_INCREMENT PRIMARY KEY,
    nome_regiao VARCHAR(50) NOT NULL UNIQUE,
    percentual_bonus DECIMAL(5,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. Tabela: vendedores
-- ---------------------------------------------------------------------
CREATE TABLE vendedores (
    id_vendedor INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    meta_mensal DECIMAL(12,2) NOT NULL,
    percentual_base DECIMAL(5,2) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. Tabela: vendas
-- ---------------------------------------------------------------------
CREATE TABLE vendas (
    id_venda INT AUTO_INCREMENT PRIMARY KEY,
    id_vendedor INT NOT NULL,
    id_regiao INT NOT NULL,
    data_venda DATETIME NOT NULL,
    valor_venda DECIMAL(12,2) NOT NULL,
    tipo_cliente ENUM('PF', 'PJ') NOT NULL,
    valor_comissao DECIMAL(12,2) NOT NULL,
    CONSTRAINT fk_vendas_vendedor FOREIGN KEY (id_vendedor) REFERENCES vendedores(id_vendedor) ON DELETE RESTRICT,
    CONSTRAINT fk_vendas_regiao FOREIGN KEY (id_regiao) REFERENCES regioes(id_regiao) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- Inserção de Dados Iniciais / Testes Obrigatórios
-- =====================================================================

-- Regiões oficiais com seus respectivos bônus
INSERT INTO regioes (id_regiao, nome_regiao, percentual_bonus) VALUES
(1, 'Norte', 1.00),
(2, 'Nordeste', 1.00),
(3, 'Sudeste', 0.00),
(4, 'Sul', 0.50);

-- Vendedores (mínimo 5 exigidos, cadastrados 6 com metas e bases distintas)
INSERT INTO vendedores (id_vendedor, nome, meta_mensal, percentual_base, ativo) VALUES
(1, 'Carlos Silva', 50000.00, 5.00, 1),
(2, 'Mariana Souza', 40000.00, 4.50, 1),
(3, 'Roberto Santos', 60000.00, 6.00, 1),
(4, 'Juliana Oliveira', 35000.00, 4.00, 1),
(5, 'Lucas Ferreira', 45000.00, 5.50, 1),
(6, 'Ana Paula Lima', 30000.00, 3.50, 0); -- Vendedora inativa para testes de validação

-- 16 Vendas distribuídas entre as 4 regiões, clientes PF e PJ no mês de Outubro/2026
-- Regra de comissão: valor_venda * (base + bonus_cliente + bonus_regiao) / 100
-- PF: +2%, PJ: +3% | Norte: +1%, Nordeste: +1%, Sudeste: +0%, Sul: +0.5%
INSERT INTO vendas (id_venda, id_vendedor, id_regiao, data_venda, valor_venda, tipo_cliente, valor_comissao) VALUES
(1,  1, 3, '2026-10-02 10:15:00', 15000.00, 'PJ', 1200.00), -- Carlos: 5% + PJ(3%) + Sudeste(0%) = 8% => 1200.00
(2,  1, 3, '2026-10-05 14:30:00', 10000.00, 'PF',  700.00), -- Carlos: 5% + PF(2%) + Sudeste(0%) = 7% => 700.00
(3,  1, 1, '2026-10-10 11:20:00', 30000.00, 'PJ', 2700.00), -- Carlos: 5% + PJ(3%) + Norte(1%) = 9% => 2700.00
(4,  2, 2, '2026-10-03 09:00:00', 20000.00, 'PJ', 1700.00), -- Mariana: 4.5% + PJ(3%) + Nordeste(1%) = 8.5% => 1700.00
(5,  2, 2, '2026-10-08 16:45:00', 12000.00, 'PF',  900.00), -- Mariana: 4.5% + PF(2%) + Nordeste(1%) = 7.5% => 900.00
(6,  2, 3, '2026-10-15 13:10:00', 15000.00, 'PF',  975.00), -- Mariana: 4.5% + PF(2%) + Sudeste(0%) = 6.5% => 975.00
(7,  3, 4, '2026-10-04 10:00:00', 25000.00, 'PJ', 2375.00), -- Roberto: 6% + PJ(3%) + Sul(0.5%) = 9.5% => 2375.00
(8,  3, 3, '2026-10-11 15:30:00', 18000.00, 'PJ', 1620.00), -- Roberto: 6% + PJ(3%) + Sudeste(0%) = 9% => 1620.00
(9,  3, 1, '2026-10-18 17:00:00', 12000.00, 'PF', 1080.00), -- Roberto: 6% + PF(2%) + Norte(1%) = 9% => 1080.00
(10, 4, 4, '2026-10-06 11:00:00',  8000.00, 'PF',  520.00), -- Juliana: 4% + PF(2%) + Sul(0.5%) = 6.5% => 520.00
(11, 4, 2, '2026-10-12 14:00:00', 14000.00, 'PJ', 1120.00), -- Juliana: 4% + PJ(3%) + Nordeste(1%) = 8% => 1120.00
(12, 4, 3, '2026-10-20 09:30:00', 16000.00, 'PF',  960.00), -- Juliana: 4% + PF(2%) + Sudeste(0%) = 6% => 960.00
(13, 5, 1, '2026-10-07 10:30:00', 22000.00, 'PJ', 2090.00), -- Lucas: 5.5% + PJ(3%) + Norte(1%) = 9.5% => 2090.00
(14, 5, 4, '2026-10-14 16:15:00',  9000.00, 'PF',  720.00), -- Lucas: 5.5% + PF(2%) + Sul(0.5%) = 8% => 720.00
(15, 5, 2, '2026-10-22 11:45:00', 11000.00, 'PF',  935.00), -- Lucas: 5.5% + PF(2%) + Nordeste(1%) = 8.5% => 935.00
(16, 1, 4, '2026-10-24 15:00:00',  5000.00, 'PJ',  425.00); -- Carlos: 5% + PJ(3%) + Sul(0.5%) = 8.5% => 425.00
