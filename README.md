# Sistema de Vendas com Comissões, Metas e Performance (Parte 3)

API REST desenvolvida em **Node.js** com **Express** e **MySQL 8** (`mysql2/promise`) para gerenciamento de vendedores, registro de vendas com cálculo dinâmico de comissões por regras regionais/tipo de cliente, acompanhamento de metas e relatórios gerenciais de desempenho comercial.

Projeto desenvolvido para a Avaliação Prática de Back-End (Parte 3).

---

## 🚀 Tecnologias Utilizadas

- **Runtime:** Node.js (v18+)
- **Framework Web:** Express
- **Banco de Dados:** MySQL 8.0 / MariaDB
- **Driver de Conexão:** `mysql2/promise` (com Connection Pooling e consultas parametrizadas contra SQL Injection)
- **Configuração:** `dotenv`
- **Ambiente Containerizado:** Docker & Docker Compose

---

## 📁 Estrutura do Projeto

```text
claudio-i-love-you-parte-3/
├── database.sql              # Script DDL/DML (criação do banco, tabelas, FKs e seed inicial)
├── docker-compose.yml        # Subida rápida de instância do MySQL 8
├── insomnia_collection.json  # Coleção pronta para importar no Insomnia / Postman
├── package.json              # Dependências e scripts npm
├── .env.example              # Modelo de variáveis de ambiente
├── src/
│   ├── app.js                # Configuração do Express, middlewares e rotas REST
│   ├── db.js                 # Pool de conexões do MySQL2 com suporte a Promises
│   ├── funcoes.js            # Funções assíncronas obrigatórias de negócio e SQL
│   ├── regras.js             # Lógica pura de cálculo de comissão e bônus
│   ├── seed.js               # Script utilitário para popular o banco via Node
│   └── server.js             # Inicialização do servidor HTTP na porta configurada
└── test/
    └── test-runner.js        # Bateria de testes automatizados ponta a ponta
```

---

## ⚙️ Como Executar o Projeto

### 1. Pré-requisitos
- Node.js instalado (v18 ou superior).
- MySQL em execução localmente **OU** Docker instalado.

### 2. Clonar e instalar dependências
```bash
git clone https://github.com/Pottassiuw/claudio-i-love-you-parte-3.git
cd claudio-i-love-you-parte-3
npm install
```

### 3. Configurar variáveis de ambiente
Copie o arquivo de exemplo:
```bash
cp .env.example .env
```
Por padrão, o `.env` vem configurado para conectar em `localhost:3306` com usuário `root` e senha `root`. Ajuste se seu MySQL usar credenciais diferentes:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=db_vendas
```

### 4. Subir o MySQL (opcional, via Docker)
Se quiser rodar o MySQL em container isolado:
```bash
docker compose up -d
```

### 5. Criar as tabelas e carregar os dados iniciais (Seed)
Execute o script de seed para criar o banco `db_vendas`, as tabelas com chaves estrangeiras e os registros iniciais (6 vendedores, 4 regiões e 16 vendas):
```bash
npm run seed
```
*(Você também pode importar o arquivo `database.sql` diretamente pelo DBeaver, MySQL Workbench ou CLI).*

### 6. Iniciar a API
```bash
# Modo padrão:
npm start

# Modo desenvolvimento (com auto-reload):
npm run dev
```
A API estará pronta em `http://localhost:3000`.

---

## 🧮 Regras de Negócio e Cálculo de Comissões

A comissão total de cada venda é calculada de forma linear somando o percentual base do vendedor aos bônus aplicáveis (sem composição de juros sobre juros):

$$\text{Percentual Total} = \text{Percentual Base} + \text{Bônus Cliente} + \text{Bônus Região}$$
$$\text{Comissão (R\$)} = \text{Valor da Venda} \times \left(\frac{\text{Percentual Total}}{100}\right)$$

### 1. Bônus por Tipo de Cliente
| Tipo de Cliente | Descrição | Bônus Adicional |
| :--- | :--- | :--- |
| **PF** | Pessoa Física | +2,00% |
| **PJ** | Pessoa Jurídica | +3,00% |

### 2. Bônus por Região
| Região | Bônus Adicional |
| :--- | :--- |
| **Norte** | +1,00% |
| **Nordeste** | +1,00% |
| **Sudeste** | +0,00% |
| **Sul** | +0,50% |

### 💡 Exemplo Prático (conforme especificação)
Uma venda de **R$ 2.000,00** para cliente **PJ** na região **Norte**, por um vendedor com comissão base de **5,0%**:
- Base: 5,0%
- Bônus PJ: +3,0%
- Bônus Norte: +1,0%
- **Taxa total:** 5% + 3% + 1% = **9,0%**
- **Comissão final:** R$ 2.000,00 × 9% = **R$ 180,00**.

