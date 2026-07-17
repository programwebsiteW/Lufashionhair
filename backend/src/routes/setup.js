// Rota TEMPORÁRIA - roda a migração e cria o admin pela internet, sem precisar de terminal.
// IMPORTANTE: depois de usar uma vez, apague este arquivo e a linha dele em server.js.
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');

const router = express.Router();

const TABELAS_SQL = `
CREATE TABLE IF NOT EXISTS admin_user (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nome VARCHAR(255) DEFAULT 'Luciane',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(30),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS servicos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  duracao_minutos INTEGER NOT NULL DEFAULT 60,
  preco NUMERIC(10,2),
  ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS agendamentos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nome VARCHAR(255) NOT NULL,
  servico_id INTEGER REFERENCES servicos(id) ON DELETE SET NULL,
  servico_nome VARCHAR(255) NOT NULL,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'agendado',
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data);
`;

// Acesse: /api/setup?chave=SUA_CHAVE_SECRETA_AQUI
router.get('/', async (req, res) => {
  if (req.query.chave !== process.env.SETUP_KEY) {
    return res.status(403).json({ erro: 'Chave incorreta.' });
  }

  try {
    await pool.query(TABELAS_SQL);

    const email = process.env.ADMIN_EMAIL;
    const senha = process.env.ADMIN_PASSWORD;
    const hash = await bcrypt.hash(senha, 12);

    const existe = await pool.query('SELECT id FROM admin_user WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      await pool.query('UPDATE admin_user SET password_hash = $1 WHERE email = $2', [hash, email]);
    } else {
      await pool.query(
        'INSERT INTO admin_user (email, password_hash, nome) VALUES ($1, $2, $3)',
        [email, hash, 'Luciane']
      );
    }

    res.json({ ok: true, mensagem: 'Tabelas criadas e login configurado com sucesso! Pode apagar essa rota agora.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao configurar: ' + err.message });
  }
});

module.exports = router;
