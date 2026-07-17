let clientesCache = [];
let servicosCache = [];

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const senha = document.getElementById('login-senha').value;
  const erroEl = document.getElementById('login-erro');
  erroEl.textContent = '';

  try {
    const { token } = await api.login(email, senha);
    localStorage.setItem('token', token);
    entrarNoPainel();
  } catch (err) {
    erroEl.textContent = err.message;
  }
});

document.getElementById('btn-sair').addEventListener('click', () => {
  localStorage.removeItem('token');
  location.reload();
});

function entrarNoPainel() {
  document.getElementById('tela-login').classList.add('oculto');
  document.getElementById('painel').classList.remove('oculto');
  const hoje = new Date().toISOString().slice(0, 10);
  document.getElementById('filtro-data').value = hoje;
  carregarAgenda(hoje);
  carregarClientes();
  carregarServicos();
}

if (getToken()) entrarNoPainel();

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('ativo'));
    document.querySelectorAll('.tela').forEach(t => t.classList.add('oculto'));
    btn.classList.add('ativo');
    document.getElementById(`tela-${btn.dataset.tela}`).classList.remove('oculto');
  });
});

const modalFundo = document.getElementById('modal-fundo');
function abrirModal(titulo, corpoHtml) {
  document.getElementById('modal-titulo').textContent = titulo;
  document.getElementById('modal-corpo').innerHTML = corpoHtml;
  modalFundo.classList.remove('oculto');
}
function fecharModal() { modalFundo.classList.add('oculto'); }
modalFundo.addEventListener('click', (e) => { if (e.target === modalFundo) fecharModal(); });

document.getElementById('filtro-data').addEventListener('change', (e) => carregarAgenda(e.target.value));

async function carregarAgenda(data) {
  const lista = document.getElementById('lista-agendamentos');
  lista.innerHTML = '<p class="vazio">Carregando...</p>';
  try {
    const agendamentos = await api.listarAgendamentos(data);
    if (agendamentos.length === 0) {
      lista.innerHTML = '<p class="vazio">Nenhum agendamento nesse dia.</p>';
      return;
    }
    lista.innerHTML = agendamentos.map(ag => `
      <div class="item-card ${ag.status}">
        <div class="hora-destaque">${ag.hora.slice(0,5)}</div>
        <div class="item-info">
          <strong>${ag.cliente_nome}</strong>
