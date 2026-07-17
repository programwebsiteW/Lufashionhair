const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const clientesRoutes = require('./routes/clientes');
const servicosRoutes = require('./routes/servicos');
const agendamentosRoutes = require('./routes/agendamentos');

const app = express();

app.use(helmet());
app.use(express.json());

// Só o domínio do frontend dela pode chamar a API
const origensPermitidas = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || origensPermitidas.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pelo CORS.'));
    }
  }
}));

app.get('/', (req, res) => {
  res.json({ status: 'API da Agenda da Luciane no ar.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/servicos', servicosRoutes);
app.use('/api/agendamentos', agendamentosRoutes);

// Tratamento de erro genérico (evita vazar detalhes internos)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ erro: 'Algo deu errado. Tente novamente.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
