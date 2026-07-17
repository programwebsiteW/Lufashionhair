const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../db/pool');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { erro: 'Muitas tentativas de login. Tente novamente em alguns minutos.' }
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Informe email e senha.' });
  }

  try {
    const resultado = await pool.query('SELECT * FROM admin_user WHERE email = $1', [email]);
    const usuario = resultado.rows[0];

    if (!usuario) {
      return res.status(401).json({ erro: 'Email ou senha incorretos.' });
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.password_hash);
    if (!senhaConfere) {
      return res.status(401).json({ erro: 'Email ou senha incorretos.' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, nome: usuario.nome },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ token, nome: usuario.nome });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro no servidor. Tente novamente.' });
  }
});

module.exports = router;
