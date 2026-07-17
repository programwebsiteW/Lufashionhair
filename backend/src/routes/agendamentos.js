const express = require('express');
const pool = require('../db/pool');
const autenticar = require('../middleware/autenticar');

const router = express.Router();
router.use(autenticar);

router.get('/', async (req, res) => {
  const { data, inicio, fim } = req.query;
  try {
    let resultado;
    if (data) {
      resultado = await pool.query(
        'SELECT * FROM agendamentos WHERE data = $1 ORDER BY hora',
        [data]
      );
    } else if (inicio && fim) {
      resultado = await pool.query(
        'SELECT * FROM agendamentos WHERE data BETWEEN $1 AND $2 ORDER BY data, hora',
        [inicio, fim]
      );
    } else {
      resultado = await pool.query('SELECT * FROM agendamentos ORDER BY data, hora');
    }
    res.json(resultado.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar agendamentos.' });
  }
});

router.post('/', async (req, res) => {
  const { cliente_id, cliente_nome, servico_id, servico_nome, data, hora, observacoes } = req.body;

  if (!cliente_nome || !servico_nome || !data || !hora) {
    return res.status(400).json({ erro: 'Preencha cliente, serviço, data e hora.' });
  }

  try {
    const conflito = await pool.query(
      'SELECT id FROM agendamentos WHERE data = $1 AND hora = $2 AND status != $3',
      [data, hora, 'cancelado']
    );
    if (conflito.rows.length > 0) {
      return res.status(409).json({ erro: 'Já existe um agendamento nesse horário.' });
    }

    const resultado = await pool.query(
      `INSERT INTO agendamentos (cliente_id, cliente_nome, servico_id, servico_nome, data, hora, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [cliente_id || null, cliente_nome, servico_id || null, servico_nome, data, hora, observacoes || null]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar agendamento.' });
  }
});

router.put('/:id', async (req, res) => {
  const { cliente_nome, servico_nome, data, hora, status, observacoes } = req.body;
  try {
    const resultado = await pool.query(
      `UPDATE agendamentos
       SET cliente_nome = $1, servico_nome = $2, data = $3, hora = $4, status = $5, observacoes = $6
       WHERE id = $7 RETURNING *`,
      [cliente_nome, servico_nome, data, hora, status || 'agendado', observacoes || null, req.params.id]
    );
    if (resultado.rows.length === 0) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar agendamento.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM agendamentos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao excluir agendamento.' });
  }
});

module.exports = router;
