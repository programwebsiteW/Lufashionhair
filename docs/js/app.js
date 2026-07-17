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
  diaSelecionado = hoje;
  carregarCalendario();
  carregarClientes();
  carregarServicos();
}

if (getToken()) setTimeout(entrarNoPainel, 0);

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

document.getElementById('filtro-data').addEventListener('change', (e) => {
  diaSelecionado = e.target.value;
  carregarAgenda(e.target.value);
  desenharCalendario();
});

let mesAtual = new Date();
let diaSelecionado = new Date().toISOString().slice(0, 10);
let agendamentosDoMes = [];

const nomesMeses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const nomesDias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function dataLocal(ano, mes, dia) {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

async function carregarCalendario() {
  const inicio = dataLocal(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
  const fimData = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0);
  const fim = dataLocal(fimData.getFullYear(), fimData.getMonth(), fimData.getDate());
  try {
    agendamentosDoMes = await api.listarAgendamentosPeriodo(inicio, fim);
    desenharCalendario();
  } catch (err) {
    document.getElementById('calendario').innerHTML = `<p class="vazio">${err.message}</p>`;
  }
}

function desenharCalendario() {
  const calendario = document.getElementById('calendario');
  document.getElementById('mes-label').textContent = `${nomesMeses[mesAtual.getMonth()]} de ${mesAtual.getFullYear()}`;
  const primeiro = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
  const ultimo = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0);
  let html = nomesDias.map(dia => `<div class="dia-semana">${dia}</div>`).join('');
  for (let i = 0; i < primeiro.getDay(); i++) html += '<div class="dia-cel vazio-mes"></div>';
  for (let dia = 1; dia <= ultimo.getDate(); dia++) {
    const data = dataLocal(mesAtual.getFullYear(), mesAtual.getMonth(), dia);
    const quantidade = agendamentosDoMes.filter(ag => String(ag.data).slice(0, 10) === data).length;
    const hoje = data === new Date().toISOString().slice(0, 10);
    html += `<div class="dia-cel ${hoje ? 'hoje' : ''} ${data === diaSelecionado ? 'selecionado' : ''}" onclick="selecionarDia('${data}')"><span class="numero-dia">${dia}</span>${quantidade ? `<span class="contador-dia">${quantidade} serviço${quantidade > 1 ? 's' : ''}</span>` : ''}</div>`;
  }
  calendario.innerHTML = html;
}

function selecionarDia(data) {
  diaSelecionado = data;
  document.getElementById('filtro-data').value = data;
  carregarAgenda(data);
  desenharCalendario();
}

document.getElementById('mes-anterior').addEventListener('click', () => {
  mesAtual.setMonth(mesAtual.getMonth() - 1);
  carregarCalendario();
});

document.getElementById('mes-proximo').addEventListener('click', () => {
  mesAtual.setMonth(mesAtual.getMonth() + 1);
  carregarCalendario();
});

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
          <span>${ag.servico_nome} ${ag.observacoes ? '· ' + ag.observacoes : ''}</span>
        </div>
        <div class="acoes">
          ${ag.status === 'agendado' ? `<button onclick="marcarStatus(${ag.id}, 'concluido')" title="Concluir">✅</button>` : ''}
          ${ag.status === 'agendado' ? `<button onclick="marcarStatus(${ag.id}, 'cancelado')" title="Cancelar">🚫</button>` : ''}
          <button onclick="excluirAgendamento(${ag.id})" title="Excluir">🗑️</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    lista.innerHTML = `<p class="vazio">${err.message}</p>`;
  }
}

async function marcarStatus(id, status) {
  const data = document.getElementById('filtro-data').value;
  const agendamentos = await api.listarAgendamentos(data);
  const ag = agendamentos.find(a => a.id === id);
  if (!ag) return;
  await api.atualizarAgendamento(id, { ...ag, status });
  carregarAgenda(data);
}

async function excluirAgendamento(id) {
  if (!confirm('Excluir esse agendamento?')) return;
  await api.excluirAgendamento(id);
  carregarAgenda(document.getElementById('filtro-data').value);
}

document.getElementById('btn-novo-agendamento').addEventListener('click', async () => {
  if (clientesCache.length === 0) clientesCache = await api.listarClientes();
  if (servicosCache.length === 0) servicosCache = await api.listarServicos();
  const data = document.getElementById('filtro-data').value;

  abrirModal('Novo agendamento', `
    <input list="lista-nomes-clientes" id="ag-cliente" placeholder="Nome do cliente">
    <datalist id="lista-nomes-clientes">
      ${clientesCache.map(c => `<option value="${c.nome}">`).join('')}
    </datalist>
    <select id="ag-servico">
      <option value="">Selecione o serviço</option>
      ${servicosCache.map(s => `<option value="${s.nome}">${s.nome}</option>`).join('')}
    </select>
    <input type="date" id="ag-data" value="${data}">
    <input type="time" id="ag-hora">
    <textarea id="ag-obs" placeholder="Observações (opcional)"></textarea>
    <div class="modal-botoes">
      <button class="btn-cancelar" onclick="fecharModal()">Cancelar</button>
      <button class="btn-confirmar" onclick="salvarAgendamento()">Salvar</button>
    </div>
  `);
});

