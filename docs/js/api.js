const SUPABASE_URL = 'https://ezhaitxgmpqcgjramfiu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Kx-k_j73k-9ieXzERK94BQ_O9V6MiHW';
const SESSION_KEY = 'lu-fashion-hair-session';

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}

function getToken() {
  return getSession()?.access_token || '';
}

function salvarSessao(sessao) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessao));
}

function limparSessao() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('token');
}

function mensagemErro(dados, status) {
  if (status === 409 || dados?.code === '23505') return 'Já existe um atendimento nesse horário.';
  return dados?.msg || dados?.message || dados?.error_description || dados?.erro || 'Não foi possível concluir a operação.';
}

async function renovarSessao() {
  const atual = getSession();
  if (!atual?.refresh_token) return false;
  const resposta = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
    body: JSON.stringify({ refresh_token: atual.refresh_token })
  });
  if (!resposta.ok) { limparSessao(); return false; }
  salvarSessao(await resposta.json());
  return true;
}

async function supabaseFetch(caminho, opcoes = {}, tentouRenovar = false) {
  const token = getToken();
  const headers = {
    apikey: SUPABASE_KEY,
    'Content-Type': 'application/json',
    ...(opcoes.headers || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  let resposta;
  try {
    resposta = await fetch(`${SUPABASE_URL}${caminho}`, { ...opcoes, headers });
  } catch {
    throw new Error('Sem conexão. Confira a internet e tente novamente.');
  }
  if (resposta.status === 401 && token && !tentouRenovar && await renovarSessao()) {
    return supabaseFetch(caminho, opcoes, true);
  }
  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    if (resposta.status === 401) limparSessao();
    throw new Error(mensagemErro(dados, resposta.status));
  }
  return dados;
}

function limparAgendamento(item) {
  return {
    ...item,
    servico_preco: item.servicos?.preco ?? null,
    cliente_telefone: item.clientes?.telefone ?? null,
    servicos: undefined,
    clientes: undefined
  };
}

function dadosAgendamento(dados) {
  return {
    cliente_id: dados.cliente_id || null,
    cliente_nome: dados.cliente_nome,
    servico_id: dados.servico_id || null,
    servico_nome: dados.servico_nome,
    data: dados.data,
    hora: dados.hora,
    status: dados.status || 'agendado',
    observacoes: dados.observacoes || null,
    updated_at: new Date().toISOString()
  };
}

const api = {
  login: async (email, senha) => {
    const sessao = await supabaseFetch('/auth/v1/token?grant_type=password', {
      method: 'POST', body: JSON.stringify({ email, password: senha })
    });
    salvarSessao(sessao);
    return { token: sessao.access_token, user: sessao.user };
  },
  logout: async () => {
    try { if (getToken()) await supabaseFetch('/auth/v1/logout', { method: 'POST' }); } catch {}
    limparSessao();
  },

  listarAgendamentos: async data => (await supabaseFetch(`/rest/v1/agendamentos?select=*,servicos(preco),clientes(telefone)&data=eq.${encodeURIComponent(data)}&order=hora.asc`)).map(limparAgendamento),
  listarAgendamentosPeriodo: async (inicio, fim) => (await supabaseFetch(`/rest/v1/agendamentos?select=*,servicos(preco),clientes(telefone)&data=gte.${encodeURIComponent(inicio)}&data=lte.${encodeURIComponent(fim)}&order=data.asc,hora.asc`)).map(limparAgendamento),
  criarAgendamento: dados => supabaseFetch('/rest/v1/agendamentos?select=*', { method:'POST', headers:{ Prefer:'return=representation' }, body:JSON.stringify(dadosAgendamento(dados)) }).then(lista => lista[0]),
  atualizarAgendamento: (id, dados) => supabaseFetch(`/rest/v1/agendamentos?id=eq.${Number(id)}&select=*`, { method:'PATCH', headers:{ Prefer:'return=representation' }, body:JSON.stringify(dadosAgendamento(dados)) }).then(lista => lista[0]),
  excluirAgendamento: id => supabaseFetch(`/rest/v1/agendamentos?id=eq.${Number(id)}`, { method:'DELETE' }),

  listarClientes: busca => supabaseFetch(`/rest/v1/clientes?select=*&ativo=eq.true${busca ? `&nome=ilike.*${encodeURIComponent(busca)}*` : ''}&order=nome.asc`),
  criarCliente: dados => supabaseFetch('/rest/v1/clientes?select=*', { method:'POST', headers:{ Prefer:'return=representation' }, body:JSON.stringify(dados) }).then(lista => lista[0]),
  atualizarCliente: (id, dados) => supabaseFetch(`/rest/v1/clientes?id=eq.${Number(id)}&select=*`, { method:'PATCH', headers:{ Prefer:'return=representation' }, body:JSON.stringify({ ...dados, updated_at:new Date().toISOString() }) }).then(lista => lista[0]),
  excluirCliente: id => supabaseFetch(`/rest/v1/clientes?id=eq.${Number(id)}`, { method:'PATCH', body:JSON.stringify({ ativo:false, updated_at:new Date().toISOString() }) }),

  listarServicos: () => supabaseFetch('/rest/v1/servicos?select=*&order=nome.asc'),
  criarServico: dados => supabaseFetch('/rest/v1/servicos?select=*', { method:'POST', headers:{ Prefer:'return=representation' }, body:JSON.stringify(dados) }).then(lista => lista[0]),
  atualizarServico: (id, dados) => supabaseFetch(`/rest/v1/servicos?id=eq.${Number(id)}&select=*`, { method:'PATCH', headers:{ Prefer:'return=representation' }, body:JSON.stringify({ nome:dados.nome, duracao_minutos:dados.duracao_minutos, preco:dados.preco, ativo:dados.ativo, updated_at:new Date().toISOString() }) }).then(lista => lista[0]),
  excluirServico: id => supabaseFetch(`/rest/v1/servicos?id=eq.${Number(id)}`, { method:'PATCH', body:JSON.stringify({ ativo:false, updated_at:new Date().toISOString() }) })
};
