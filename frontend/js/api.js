const API_URL = 'https://agenda-luciane-api.onrender.com/api';

function getToken() {
  return localStorage.getItem('token');
}

async function apiFetch(caminho, opcoes = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(opcoes.headers || {})
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let resposta;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, { ...opcoes, headers });
  } catch (_) {
    throw new Error('Não foi possível conectar ao sistema. Aguarde um minuto e tente novamente.');
  }

  if (resposta.status === 401) {
    localStorage.removeItem('token');
    location.reload();
    throw new Error('Sua sessão terminou. Entre novamente.');
  }

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.erro || 'Erro na requisição.');
  return dados;
}

const api = {
  login: (email, senha) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) }),

  listarAgendamentos: (data) => apiFetch(`/agendamentos?data=${data}`),
  listarAgendamentosPeriodo: (inicio, fim) => apiFetch(`/agendamentos?inicio=${inicio}&fim=${fim}`),
  criarAgendamento: (dados) => apiFetch('/agendamentos', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarAgendamento: (id, dados) => apiFetch(`/agendamentos/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  excluirAgendamento: (id) => apiFetch(`/agendamentos/${id}`, { method: 'DELETE' }),

  listarClientes: (busca = '') => apiFetch(`/clientes${busca ? `?busca=${encodeURIComponent(busca)}` : ''}`),
  criarCliente: (dados) => apiFetch('/clientes', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarCliente: (id, dados) => apiFetch(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  excluirCliente: (id) => apiFetch(`/clientes/${id}`, { method: 'DELETE' }),

  listarServicos: () => apiFetch('/servicos'),
  criarServico: (dados) => apiFetch('/servicos', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarServico: (id, dados) => apiFetch(`/servicos/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  excluirServico: (id) => apiFetch(`/servicos/${id}`, { method: 'DELETE' })
};
