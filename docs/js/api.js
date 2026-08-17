const SUPABASE_URL = 'https://ezhaitxgmpqcgjramfiu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Kx-k_j73k-9ieXzERK94BQ_O9V6MiHW';
const SESSION_KEY = 'lu-fashion-hair-session';
const LOGIN_INTERNO = 'wesleygabriellewelgolf@gmail.com';

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}

function getToken() { return getSession()?.access_token || ''; }
function salvarSessao(sessao) { localStorage.setItem(SESSION_KEY, JSON.stringify(sessao)); }
function limparSessao() { localStorage.removeItem(SESSION_KEY); localStorage.removeItem('token'); }

function mensagemErro(dados, status) {
  const texto = dados?.message || dados?.msg || dados?.error_description || dados?.error || '';
  if (/invalid login credentials/i.test(texto)) return 'Usuário ou senha incorretos.';
  if (/email not confirmed/i.test(texto)) return 'Confirme o e-mail de acesso antes de entrar.';
  if (/duplicate key|conflicts with another|Esse horario conflita/i.test(texto)) return 'Esse horário está ocupado. Escolha outro horário.';
  if (status === 401) return 'Sua sessão terminou. Entre novamente.';
  if (status === 403) return 'Você não tem permissão para realizar esta ação.';
  return texto || 'Não foi possível concluir. Tente novamente.';
}

async function renovarSessao() {
  const sessao = getSession();
  if (!sessao?.refresh_token) return false;
  try {
    const resposta = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: sessao.refresh_token })
    });
    if (!resposta.ok) return false;
    salvarSessao(await resposta.json());
    return true;
  } catch { return false; }
}

async function supabaseFetch(caminho, opcoes = {}, tentouRenovar = false) {
  const token = getToken();
  const headers = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...(opcoes.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  let resposta;
  try { resposta = await fetch(`${SUPABASE_URL}${caminho}`, { ...opcoes, headers }); }
  catch { throw new Error('Sem conexão. Confira a internet e tente novamente.'); }
  if (resposta.status === 401 && token && !tentouRenovar && await renovarSessao()) return supabaseFetch(caminho, opcoes, true);
  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    if (resposta.status === 401) limparSessao();
    throw new Error(mensagemErro(dados, resposta.status));
  }
  return dados;
}

function normalizarLogin(valor) {
  const login = String(valor || '').trim().toLowerCase();
  return login === 'lufashionhair' ? LOGIN_INTERNO : login;
}

function pagamentoDoAgendamento(item) {
  return Array.isArray(item.pagamentos) ? item.pagamentos[0] || null : item.pagamentos || null;
}

function limparAgendamento(item) {
  return {
    ...item,
    cliente_telefone: item.clientes?.telefone ?? null,
    pagamento: pagamentoDoAgendamento(item),
    clientes: undefined,
    pagamentos: undefined
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
    duracao_minutos: Number(dados.duracao_minutos || 60),
    valor_servico: dados.valor_servico === '' || dados.valor_servico == null ? null : Number(dados.valor_servico),
    status: dados.status || 'agendado',
    observacoes: dados.observacoes || null,
    updated_at: new Date().toISOString()
  };
}

const AGENDAMENTO_SELECT = '*,clientes(telefone),pagamentos(*)';

