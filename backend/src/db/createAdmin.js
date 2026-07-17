const bcrypt = require('bcryptjs');
const pool = require('./pool');
require('dotenv').config();

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const senha = process.env.ADMIN_PASSWORD;

  if (!email || !senha) {
    console.error('Defina ADMIN_EMAIL e ADMIN_PASSWORD no arquivo .env antes de rodar isso.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(senha, 12);

  try {
    const existe = await pool.query('SELECT id FROM admin_user WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      await pool.query('UPDATE admin_user SET password_hash = $1 WHERE email = $2', [hash, email]);
      console.log('Senha atualizada para o usuário existente:', email);
    } else {
      await pool.query(
        'INSERT INTO admin_user (email, password_hash, nome) VALUES ($1, $2, $3)',
        [email, hash, 'Luciane']
      );
      console.log('Usuário admin criado com sucesso:', email);
    }
  } catch (err) {
    console.error('Erro ao criar admin:', err);
  } finally {
    await pool.end();
  }
}

createAdmin();