Essa lógica foi isolada na função pura `calcularComissao()` em `src/regras.js`, evitando duplicação em qualquer parte da aplicação.

---

## 📡 Endpoints da API REST

### Vendedores

#### `POST /vendedores`
Cadastra um novo vendedor.
- **Body:**
```json
{
  "nome": "Carlos Silva",
  "meta_mensal": 50000.00,
  "percentual_base": 5.00
}
```
- **Retorno (201 Created):**
```json
{
  "id_vendedor": 1,
  "nome": "Carlos Silva",
  "meta_mensal": 50000.00,
  "percentual_base": 5.00,
  "ativo": true
}
```

#### `GET /vendedores`
Lista todos os vendedores cadastrados. Aceita filtro opcional por status: `?ativo=true` ou `?ativo=false`.
- **Retorno (200 OK):** Array de vendedores.

#### `GET /vendedores/:id`
Busca dados de um vendedor específico pelo ID.
- **Retorno (200 OK):** Objeto do vendedor. Retorna `404` se não existir.

#### `PUT /vendedores/:id`
Atualiza meta mensal, percentual base e/ou nome do vendedor.
- **Body:**
```json
{
  "meta_mensal": 55000.00,
  "percentual_base": 5.50
}
```
- **Retorno (200 OK):** Objeto atualizado.

#### `PATCH /vendedores/:id/desativar`
Desativa o vendedor (**soft delete** com `ativo = 0`), preservando integralmente o histórico de vendas já realizadas no banco de dados.
- **Retorno (200 OK):**
```json
{
  "id_vendedor": 1,
  "ativo": false,
  "mensagem": "Vendedor 1 desativado com sucesso. Histórico de vendas preservado."
}
```

---

### Vendas

#### `POST /vendas`
Registra uma nova venda. Realiza validações estritas:
1. Verifica se o código da venda (caso enviado) já existe para evitar duplicidade.
2. Valida se o vendedor existe e está **ativo** (bloqueia vendas para vendedores desativados).
3. Valida se a região existe.
4. Garante que o valor da venda seja estritamente positivo (> 0).
5. Calcula automaticamente a comissão através de `calcularComissao()`.

- **Body:**
```json
{
  "id_vendedor": 1,
  "id_regiao": 1,
  "data_venda": "2026-10-25 10:30:00",
  "valor_venda": 2000.00,
  "tipo_cliente": "PJ"
}
```
- **Retorno (201 Created):**
```json
{
  "id_venda": 17,
  "id_vendedor": 1,
  "nome_vendedor": "Carlos Silva",
  "id_regiao": 1,
  "nome_regiao": "Norte",
  "data_venda": "2026-10-25T13:30:00.000Z",
  "valor_venda": 2000,
  "tipo_cliente": "PJ",
  "taxa_comissao_detalhe": {
    "percentual_base": 5,
    "percentual_cliente": 3,
    "percentual_regiao": 1,
    "percentual_total": 9
  },
  "valor_comissao": 180
}
```

#### `GET /vendas`
Lista todas as vendas com detalhes completos de vendedor e região via `INNER JOIN`.
- **Retorno (200 OK):** Array de vendas ordenado pelas mais recentes.

#### `GET /vendas/vendedor/:id`
Filtra o histórico de vendas de um vendedor específico.
- **Retorno (200 OK):** Lista de vendas do vendedor informado.

#### `GET /vendas/regiao/:id`
Filtra as vendas realizadas em uma região específica (1: Norte, 2: Nordeste, 3: Sudeste, 4: Sul).
- **Retorno (200 OK):** Lista de vendas da região.

#### `DELETE /vendas/:id`
Exclui uma venda após verificar previamente a sua existência no banco.
- **Retorno (200 OK):** Confirmação de exclusão ou `404` caso a venda não seja localizada.

---

### Relatório Gerencial de Performance

#### `GET /relatorios/performance?inicio=YYYY-MM-DD&fim=YYYY-MM-DD`
Gera a consolidação analítica e gerencial das vendas realizadas no período especificado.

Todas as métricas são extraídas diretamente pelo MySQL utilizando `JOIN`, `GROUP BY`, `SUM()`, `AVG()`, `COUNT()` e arredondamentos:

1. **Total de vendas:** Contagem total de transações e volume financeiro vendido/comissionado.
2. **Vendas por região:** Total em R$, comissões geradas e média por venda em cada uma das 4 regiões.
3. **Vendas por tipo de cliente:** Comparativo de faturamento entre transações PF e PJ.
4. **Melhor vendedor:** Vendedor com maior faturamento bruto no período.
5. **Maior comissão:** Vendedor com maior volume acumulado de comissões.
6. **Metas atingidas:** Lista comparativa de todos os vendedores ativos com meta mensal, total vendido no mês, percentual atingido e indicação booleana de atingimento.
7. **Comissão média geral:** Média aritmética da comissão paga por venda.
8. **Comissão média por região:** Média de comissão paga por transação em cada região.