const api = {
  login: async (usuario, senha) => {
    const sessao = await supabaseFetch('/auth/v1/token?grant_type=password', {
      method: 'POST', body: JSON.stringify({ email: normalizarLogin(usuario), password: senha })
    });
    salvarSessao(sessao);
    return { token: sessao.access_token, user: sessao.user };
  },
  logout: async () => {
    try { if (getToken()) await supabaseFetch('/auth/v1/logout', { method: 'POST' }); } catch {}
    limparSessao();
  },

  listarAgendamentos: async data => (await supabaseFetch(`/rest/v1/agendamentos?select=${AGENDAMENTO_SELECT}&data=eq.${encodeURIComponent(data)}&order=hora.asc`)).map(limparAgendamento),
  listarAgendamentosPeriodo: async (inicio, fim) => (await supabaseFetch(`/rest/v1/agendamentos?select=${AGENDAMENTO_SELECT}&data=gte.${encodeURIComponent(inicio)}&data=lte.${encodeURIComponent(fim)}&order=data.asc,hora.asc`)).map(limparAgendamento),
  criarAgendamento: dados => supabaseFetch('/rest/v1/agendamentos?select=*', { method:'POST', headers:{ Prefer:'return=representation' }, body:JSON.stringify(dadosAgendamento(dados)) }).then(lista => lista[0]),
  atualizarAgendamento: (id, dados) => supabaseFetch(`/rest/v1/agendamentos?id=eq.${Number(id)}&select=*`, { method:'PATCH', headers:{ Prefer:'return=representation' }, body:JSON.stringify(dadosAgendamento(dados)) }).then(lista => lista[0]),

  listarClientes: busca => supabaseFetch(`/rest/v1/clientes?select=*&deleted_at=is.null${busca ? `&nome=ilike.*${encodeURIComponent(busca)}*` : ''}&order=nome.asc`),
  listarLixeira: () => supabaseFetch('/rest/v1/clientes?select=*&deleted_at=not.is.null&order=deleted_at.desc'),
  criarCliente: dados => supabaseFetch('/rest/v1/clientes?select=*', { method:'POST', headers:{ Prefer:'return=representation' }, body:JSON.stringify(dados) }).then(lista => lista[0]),
  atualizarCliente: (id, dados) => supabaseFetch(`/rest/v1/clientes?id=eq.${Number(id)}&select=*`, { method:'PATCH', headers:{ Prefer:'return=representation' }, body:JSON.stringify({ ...dados, updated_at:new Date().toISOString() }) }).then(lista => lista[0]),
  moverClienteLixeira: id => supabaseFetch(`/rest/v1/clientes?id=eq.${Number(id)}`, { method:'PATCH', body:JSON.stringify({ deleted_at:new Date().toISOString(), ativo:false, updated_at:new Date().toISOString() }) }),
  restaurarCliente: id => supabaseFetch(`/rest/v1/clientes?id=eq.${Number(id)}`, { method:'PATCH', body:JSON.stringify({ deleted_at:null, ativo:true, updated_at:new Date().toISOString() }) }),
  excluirClienteAgora: id => supabaseFetch(`/rest/v1/clientes?id=eq.${Number(id)}`, { method:'DELETE' }),

  listarServicos: () => supabaseFetch('/rest/v1/servicos?select=*&order=nome.asc'),
  criarServico: dados => supabaseFetch('/rest/v1/servicos?select=*', { method:'POST', headers:{ Prefer:'return=representation' }, body:JSON.stringify(dados) }).then(lista => lista[0]),
  atualizarServico: (id, dados) => supabaseFetch(`/rest/v1/servicos?id=eq.${Number(id)}&select=*`, { method:'PATCH', headers:{ Prefer:'return=representation' }, body:JSON.stringify({ nome:dados.nome, duracao_minutos:dados.duracao_minutos, preco:dados.preco, ativo:true, updated_at:new Date().toISOString() }) }).then(lista => lista[0]),
  excluirServico: id => supabaseFetch(`/rest/v1/servicos?id=eq.${Number(id)}`, { method:'DELETE' }),
  excluirAgendamentosDoServico: id => supabaseFetch(`/rest/v1/agendamentos?servico_id=eq.${Number(id)}`, { method:'DELETE' }),
  excluirAgendamentosOrfaosPorNome: nome => supabaseFetch(`/rest/v1/agendamentos?servico_id=is.null&servico_nome=eq.${encodeURIComponent(nome)}`, { method:'DELETE' }),

  criarPagamento: dados => supabaseFetch('/rest/v1/pagamentos?select=*', { method:'POST', headers:{ Prefer:'return=representation' }, body:JSON.stringify(dados) }).then(lista => lista[0]),
  atualizarPagamento: (id, dados) => supabaseFetch(`/rest/v1/pagamentos?id=eq.${Number(id)}&select=*`, { method:'PATCH', headers:{ Prefer:'return=representation' }, body:JSON.stringify({ ...dados, updated_at:new Date().toISOString() }) }).then(lista => lista[0]),
  excluirPagamento: id => supabaseFetch(`/rest/v1/pagamentos?id=eq.${Number(id)}`, { method:'DELETE' }),
  listarPagamentosPeriodo: (inicio, fim) => supabaseFetch(`/rest/v1/pagamentos?select=*,agendamentos!inner(id,data,hora,status,cliente_nome,servico_nome)&agendamentos.data=gte.${encodeURIComponent(inicio)}&agendamentos.data=lte.${encodeURIComponent(fim)}&order=updated_at.desc`),

  listarDespesasPeriodo: (inicio, fim) => supabaseFetch(`/rest/v1/despesas?select=*&data=gte.${encodeURIComponent(inicio)}&data=lte.${encodeURIComponent(fim)}&order=data.desc,created_at.desc`),
  criarDespesa: dados => supabaseFetch('/rest/v1/despesas?select=*', { method:'POST', headers:{ Prefer:'return=representation' }, body:JSON.stringify(dados) }).then(lista => lista[0]),
  atualizarDespesa: (id, dados) => supabaseFetch(`/rest/v1/despesas?id=eq.${Number(id)}&select=*`, { method:'PATCH', headers:{ Prefer:'return=representation' }, body:JSON.stringify({ ...dados, updated_at:new Date().toISOString() }) }).then(lista => lista[0]),
  excluirDespesa: id => supabaseFetch(`/rest/v1/despesas?id=eq.${Number(id)}`, { method:'DELETE' })
};
