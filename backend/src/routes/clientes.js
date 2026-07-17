const express = require('express');
const pool = require('../db/pool');
const autenticar = require('../middleware/autenticar');

const router = express.Router();
router.use(autenticar);

router.get('/', async (req, res) => {
  const { busca } = req.query;
  try {
    const resultado = busca
      ? await pool.query('SELECT * FROM clientes WHERE nome ILIKE $1 ORDER BY nome', [`%${busca}%`])
      : await pool.query('SELECT * FROM clientes ORDER BY nome');
    res.json(resultado.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar clientes.' });
  }
});

router.post('/', async (req, res) => {
  const { nome, telefone, observacoes } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });

  try {
    const resultado = await pool.query(
      'INSERT INTO clientes (nome, telefone, observacoes) VALUES ($1, $2, $3) RETURNING *',
      [nome, telefone || null, observacoes || null]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar cliente.' });
  }
});

router.put('/:id', async (req, res) => {
  const { nome, telefone, observacoes } = req.body;
  try {
    const resultado = await pool.query(
      'UPDATE clientes SET nome = $1, telefone = $2, observacoes = $3 WHERE id = $4 RETURNING *',
      [nome, telefone || null, observacoes || null, req.params.id]
    );
    if (resultado.rows.length === 0) return res.status(404).json({ erro: 'Cliente não encontrado.' });
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar cliente.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clientes WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao excluir cliente.' });
  }
});

module.exports = router;
