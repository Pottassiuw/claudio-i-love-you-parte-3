const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function rodarSeed() {
  console.log('Iniciando carga de dados no MySQL...');

  // Conecta primeiro sem selecionar banco para poder criar caso não exista
  const conexao = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    multipleStatements: true
  });

  try {
    const caminhoSql = path.join(__dirname, '..', 'database.sql');
    const sql = fs.readFileSync(caminhoSql, 'utf-8');

    await conexao.query(sql);
    console.log('✓ Banco `db_vendas`, tabelas e dados de seed criados com sucesso!');
  } catch (erro) {
    console.error('✗ Erro ao executar seed:', erro.message);
    process.exit(1);
  } finally {
    await conexao.end();
  }
}

rodarSeed();
