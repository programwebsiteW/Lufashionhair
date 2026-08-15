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
        `SELECT a.*, s.preco AS servico_preco, c.telefone AS cliente_telefone
         FROM agendamentos a
         LEFT JOIN servicos s ON s.id = a.servico_id
         LEFT JOIN clientes c ON c.id = a.cliente_id
         WHERE a.data = $1 ORDER BY a.hora`,
        [data]
      );
    } else if (inicio && fim) {
      resultado = await pool.query(
        `SELECT a.*, s.preco AS servico_preco, c.telefone AS cliente_telefone
         FROM agendamentos a
         LEFT JOIN servicos s ON s.id = a.servico_id
         LEFT JOIN clientes c ON c.id = a.cliente_id
         WHERE a.data BETWEEN $1 AND $2 ORDER BY a.data, a.hora`,
        [inicio, fim]
      );
    } else {
      resultado = await pool.query(
        `SELECT a.*, s.preco AS servico_preco, c.telefone AS cliente_telefone
         FROM agendamentos a
         LEFT JOIN servicos s ON s.id = a.servico_id
         LEFT JOIN clientes c ON c.id = a.cliente_id
         ORDER BY a.data, a.hora`
      );
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
  const { cliente_id, cliente_nome, servico_id, servico_nome, data, hora, status, observacoes } = req.body;
  if (!cliente_nome || !servico_nome || !data || !hora) {
    return res.status(400).json({ erro: 'Preencha cliente, serviço, data e hora.' });
  }
  try {
    const conflito = await pool.query(
      'SELECT id FROM agendamentos WHERE data = $1 AND hora = $2 AND id != $3 AND status != $4',
      [data, hora, req.params.id, 'cancelado']
    );
    if (conflito.rows.length > 0) {
      return res.status(409).json({ erro: 'Já existe outro agendamento nesse horário.' });
    }
    const resultado = await pool.query(
      `UPDATE agendamentos
       SET cliente_id = $1, cliente_nome = $2, servico_id = $3, servico_nome = $4,
           data = $5, hora = $6, status = $7, observacoes = $8
       WHERE id = $9 RETURNING *`,
      [cliente_id || null, cliente_nome, servico_id || null, servico_nome, data, hora, status || 'agendado', observacoes || null, req.params.id]
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