- **Exemplo de Chamada:**
```bash
curl -X GET "http://localhost:3000/relatorios/performance?inicio=2026-10-01&fim=2026-10-31"
```

- **Exemplo de Retorno:**
```json
{
  "periodo": {
    "inicio": "2026-10-01",
    "fim": "2026-10-31"
  },
  "indicadores": {
    "total_vendas": 16,
    "valor_total_vendido": 242000.00,
    "valor_total_comissoes": 19690.00,
    "comissao_media_geral": 1230.63,
    "ticket_medio": 15125.00,
    "vendas_por_regiao": [
      {
        "id_regiao": 3,
        "regiao": "Sudeste",
        "quantidade_vendas": 5,
        "total_vendas": 74000.00,
        "total_comissao": 5455.00,
        "comissao_media": 1091.00
      },
      {
        "id_regiao": 1,
        "regiao": "Norte",
        "quantidade_vendas": 3,
        "total_vendas": 64000.00,
        "total_comissao": 5870.00,
        "comissao_media": 1956.67
      }
    ],
    "melhor_vendedor": {
      "id_vendedor": 1,
      "nome": "Carlos Silva",
      "total_vendido": 60000.00,
      "total_comissao": 5025.00
    },
    "maior_comissao": {
      "id_vendedor": 3,
      "nome": "Roberto Santos",
      "total_comissao": 5075.00,
      "total_vendido": 55000.00
    },
    "metas_atingidas": {
      "quantidade_vendedores_atingiram": 3,
      "total_vendedores_ativos": 5,
      "vendedores": [
        {
          "id_vendedor": 1,
          "nome": "Carlos Silva",
          "meta_mensal": 50000.00,
          "total_vendido": 60000.00,
          "percentual_atingido": 120.00,
          "atingiu_meta": true
        },
        {
          "id_vendedor": 2,
          "nome": "Mariana Souza",
          "meta_mensal": 40000.00,
          "total_vendido": 47000.00,
          "percentual_atingido": 117.50,
          "atingiu_meta": true
        },
        {
          "id_vendedor": 4,
          "nome": "Juliana Oliveira",
          "meta_mensal": 35000.00,
          "total_vendido": 38000.00,
          "percentual_atingido": 108.57,
          "atingiu_meta": true
        },
        {
          "id_vendedor": 3,
          "nome": "Roberto Santos",
          "meta_mensal": 60000.00,
          "total_vendido": 55000.00,
          "percentual_atingido": 91.67,
          "atingiu_meta": false
        },
        {
          "id_vendedor": 5,
          "nome": "Lucas Ferreira",
          "meta_mensal": 45000.00,
          "total_vendido": 42000.00,
          "percentual_atingido": 93.33,
          "atingiu_meta": false
        }
      ]
    }
  }
}
```

---

## 🧪 Testes Automatizados

O projeto conta com uma suíte de testes ponta a ponta que valida automaticamente todos os cenários exigidos na avaliação:

```bash
npm test
```

### Cenários cobertos pelos testes:
- [x] **Carga inicial:** Validação de no mínimo 5 vendedores e 15 vendas distribuídas pelas 4 regiões e tipos PF/PJ.
- [x] **Cadastro e regras de cálculo:** Criação de vendedor e registro de venda com verificação matemática exata da comissão.
- [x] **Código duplicado:** Bloqueio de código de venda já existente retornando status HTTP `400 Bad Request`.
- [x] **Vendedor inexistente e inativo:** Tentativa de venda para vendedor inexistente (HTTP `404`) e vendedor inativo (HTTP `400`).
- [x] **Atualização e desativação:** Atualização de meta/comissão (`PUT`) e soft-delete (`PATCH /desativar`).
- [x] **Filtros e consultas:** Busca de vendas filtradas por ID de vendedor e por ID de região.
- [x] **Relatório de performance:** Cálculo determinístico dos 8 indicadores analíticos de vendas e conferência de metas atingidas.
- [x] **Exclusão:** Exclusão de venda após checagem de existência (`DELETE`), retornando `404` para ID inexistente.

---

## 📮 Coleção Insomnia / Postman

O arquivo `insomnia_collection.json` na raiz do repositório pode ser importado diretamente no **Insomnia** ou convertido no **Postman**. Ele contém todas as rotas pré-configuradas com exemplos de requisições prontos para envio.
