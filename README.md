# API REST - Controle de Vendas e Comissões (Parte 3)

API em Node.js com Express e MySQL para controle de vendedores, registro de vendas com cálculo automático de comissão e relatório de metas e performance.

Faz parte da avaliação de Back-End (Parte 3).

---

## Como rodar o projeto

### 1. Instalar dependências e preparar o ambiente
```bash
npm install
cp .env.example .env
```

As variáveis padrão no `.env` já apontam para `localhost:3306` com usuário e senha `root`.

### 2. Subir o MySQL (se não tiver rodando local)
Se quiser usar o Docker:
```bash
docker compose up -d
```

### 3. Criar as tabelas e popular o banco
Rode o script que cria o banco `db_vendas` e já insere os vendedores, regiões e as 16 vendas de teste:
```bash
npm run seed
```

### 4. Iniciar a API
```bash
# Modo normal:
npm start

# Modo desenvolvimento (com auto-reload):
npm run dev
```
A API roda em `http://localhost:3000`.

---

## Testes automatizados

Para rodar a bateria de testes que valida os requisitos da prova:
```bash
npm test
```

O teste sobe um servidor temporário e valida:
1. Carga inicial (mínimo de 5 vendedores e 15 vendas nas 4 regiões e tipos PF/PJ).
2. Cadastro de vendedor e cálculo exato de comissão na venda.
3. Bloqueio de código de venda duplicado (HTTP 400).
4. Bloqueio de venda para vendedor inexistente (HTTP 404) e vendedor inativo (HTTP 400).
5. Atualização de meta/comissão e desativação de vendedor (soft-delete).
6. Consultas de vendas filtradas por vendedor e por região.
7. Relatório gerencial com cálculo de metas atingidas, médias e agrupamentos SQL.
8. Exclusão de venda com checagem de existência.

---

## Regra de cálculo da comissão

A comissão soma a taxa base do vendedor aos bônus da operação:
- **Base:** percentual definido no cadastro do vendedor (ex: 5%)
- **Bônus Cliente:** PF ganha +2%, PJ ganha +3%
- **Bônus Região:** Norte +1%, Nordeste +1%, Sudeste +0%, Sul +0.5%

Taxa final = base + bonus_cliente + bonus_regiao
Valor da comissão = valor_venda * (taxa_final / 100)

**Exemplo:**
Venda de R$ 2.000,00 para cliente PJ na região Norte por um vendedor com base de 5%:
- Taxa = 5% + 3% (PJ) + 1% (Norte) = 9%
- Comissão = R$ 2.000,00 * 9% = R$ 180,00

---

## Estrutura de pastas

O projeto segue arquitetura em camadas (routes -> controllers -> services):

```text
├── database.sql              # DDL e DML do MySQL
├── docker-compose.yml        # MySQL 8 em container
├── insomnia_collection.json  # Workspace pronto pro Insomnia / Postman
├── src/
│   ├── app.js                # Setup do Express e middlewares
│   ├── server.js             # Inicialização do servidor HTTP
│   ├── seed.js               # Script para rodar o database.sql via Node
│   ├── funcoes.js            # Export central das funções obrigatórias da prova
│   ├── config/
│   │   └── db.js             # Pool de conexões do MySQL2
│   ├── controllers/          # Trata requisição e resposta HTTP
│   │   ├── vendedores.controller.js
│   │   ├── vendas.controller.js
│   │   └── relatorios.controller.js
│   ├── routes/               # Definição dos endpoints REST
│   │   ├── vendedores.routes.js
│   │   ├── vendas.routes.js
│   │   ├── relatorios.routes.js
│   │   └── index.js
│   ├── services/             # Regras de negócio e queries SQL parametrizadas
│   │   ├── comissao.service.js
│   │   ├── vendedores.service.js
│   │   ├── vendas.service.js
│   │   └── relatorios.service.js
│   └── middlewares/
│       └── errorHandler.js   # Captura central de erros da API
└── test/
    └── test-runner.js        # Bateria de testes automatizados
```

---

## Endpoints da API

### Vendedores

- **POST /vendedores**
  Cadastra um vendedor.
  Exemplo de body:
  ```json
  {
    "nome": "Carlos Silva",
    "meta_mensal": 50000.00,
    "percentual_base": 5.00
  }
  ```
  Retorna 201 com os dados do vendedor criado.

- **GET /vendedores**
  Lista vendedores. Aceita filtro opcional: `?ativo=true` ou `?ativo=false`.

- **GET /vendedores/:id**
  Consulta um vendedor pelo código. Retorna 404 se não achar.

- **PUT /vendedores/:id**
  Atualiza meta mensal, percentual base ou nome. Retorna 200 com os dados atualizados.

- **PATCH /vendedores/:id/desativar**
  Desativa o vendedor (`ativo = 0`) para não deixar fazer novas vendas, mantendo o histórico das vendas antigas intacto.

### Vendas

- **POST /vendas**
  Registra uma venda. Valida se o vendedor existe e está ativo, se a região existe, se o valor é positivo e calcula a comissão na hora.
  Exemplo de body:
  ```json
  {
    "id_vendedor": 1,
    "id_regiao": 1,
    "data_venda": "2026-10-25 10:00:00",
    "valor_venda": 2000.00,
    "tipo_cliente": "PJ"
  }
  ```
  Retorna 201 com o cálculo detalhado e o ID gerado.

- **GET /vendas**
  Lista todas as vendas com dados do vendedor e da região (via JOIN).

- **GET /vendas/vendedor/:id**
  Retorna apenas as vendas daquele vendedor.

- **GET /vendas/regiao/:id**
  Retorna as vendas da região informada (1: Norte, 2: Nordeste, 3: Sudeste, 4: Sul).

- **DELETE /vendas/:id**
  Verifica se a venda existe e remove do banco. Retorna 404 caso não encontre.

### Relatórios

- **GET /relatorios/performance?inicio=YYYY-MM-DD&fim=YYYY-MM-DD**
  Consolida os indicadores de vendas do período diretamente via SQL (`JOIN`, `GROUP BY`, `SUM`, `AVG`, `COUNT`):
  - Total e valor total vendido
  - Vendas por região e por tipo de cliente (PF/PJ)
  - Vendedor com maior faturamento
  - Vendedor com maior comissão acumulada
  - Vendedores ativos que bateram a meta mensal
  - Média de comissão geral e média por região

---

## Importar no Insomnia / Postman

Basta importar o arquivo `insomnia_collection.json` que está na raiz. Ele já vem com todas as rotas e exemplos prontos para rodar contra `http://localhost:3000`.
