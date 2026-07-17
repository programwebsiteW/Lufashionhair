# Agenda da Luciane 💜

Sistema de agenda para controle de horários de cabelo, manicure e pedicure.

## Estrutura
- `backend/` — API em Node.js + Express + PostgreSQL
- `frontend/` — Painel web (HTML/CSS/JS puro) em tons de lilás

## Como acessar
Só existe **um login** (o da Luciane). Ninguém mais consegue acessar sem
email e senha corretos, e todas as rotas da agenda exigem o token de login.

## Rodando local
```bash
cd backend
npm install
cp .env.example .env   # preencha com seus dados
npm run migrate        # cria as tabelas
npm run create-admin   # cria o login da Luciane (usa ADMIN_EMAIL/ADMIN_PASSWORD do .env)
npm run dev             # sobe a API em localhost:3000
```

Depois abra `frontend/index.html` no navegador (ou use a extensão Live Server do VS Code).

## Publicando

### 1. Banco de dados (Render)
1. No Render, crie um **PostgreSQL** novo.
2. Copie a **External Database URL**.

### 2. Backend (Render)
1. Suba a pasta `backend` num repositório GitHub.
2. No Render, crie um **Web Service** apontando pro repositório.
3. Configure as variáveis de ambiente (mesmas do `.env.example`):
   `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
4. Build command: `npm install`
5. Start command: `npm start`
6. Depois do primeiro deploy, rode uma vez (Render Shell):
   `npm run migrate && npm run create-admin`

### 3. Frontend
1. Troque a linha `API_URL` em `frontend/js/api.js` pela URL do backend no Render.
2. Suba o frontend no GitHub Pages, Netlify ou Vercel — todos gratuitos.
3. Coloque a URL do frontend na variável `FRONTEND_URL` do backend (pro CORS liberar o acesso).

## Segurança
- Senha da Luciane fica guardada com hash (bcrypt), nunca em texto puro.
- Login libera um token (JWT) que expira em 12h.
- Toda rota de clientes, serviços e agendamentos exige esse token — sem ele, a API recusa o acesso.
- Limite de tentativas de login pra evitar ataque de força bruta.
