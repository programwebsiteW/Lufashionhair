let clientesCache = [];
let servicosCache = [];
let agendaDiaCache = [];
let agendamentosDoMes = [];
let mesAtual = new Date();
let diaSelecionado = hojeISO();
let filtroStatusAgenda = 'todos';

const nomesMeses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const nomesDias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const modalFundo = document.getElementById('modal-fundo');

function hojeISO() {
  const agora = new Date();
  return dataISO(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

function dataISO(ano, mes, dia) {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function dataDoRegistro(valor) {
  return String(valor || '').slice(0, 10);
}

function formatarData(valor, completa = false) {
  if (!valor) return '';
  const [ano, mes, dia] = dataDoRegistro(valor).split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  return data.toLocaleDateString('pt-BR', completa
    ? { weekday: 'long', day: '2-digit', month: 'long' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function dinheiro(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function escapar(valor) {
  return String(valor ?? '').replace(/[&<>'"]/g, caractere => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[caractere]);
}

function telefoneWhatsApp(valor) {
  const numeros = String(valor || '').replace(/\D/g, '');
  if (!numeros) return '';
  return numeros.startsWith('55') ? numeros : `55${numeros}`;
}

function mostrarToast(mensagem) {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.classList.remove('oculto');
  setTimeout(() => toast.classList.add('oculto'), 2600);
}

function abrirModal(titulo, corpoHtml) {
  document.getElementById('modal-titulo').textContent = titulo;
  document.getElementById('modal-corpo').innerHTML = corpoHtml;
  modalFundo.classList.remove('oculto');
  setTimeout(() => document.querySelector('#modal-corpo input, #modal-corpo select')?.focus(), 30);
}

function fecharModal() {
  modalFundo.classList.add('oculto');
}

document.getElementById('btn-fechar-modal').addEventListener('click', fecharModal);
modalFundo.addEventListener('click', evento => { if (evento.target === modalFundo) fecharModal(); });
document.addEventListener('keydown', evento => { if (evento.key === 'Escape') fecharModal(); });

document.getElementById('form-login').addEventListener('submit', async evento => {
  evento.preventDefault();
  const botao = document.getElementById('btn-login');
  const erro = document.getElementById('login-erro');
  erro.textContent = '';
  botao.disabled = true;
  botao.textContent = 'Entrando...';
  try {
    const resposta = await api.login(
      document.getElementById('login-email').value.trim(),
      document.getElementById('login-senha').value
    );
    localStorage.setItem('token', resposta.token);
    await entrarNoPainel();
  } catch (err) {
    erro.textContent = err.message;
  } finally {
    botao.disabled = false;
    botao.textContent = 'Entrar';
  }
});

document.getElementById('btn-sair').addEventListener('click', () => {
  api.logout().finally(() => location.reload());
});

async function entrarNoPainel() {
  document.getElementById('tela-login').classList.add('oculto');
  document.getElementById('painel').classList.remove('oculto');
  document.getElementById('filtro-data').value = diaSelecionado;
  const agora = new Date();
  const periodo = agora.getHours() < 12 ? 'Bom dia' : agora.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  document.getElementById('saudacao').textContent = `${periodo}, Lu!`;
  document.getElementById('data-hoje').textContent = agora.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long' });
  await Promise.all([carregarClientes(), carregarServicos(), carregarCalendario()]);
  await Promise.all([carregarAgenda(diaSelecionado), carregarInicio()]);
}

function irParaTela(nome) {
  document.querySelectorAll('.nav-btn').forEach(botao => botao.classList.toggle('ativo', botao.dataset.tela === nome));
  document.querySelectorAll('.tela').forEach(tela => tela.classList.add('oculto'));
  document.getElementById(`tela-${nome}`).classList.remove('oculto');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('.nav-btn').forEach(botao => botao.addEventListener('click', () => irParaTela(botao.dataset.tela)));
document.querySelectorAll('[data-ir]').forEach(botao => botao.addEventListener('click', () => irParaTela(botao.dataset.ir)));

async function carregarInicio() {
  const hoje = hojeISO();
  const ativos = agendamentosDoMes.filter(item => !['cancelado','faltou'].includes(item.status));
  const hojeLista = ativos.filter(item => dataDoRegistro(item.data) === hoje);
  const futuros = ativos.filter(item => dataDoRegistro(item.data) >= hoje);
  const concluidos = agendamentosDoMes.filter(item => item.status === 'concluido');
  const total = ativos.reduce((soma, item) => soma + Number(item.servico_preco || 0), 0);
  document.getElementById('metrica-hoje').textContent = hojeLista.length;
  document.getElementById('metrica-futuros').textContent = futuros.length;
  document.getElementById('metrica-concluidos').textContent = concluidos.length;
  document.getElementById('metrica-valor').textContent = dinheiro(total);
  const lista = document.getElementById('lista-proximos');
  const proximos = futuros.slice(0, 6);
  lista.innerHTML = proximos.length ? proximos.map(item => cardAgendamento(item, true)).join('') : '<p class="vazio">Nenhum atendimento futuro neste mês.</p>';
  desenharAvisosOperacionais(hojeLista);
}

function instanteAgendamento(item) {
  return new Date(`${dataDoRegistro(item.data)}T${String(item.hora || '00:00').slice(0,5)}:00`);
}

function estaAtrasado(item) {
  return ['agendado','confirmado'].includes(item.status) && instanteAgendamento(item) < new Date();
}

function desenharAvisosOperacionais(hojeLista) {
  const agora = new Date();
  const atrasados = hojeLista.filter(estaAtrasado);
  const proximosHoje = hojeLista.filter(item => instanteAgendamento(item) >= agora).sort((a,b) => instanteAgendamento(a) - instanteAgendamento(b));
  const semConfirmar = hojeLista.filter(item => item.status === 'agendado' && instanteAgendamento(item) >= agora);
  const proximo = proximosHoje[0];
  document.getElementById('avisos-operacionais').innerHTML = `
    <article class="aviso-operacional ${atrasados.length ? 'urgente' : ''}"><strong>${atrasados.length ? `${atrasados.length} atendimento(s) em atraso` : 'Nenhum atraso agora'}</strong><span>${atrasados.length ? 'Confira, conclua, cancele ou marque falta.' : 'A agenda de hoje está em dia.'}</span></article>
    <article class="aviso-operacional"><strong>${proximo ? `Próximo: ${escapar(String(proximo.hora).slice(0,5))}` : 'Sem próximo atendimento'}</strong><span>${proximo ? `${escapar(proximo.cliente_nome)} — ${escapar(proximo.servico_nome)}` : 'Você não tem mais horários marcados hoje.'}</span></article>
    <article class="aviso-operacional"><strong>${semConfirmar.length} aguardando confirmação</strong><span>${semConfirmar.length ? 'Use o WhatsApp para confirmar os horários.' : 'Todos os próximos horários estão confirmados.'}</span></article>`;
}

async function carregarCalendario() {
  const inicio = dataISO(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
  const ultimo = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0);
  const fim = dataISO(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate());
  try {
    agendamentosDoMes = await api.listarAgendamentosPeriodo(inicio, fim);
    desenharCalendario();
  } catch (err) {
    document.getElementById('calendario').innerHTML = `<p class="vazio">${escapar(err.message)}</p>`;
  }
}

function desenharCalendario() {
  document.getElementById('mes-label').textContent = `${nomesMeses[mesAtual.getMonth()]} de ${mesAtual.getFullYear()}`;
  const primeiro = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
  const ultimo = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0);
  let html = nomesDias.map(nome => `<div class="dia-semana">${nome}</div>`).join('');
  for (let i = 0; i < primeiro.getDay(); i++) html += '<div class="dia-cel vazio-mes"></div>';
  for (let dia = 1; dia <= ultimo.getDate(); dia++) {
    const data = dataISO(mesAtual.getFullYear(), mesAtual.getMonth(), dia);
    const quantidade = agendamentosDoMes.filter(item => dataDoRegistro(item.data) === data && item.status !== 'cancelado').length;
    html += `<button class="dia-cel ${data === hojeISO() ? 'hoje' : ''} ${data === diaSelecionado ? 'selecionado' : ''}" onclick="selecionarDia('${data}')"><span class="numero-dia">${dia}</span>${quantidade ? `<span class="contador-dia">${quantidade} atendimento${quantidade > 1 ? 's' : ''}</span>` : ''}</button>`;
  }
  document.getElementById('calendario').innerHTML = html;
}

async function selecionarDia(data) {
  diaSelecionado = data;
  document.getElementById('filtro-data').value = data;
  desenharCalendario();
  await carregarAgenda(data);
}

document.getElementById('mes-anterior').addEventListener('click', async () => { mesAtual = new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1); await carregarCalendario(); await carregarInicio(); });
document.getElementById('mes-proximo').addEventListener('click', async () => { mesAtual = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1); await carregarCalendario(); await carregarInicio(); });
document.getElementById('btn-hoje').addEventListener('click', async () => { mesAtual = new Date(); await carregarCalendario(); await selecionarDia(hojeISO()); });
document.getElementById('filtro-data').addEventListener('change', async evento => {
  const [ano, mes] = evento.target.value.split('-').map(Number);
  mesAtual = new Date(ano, mes - 1, 1);
  await carregarCalendario();
  await selecionarDia(evento.target.value);
});

function cardAgendamento(item, mostrarData = false) {
  const atrasado = estaAtrasado(item);
  const statusTexto = atrasado ? 'Em atraso' : ({ agendado:'Agendado', confirmado:'Confirmado', em_andamento:'Em andamento', concluido:'Concluído', cancelado:'Cancelado', faltou:'Cliente faltou' }[item.status] || item.status);
  return `<article class="item-card ${atrasado ? 'atrasado' : escapar(item.status)}">
    <div class="hora-destaque">${mostrarData ? escapar(dataDoRegistro(item.data).slice(8,10) + '/' + dataDoRegistro(item.data).slice(5,7)) : escapar(String(item.hora).slice(0,5))}</div>
    <div class="item-info"><strong>${escapar(item.cliente_nome)}</strong><span>${escapar(item.servico_nome)}${item.servico_preco ? ` · ${dinheiro(item.servico_preco)}` : ''}${item.observacoes ? ` · ${escapar(item.observacoes)}` : ''}</span><span class="tag ${atrasado ? 'atrasado' : escapar(item.status)}">${escapar(statusTexto)}</span></div>
    <div class="acoes">
      ${item.cliente_telefone ? `<button onclick="abrirWhatsAppAgendamento(${Number(item.id)})">WhatsApp</button>` : ''}
      <button onclick="editarAgendamento(${Number(item.id)})">Editar</button>
      ${item.status === 'agendado' ? `<button onclick="marcarStatus(${Number(item.id)},'confirmado')">Confirmar</button>` : ''}
      ${['agendado','confirmado'].includes(item.status) ? `<button onclick="marcarStatus(${Number(item.id)},'em_andamento')">Iniciar</button>` : ''}
      ${['agendado','confirmado','em_andamento'].includes(item.status) ? `<button onclick="marcarStatus(${Number(item.id)},'concluido')">Concluir</button><button onclick="marcarStatus(${Number(item.id)},'faltou')">Faltou</button><button onclick="marcarStatus(${Number(item.id)},'cancelado')">Cancelar</button>` : ''}
    </div>
  </article>`;
}

async function carregarAgenda(data) {
  const lista = document.getElementById('lista-agendamentos');
  lista.innerHTML = '<p class="vazio">Carregando os horários...</p>';
  document.getElementById('dia-selecionado-titulo').textContent = formatarData(data, true);
  try {
    agendaDiaCache = await api.listarAgendamentos(data);
    const visiveis = filtroStatusAgenda === 'todos' ? agendaDiaCache : agendaDiaCache.filter(item => item.status === filtroStatusAgenda);
    document.getElementById('resumo-dia').textContent = `${visiveis.length} atendimento(s) neste filtro`;
    lista.innerHTML = visiveis.length ? visiveis.map(item => cardAgendamento(item)).join('') : '<p class="vazio">Nenhum atendimento encontrado neste filtro.</p>';
  } catch (err) {
    lista.innerHTML = `<p class="vazio">${escapar(err.message)}</p>`;
  }
}

document.querySelectorAll('.filtro-status').forEach(botao => botao.addEventListener('click', () => {
  filtroStatusAgenda = botao.dataset.status;
  document.querySelectorAll('.filtro-status').forEach(item => item.classList.toggle('ativo', item === botao));
  carregarAgenda(diaSelecionado);
}));

function formularioAgendamento(item = {}) {
  const clientes = clientesCache.map(cliente => `<option value="${Number(cliente.id)}" ${Number(item.cliente_id) === Number(cliente.id) ? 'selected' : ''}>${escapar(cliente.nome)}</option>`).join('');
  const servicos = servicosCache.filter(servico => servico.ativo || Number(servico.id) === Number(item.servico_id)).map(servico => `<option value="${Number(servico.id)}" ${Number(item.servico_id) === Number(servico.id) ? 'selected' : ''}>${escapar(servico.nome)}${servico.preco ? ` — ${dinheiro(servico.preco)}` : ''}</option>`).join('');
  abrirModal(item.id ? 'Editar agendamento' : 'Novo agendamento', `
    <div class="campo"><label for="ag-cliente-id">Cliente</label><select id="ag-cliente-id"><option value="">Escolha uma cliente</option>${clientes}</select></div>
    <div class="campo"><label for="ag-cliente-nome">Ou digite o nome</label><input id="ag-cliente-nome" value="${escapar(item.cliente_nome || '')}" placeholder="Nome da cliente"></div>
    <div class="campo"><label for="ag-servico-id">Serviço</label><select id="ag-servico-id"><option value="">Escolha um serviço</option>${servicos}</select></div>
    <div class="linha-campos"><div class="campo"><label for="ag-data">Data</label><input type="date" id="ag-data" value="${escapar(dataDoRegistro(item.data) || diaSelecionado)}"></div><div class="campo"><label for="ag-hora">Horário</label><input type="time" id="ag-hora" value="${escapar(String(item.hora || '').slice(0,5))}"></div></div>
    <div class="campo"><label for="ag-obs">Observações</label><textarea id="ag-obs" placeholder="Ex.: retoque de raiz, cabelo longo...">${escapar(item.observacoes || '')}</textarea></div>
    <div class="modal-botoes"><button class="btn-cancelar" onclick="fecharModal()">Voltar</button><button class="btn-confirmar" onclick="salvarAgendamento(${item.id ? Number(item.id) : 'null'})">Salvar</button></div>`);
  const seletorCliente = document.getElementById('ag-cliente-id');
  seletorCliente.addEventListener('change', () => {
    const cliente = clientesCache.find(c => Number(c.id) === Number(seletorCliente.value));
    if (cliente) document.getElementById('ag-cliente-nome').value = cliente.nome;
  });
}

async function abrirNovoAgendamento() {
  if (!clientesCache.length) clientesCache = await api.listarClientes();
  if (!servicosCache.length) servicosCache = await api.listarServicos();
  if (!servicosCache.some(item => item.ativo)) {
    mostrarToast('Cadastre pelo menos um serviço antes de agendar.');
    irParaTela('servicos');
    return;
  }
  formularioAgendamento();
}

document.getElementById('btn-novo-agendamento').addEventListener('click', abrirNovoAgendamento);
document.getElementById('btn-agendar-inicio').addEventListener('click', abrirNovoAgendamento);

function editarAgendamento(id) {
  const item = [...agendaDiaCache, ...agendamentosDoMes].find(registro => Number(registro.id) === Number(id));
  if (item) formularioAgendamento(item);
}

async function salvarAgendamento(id) {
  const clienteId = document.getElementById('ag-cliente-id').value;
  const cliente = clientesCache.find(item => Number(item.id) === Number(clienteId));
  const clienteNome = document.getElementById('ag-cliente-nome').value.trim() || cliente?.nome;
  const servicoId = document.getElementById('ag-servico-id').value;
  const servico = servicosCache.find(item => Number(item.id) === Number(servicoId));
  const dados = { cliente_id: clienteId || null, cliente_nome: clienteNome, servico_id: servicoId || null, servico_nome: servico?.nome, data: document.getElementById('ag-data').value, hora: document.getElementById('ag-hora').value, observacoes: document.getElementById('ag-obs').value.trim(), status: id ? ([...agendaDiaCache,...agendamentosDoMes].find(item => Number(item.id) === Number(id))?.status || 'agendado') : 'agendado' };
  if (!dados.cliente_nome || !dados.servico_nome || !dados.data || !dados.hora) return mostrarToast('Preencha cliente, serviço, data e horário.');
  try {
    if (id) await api.atualizarAgendamento(id, dados); else await api.criarAgendamento(dados);
    fecharModal();
    diaSelecionado = dados.data;
    const [ano, mes] = dados.data.split('-').map(Number);
    mesAtual = new Date(ano, mes - 1, 1);
    await carregarCalendario();
    await carregarAgenda(dados.data);
    await carregarInicio();
    mostrarToast(id ? 'Agendamento atualizado.' : 'Agendamento criado.');
  } catch (err) { mostrarToast(err.message); }
}

async function marcarStatus(id, status) {
  const item = [...agendaDiaCache, ...agendamentosDoMes].find(registro => Number(registro.id) === Number(id));
  if (!item) return;
  try {
    await api.atualizarAgendamento(id, { ...item, status });
    await carregarCalendario(); await carregarAgenda(diaSelecionado); await carregarInicio();
    const mensagens = { confirmado:'Atendimento confirmado.', em_andamento:'Atendimento iniciado.', concluido:'Atendimento concluído.', faltou:'Falta registrada.', cancelado:'Agendamento cancelado.' };
    mostrarToast(mensagens[status] || 'Atendimento atualizado.');
  } catch (err) { mostrarToast(err.message); }
}

function abrirWhatsAppAgendamento(id) {
  const item = [...agendaDiaCache, ...agendamentosDoMes].find(registro => Number(registro.id) === Number(id));
  const telefone = telefoneWhatsApp(item?.cliente_telefone);
  if (!telefone) return mostrarToast('Cadastre o telefone da cliente primeiro.');
  const mensagem = `Olá, ${item.cliente_nome}! Confirmando seu horário de ${item.servico_nome} no dia ${formatarData(item.data)} às ${String(item.hora).slice(0,5)}. Lu Fashion Hair.`;
  window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener');
}

document.getElementById('busca-cliente').addEventListener('input', evento => carregarClientes(evento.target.value));

async function carregarClientes(busca = '') {
  const lista = document.getElementById('lista-clientes');
  try {
    clientesCache = await api.listarClientes(busca);
    lista.innerHTML = clientesCache.length ? clientesCache.map(cliente => `<article class="item-card"><div class="item-info"><strong>${escapar(cliente.nome)}</strong><span>${escapar(cliente.telefone || 'Telefone não informado')}</span>${cliente.observacoes ? `<span>${escapar(cliente.observacoes)}</span>` : ''}</div><div class="acoes">${cliente.telefone ? `<button onclick="abrirWhatsAppCliente(${Number(cliente.id)})">WhatsApp</button>` : ''}<button onclick="editarCliente(${Number(cliente.id)})">Editar</button><button onclick="excluirCliente(${Number(cliente.id)})">Excluir</button></div></article>`).join('') : '<p class="vazio">Nenhuma cliente cadastrada.</p>';
  } catch (err) { lista.innerHTML = `<p class="vazio">${escapar(err.message)}</p>`; }
}

function formularioCliente(cliente = {}) {
  abrirModal(cliente.id ? 'Editar cliente' : 'Nova cliente', `<div class="campo"><label for="cli-nome">Nome</label><input id="cli-nome" value="${escapar(cliente.nome || '')}" placeholder="Nome completo"></div><div class="campo"><label for="cli-telefone">Telefone / WhatsApp</label><input id="cli-telefone" value="${escapar(cliente.telefone || '')}" placeholder="(00) 00000-0000" inputmode="tel"></div><div class="campo"><label for="cli-obs">Observações</label><textarea id="cli-obs" placeholder="Ex.: preferência, alergia ou fórmula usada">${escapar(cliente.observacoes || '')}</textarea></div><div class="modal-botoes"><button class="btn-cancelar" onclick="fecharModal()">Voltar</button><button class="btn-confirmar" onclick="salvarCliente(${cliente.id ? Number(cliente.id) : 'null'})">Salvar</button></div>`);
}

document.getElementById('btn-novo-cliente').addEventListener('click', () => formularioCliente());
function editarCliente(id) { const cliente = clientesCache.find(item => Number(item.id) === Number(id)); if (cliente) formularioCliente(cliente); }

async function salvarCliente(id) {
  const dados = { nome: document.getElementById('cli-nome').value.trim(), telefone: document.getElementById('cli-telefone').value.trim(), observacoes: document.getElementById('cli-obs').value.trim() };
  if (!dados.nome) return mostrarToast('Informe o nome da cliente.');
  try { if (id) await api.atualizarCliente(id, dados); else await api.criarCliente(dados); fecharModal(); await carregarClientes(); mostrarToast(id ? 'Cliente atualizada.' : 'Cliente cadastrada.'); } catch (err) { mostrarToast(err.message); }
}

async function excluirCliente(id) {
  if (!confirm('Excluir esta cliente? Os agendamentos antigos continuam salvos com o nome dela.')) return;
  try { await api.excluirCliente(id); await carregarClientes(); mostrarToast('Cliente excluída.'); } catch (err) { mostrarToast(err.message); }
}

function abrirWhatsAppCliente(id) {
  const cliente = clientesCache.find(item => Number(item.id) === Number(id));
  const telefone = telefoneWhatsApp(cliente?.telefone);
  if (telefone) window.open(`https://wa.me/${telefone}`, '_blank', 'noopener');
}

async function carregarServicos() {
  const lista = document.getElementById('lista-servicos');
  try {
    servicosCache = await api.listarServicos();
    lista.innerHTML = servicosCache.length ? servicosCache.map(servico => `<article class="item-card ${servico.ativo ? '' : 'cancelado'}"><div class="item-info"><strong>${escapar(servico.nome)}</strong><span>${Number(servico.duracao_minutos)} minutos · ${servico.preco ? dinheiro(servico.preco) : 'Valor não informado'}</span><span class="tag">${servico.ativo ? 'Disponível' : 'Desativado'}</span></div><div class="acoes"><button onclick="editarServico(${Number(servico.id)})">Editar</button><button onclick="alternarServico(${Number(servico.id)})">${servico.ativo ? 'Desativar' : 'Ativar'}</button></div></article>`).join('') : '<p class="vazio">Nenhum serviço cadastrado.</p>';
  } catch (err) { lista.innerHTML = `<p class="vazio">${escapar(err.message)}</p>`; }
}

const modelosServico = {
  progressiva:{ nome:'Progressiva', duracao:180 }, progressivaSemi:{ nome:'Progressiva semidefinitiva', duracao:180 }, alisamento:{ nome:'Alisamento', duracao:180 }, blindagem:{ nome:'Blindagem Box', duracao:120 }, corte:{ nome:'Corte feminino', duracao:60 }, escova:{ nome:'Escova', duracao:60 }, coloracao:{ nome:'Coloração', duracao:150 }, mechas:{ nome:'Mechas / Luzes', duracao:240 }, ombre:{ nome:'Ombré hair', duracao:240 }, hidratacao:{ nome:'Hidratação', duracao:60 }, reconstrucao:{ nome:'Reconstrução capilar', duracao:90 }, nutricao:{ nome:'Nutrição capilar', duracao:90 }, penteado:{ nome:'Penteado', duracao:90 }, manicure:{ nome:'Manicure', duracao:60 }, pedicure:{ nome:'Pedicure', duracao:60 }, gel:{ nome:'Esmaltação em gel', duracao:90 }, alongamento:{ nome:'Alongamento de unhas', duracao:150 }, sobrancelha:{ nome:'Design de sobrancelhas', duracao:45 }, henna:{ nome:'Sobrancelha com henna', duracao:60 }, spaPes:{ nome:'Spa dos pés', duracao:75 }
};

function formularioServico(servico = {}) {
  abrirModal(servico.id ? 'Editar serviço' : 'Novo serviço', `${!servico.id ? `<div class="campo"><label for="serv-modelo">Usar um modelo</label><select id="serv-modelo"><option value="">Escolha ou preencha abaixo</option>${Object.entries(modelosServico).map(([chave,item]) => `<option value="${chave}">${item.nome}</option>`).join('')}</select></div>` : ''}<div class="campo"><label for="serv-nome">Nome do serviço</label><input id="serv-nome" value="${escapar(servico.nome || '')}" placeholder="Ex.: Progressiva"></div><div class="linha-campos"><div class="campo"><label for="serv-duracao">Duração em minutos</label><input id="serv-duracao" type="number" min="15" step="15" value="${Number(servico.duracao_minutos || 60)}"></div><div class="campo"><label for="serv-preco">Valor em reais</label><input id="serv-preco" type="number" min="0" step="0.01" value="${escapar(servico.preco || '')}" placeholder="0,00"></div></div><div class="modal-botoes"><button class="btn-cancelar" onclick="fecharModal()">Voltar</button><button class="btn-confirmar" onclick="salvarServico(${servico.id ? Number(servico.id) : 'null'})">Salvar</button></div>`);
  document.getElementById('serv-modelo')?.addEventListener('change', evento => { const modelo = modelosServico[evento.target.value]; if (modelo) { document.getElementById('serv-nome').value = modelo.nome; document.getElementById('serv-duracao').value = modelo.duracao; } });
}

document.getElementById('btn-novo-servico').addEventListener('click', () => formularioServico());
function editarServico(id) { const servico = servicosCache.find(item => Number(item.id) === Number(id)); if (servico) formularioServico(servico); }

async function salvarServico(id) {
  const atual = servicosCache.find(item => Number(item.id) === Number(id));
  const dados = { nome: document.getElementById('serv-nome').value.trim(), duracao_minutos: Number(document.getElementById('serv-duracao').value), preco: document.getElementById('serv-preco').value || null, ativo: atual ? atual.ativo : true };
  if (!dados.nome || dados.duracao_minutos < 15) return mostrarToast('Informe o nome e uma duração válida.');
  try { if (id) await api.atualizarServico(id, dados); else await api.criarServico(dados); fecharModal(); await carregarServicos(); mostrarToast(id ? 'Serviço atualizado.' : 'Serviço cadastrado.'); } catch (err) { mostrarToast(err.message); }
}

async function alternarServico(id) {
  const servico = servicosCache.find(item => Number(item.id) === Number(id));
  if (!servico) return;
  try { await api.atualizarServico(id, { ...servico, ativo: !servico.ativo }); await carregarServicos(); mostrarToast(servico.ativo ? 'Serviço desativado.' : 'Serviço ativado.'); } catch (err) { mostrarToast(err.message); }
}

if (getToken()) setTimeout(() => entrarNoPainel().catch(() => {}), 0);