async function salvarAgendamento() {
  const cliente_nome = document.getElementById('ag-cliente').value.trim();
  const servico_nome = document.getElementById('ag-servico').value;
  const data = document.getElementById('ag-data').value;
  const hora = document.getElementById('ag-hora').value;
  const observacoes = document.getElementById('ag-obs').value.trim();

  if (!cliente_nome || !servico_nome || !data || !hora) {
    alert('Preencha cliente, serviço, data e hora.');
    return;
  }

  try {
    await api.criarAgendamento({ cliente_nome, servico_nome, data, hora, observacoes });
    fecharModal();
    document.getElementById('filtro-data').value = data;
    carregarAgenda(data);
  } catch (err) {
    alert(err.message);
  }
}

document.getElementById('busca-cliente').addEventListener('input', (e) => carregarClientes(e.target.value));

async function carregarClientes(busca = '') {
  const lista = document.getElementById('lista-clientes');
  try {
    clientesCache = await api.listarClientes(busca);
    if (clientesCache.length === 0) {
      lista.innerHTML = '<p class="vazio">Nenhum cliente cadastrado.</p>';
      return;
    }
    lista.innerHTML = clientesCache.map(c => `
      <div class="item-card">
        <div class="item-info">
          <strong>${c.nome}</strong>
          <span>${c.telefone || 'sem telefone'} ${c.observacoes ? '· ' + c.observacoes : ''}</span>
        </div>
        <div class="acoes">
          <button onclick="excluirCliente(${c.id})" title="Excluir">🗑️</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    lista.innerHTML = `<p class="vazio">${err.message}</p>`;
  }
}

async function excluirCliente(id) {
  if (!confirm('Excluir esse cliente?')) return;
  await api.excluirCliente(id);
  carregarClientes();
}

document.getElementById('btn-novo-cliente').addEventListener('click', () => {
  abrirModal('Novo cliente', `
    <input id="cli-nome" placeholder="Nome">
    <input id="cli-telefone" placeholder="Telefone">
    <textarea id="cli-obs" placeholder="Observações (opcional)"></textarea>
    <div class="modal-botoes">
      <button class="btn-cancelar" onclick="fecharModal()">Cancelar</button>
      <button class="btn-confirmar" onclick="salvarCliente()">Salvar</button>
    </div>
  `);
});

async function salvarCliente() {
  const nome = document.getElementById('cli-nome').value.trim();
  const telefone = document.getElementById('cli-telefone').value.trim();
  const observacoes = document.getElementById('cli-obs').value.trim();
  if (!nome) { alert('Informe o nome.'); return; }

  try {
    await api.criarCliente({ nome, telefone, observacoes });
    fecharModal();
    carregarClientes();
  } catch (err) {
    alert(err.message);
  }
}

async function carregarServicos() {
  const lista = document.getElementById('lista-servicos');
  try {
    servicosCache = await api.listarServicos();
    if (servicosCache.length === 0) {
      lista.innerHTML = '<p class="vazio">Nenhum serviço cadastrado.</p>';
      return;
    }
    lista.innerHTML = servicosCache.map(s => `
      <div class="item-card">
        <div class="item-info">
          <strong>${s.nome}</strong>
          <span>${s.duracao_minutos} min ${s.preco ? '· R$ ' + Number(s.preco).toFixed(2) : ''}</span>
        </div>
        <div class="acoes">
          <button onclick="excluirServico(${s.id})" title="Excluir">🗑️</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    lista.innerHTML = `<p class="vazio">${err.message}</p>`;
  }
}

async function excluirServico(id) {
  if (!confirm('Excluir esse serviço?')) return;
  await api.excluirServico(id);
  carregarServicos();
}

document.getElementById('btn-novo-servico').addEventListener('click', () => {
  abrirModal('Novo serviço', `
    <input id="serv-nome" placeholder="Nome do serviço">
    <input id="serv-duracao" type="number" placeholder="Duração em minutos" value="60">
    <input id="serv-preco" type="number" step="0.01" placeholder="Preço (opcional)">
    <div class="modal-botoes">
      <button class="btn-cancelar" onclick="fecharModal()">Cancelar</button>
      <button class="btn-confirmar" onclick="salvarServico()">Salvar</button>
    </div>
  `);
});

async function salvarServico() {
  const nome = document.getElementById('serv-nome').value.trim();
  const duracao_minutos = parseInt(document.getElementById('serv-duracao').value) || 60;
  const preco = document.getElementById('serv-preco').value || null;
  if (!nome) { alert('Informe o nome do serviço.'); return; }

  try {
    await api.criarServico({ nome, duracao_minutos, preco });
    fecharModal();
    carregarServicos();
  } catch (err) {
    alert(err.message);
  }
}
