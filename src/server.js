require('dotenv').config();
const app = require('./app');
const pool = require('./db');

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
  try {
    // Testa conectividade com o banco de dados
    const conexao = await pool.getConnection();
    console.log('✓ Conectado ao MySQL com sucesso.');
    conexao.release();

    app.listen(PORT, () => {
      console.log(`✓ Servidor rodando na porta ${PORT}`);
      console.log(`✓ Documentação e endpoints prontos para uso em http://localhost:${PORT}`);
    });
  } catch (erro) {
    console.error('✗ Falha crítica ao conectar com o MySQL:', erro.message);
    process.exit(1);
  }
}

iniciarServidor();
