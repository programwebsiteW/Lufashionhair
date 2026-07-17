const express = require('express');
const pool = require('../db/pool');
const autenticar = require('../middleware/autenticar');

const router = express.Router();
router.use(autenticar);

router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM servicos ORDER BY nome');
    res.json(resultado.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar serviços.' });
  }
});

router.post('/', async (req, res) => {
  const { nome, duracao_minutos, preco } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome do serviço é obrigatório.' });

  try {
    const resultado = await pool.query(
      'INSERT INTO servicos (nome, duracao_minutos, preco) VALUES ($1, $2, $3) RETURNING *',
      [nome, duracao_minutos || 60, preco || null]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar serviço.' });
  }
});

router.put('/:id', async (req, res) => {
  const { nome, duracao_minutos, preco, ativo } = req.body;
  try {
    const resultado = await pool.query(
      'UPDATE servicos SET nome = $1, duracao_minutos = $2, preco = $3, ativo = $4 WHERE id = $5 RETURNING *',
      [nome, duracao_minutos || 60, preco || null, ativo !== undefined ? ativo : true, req.params.id]
    );
    if (resultado.rows.length === 0) return res.status(404).json({ erro: 'Serviço não encontrado.' });
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar serviço.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM servicos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao excluir serviço.' });
  }
});

module.exports = router;
