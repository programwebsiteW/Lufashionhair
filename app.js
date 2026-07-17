<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Agenda • Luciane</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css">
</head>
<body>

<!-- TELA DE LOGIN -->
<div id="tela-login" class="tela-login">
  <div class="card-login">
    <h1>Agenda <span>Luciane</span></h1>
    <p class="subtitulo">Cabelo · Manicure · Pedicure</p>
    <form id="form-login">
      <input type="email" id="login-email" placeholder="Email" required>
      <input type="password" id="login-senha" placeholder="Senha" required>
      <button type="submit">Entrar</button>
      <p class="erro" id="login-erro"></p>
    </form>
  </div>
</div>

<!-- PAINEL -->
<div id="painel" class="painel oculto">
  <aside class="menu-lateral">
    <h2>Agenda <span>Luciane</span></h2>
    <nav>
      <button class="nav-btn ativo" data-tela="agenda">📅 Agenda</button>
      <button class="nav-btn" data-tela="clientes">👤 Clientes</button>
      <button class="nav-btn" data-tela="servicos">💅 Serviços</button>
    </nav>
    <button id="btn-sair" class="btn-sair">Sair</button>
  </aside>

  <main class="conteudo">

    <!-- AGENDA -->
    <section id="tela-agenda" class="tela">
      <div class="cabecalho">
        <h3>Agenda do dia</h3>
        <input type="date" id="filtro-data">
        <button id="btn-novo-agendamento" class="btn-primario">+ Novo agendamento</button>
      </div>
      <div id="lista-agendamentos" class="lista"></div>
    </section>

    <!-- CLIENTES -->
    <section id="tela-clientes" class="tela oculto">
      <div class="cabecalho">
        <h3>Clientes</h3>
        <input type="text" id="busca-cliente" placeholder="Buscar cliente...">
        <button id="btn-novo-cliente" class="btn-primario">+ Novo cliente</button>
      </div>
      <div id="lista-clientes" class="lista"></div>
    </section>

    <!-- SERVIÇOS -->
    <section id="tela-servicos" class="tela oculto">
      <div class="cabecalho">
        <h3>Serviços</h3>
        <button id="btn-novo-servico" class="btn-primario">+ Novo serviço</button>
      </div>
      <div id="lista-servicos" class="lista"></div>
    </section>

  </main>
</div>

<!-- MODAL genérico -->
<div id="modal-fundo" class="modal-fundo oculto">
  <div class="modal">
    <h3 id="modal-titulo"></h3>
    <div id="modal-corpo"></div>
  </div>
</div>

<script src="js/api.js"></script>
<script src="js/app.js"></script>
</body>
</html>
