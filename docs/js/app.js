let clientesCache = [];
let servicosCache = [];
let agendaDiaCache = [];
let agendamentosDoMes = [];
let pagamentosCache = [];
let despesasCache = [];
let lixeiraCache = [];
let mesAtual = new Date();
let diaSelecionado = hojeISO();

const nomesMeses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const nomesDias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const modalFundo = document.getElementById('modal-fundo');

function hojeISO() {
  const agora = new Date();
  return dataISO(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

function dataISO(ano, mes, dia) { return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`; }
function dataDoRegistro(valor) { return String(valor || '').slice(0, 10); }
function mesISO(data = new Date()) { return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`; }

function periodoMes(valor) {
  const [ano, mes] = String(valor || mesISO()).split('-').map(Number);
  const ultimo = new Date(ano, mes, 0).getDate();
  return { inicio:`${ano}-${String(mes).padStart(2,'0')}-01`, fim:`${ano}-${String(mes).padStart(2,'0')}-${String(ultimo).padStart(2,'0')}` };
}

function formatarData(valor, completa = false) {
  if (!valor) return '';
  const [ano, mes, dia] = dataDoRegistro(valor).split('-').map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', completa
    ? { weekday:'long', day:'2-digit', month:'long', year:'numeric' }
    : { day:'2-digit', month:'2-digit', year:'numeric' });
}

function dinheiro(valor) { return Number(valor || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' }); }
function parseDinheiro(valor) {
  const limpo = String(valor || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : 0;
}
function valorCampo(valor) { return valor === null || valor === undefined || valor === '' ? '' : Number(valor).toFixed(2).replace('.', ','); }
function formatarNome(valor) {
  return String(valor || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR').replace(/(^|[\s'-])\p{L}/gu, letra => letra.toLocaleUpperCase('pt-BR'));
}
function duracaoTexto(minutos) {
  const total = Number(minutos || 0); const horas = Math.floor(total / 60); const resto = total % 60;
  if (!horas) return `${resto} min`;
  if (!resto) return `${horas}h`;
  return `${horas}h ${resto}min`;
}
function escapar(valor) { return String(valor ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function telefoneWhatsApp(valor) { const n=String(valor||'').replace(/\D/g,''); return n ? (n.startsWith('55')?n:`55${n}`) : ''; }
function totalPagamento(p) { return Math.max(Number(p?.valor_servico || 0) - Number(p?.desconto || 0), 0); }
function pendentePagamento(p) { return Math.max(totalPagamento(p) - Number(p?.valor_pago || 0), 0); }

function mostrarToast(mensagem) {
  const toast=document.getElementById('toast'); toast.textContent=mensagem; toast.classList.remove('oculto');
  clearTimeout(mostrarToast.timer); mostrarToast.timer=setTimeout(()=>toast.classList.add('oculto'),3200);
}
function abrirModal(titulo, corpoHtml) {
  document.getElementById('modal-titulo').textContent=titulo; document.getElementById('modal-corpo').innerHTML=corpoHtml;
  modalFundo.classList.remove('oculto'); setTimeout(()=>document.querySelector('#modal-corpo input, #modal-corpo select')?.focus(),30);
}
function fecharModal(){ modalFundo.classList.add('oculto'); }
document.getElementById('btn-fechar-modal').addEventListener('click',fecharModal);
modalFundo.addEventListener('click',e=>{if(e.target===modalFundo)fecharModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')fecharModal();});

document.getElementById('form-login').addEventListener('submit',async e=>{
  e.preventDefault(); const botao=document.getElementById('btn-login'); const erro=document.getElementById('login-erro');
  erro.textContent=''; botao.disabled=true; botao.textContent='Entrando...';
  try { await api.login(document.getElementById('login-usuario').value,document.getElementById('login-senha').value); await entrarNoPainel(); }
  catch(err){ erro.textContent=err.message; }
  finally { botao.disabled=false; botao.textContent='Entrar'; }
});
document.getElementById('btn-sair').addEventListener('click',()=>api.logout().finally(()=>location.reload()));

async function entrarNoPainel(){
  document.getElementById('tela-login').classList.add('oculto'); document.getElementById('painel').classList.remove('oculto');
  document.getElementById('filtro-data').value=diaSelecionado;
  document.getElementById('financeiro-mes').value=mesISO(); document.getElementById('resumo-mes').value=mesISO();
  document.getElementById('despesas-mes').value=mesISO();
  const agora=new Date(); const periodo=agora.getHours()<12?'Bom dia':agora.getHours()<18?'Boa tarde':'Boa noite';
  document.getElementById('saudacao').textContent=`${periodo}, Lu!`;
  document.getElementById('data-hoje').textContent=agora.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});
  await Promise.all([carregarClientes(),carregarServicos(),carregarCalendario()]);
  await Promise.all([carregarAgenda(diaSelecionado),carregarInicio()]);
}

async function irParaTela(nome){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('ativo',b.dataset.tela===nome));
  document.querySelectorAll('.tela').forEach(t=>t.classList.add('oculto')); document.getElementById(`tela-${nome}`).classList.remove('oculto');
  if(nome==='financeiro') await carregarFinanceiro();
  if(nome==='despesas') await carregarDespesas();
  if(nome==='resumos') await carregarResumos();
  if(nome==='lixeira') await carregarLixeira();
  window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>irParaTela(b.dataset.tela)));
document.querySelectorAll('[data-ir]').forEach(b=>b.addEventListener('click',()=>irParaTela(b.dataset.ir)));

async function carregarInicio(){
  const hoje=hojeISO(); const ativos=agendamentosDoMes.filter(a=>!['cancelado','faltou'].includes(a.status));
  const hojeLista=ativos.filter(a=>dataDoRegistro(a.data)===hoje); const futuros=ativos.filter(a=>dataDoRegistro(a.data)>=hoje&&['agendado','confirmado','em_andamento'].includes(a.status));
  const recebido=agendamentosDoMes.reduce((s,a)=>s+Number(a.pagamento?.valor_pago||0),0);
  const pendente=agendamentosDoMes.filter(a=>!['cancelado','faltou'].includes(a.status)).reduce((s,a)=>s+pendentePagamento(a.pagamento),0);
  document.getElementById('metrica-hoje').textContent=hojeLista.length; document.getElementById('metrica-futuros').textContent=futuros.length;
  document.getElementById('metrica-pendente').textContent=dinheiro(pendente); document.getElementById('metrica-recebido').textContent=dinheiro(recebido);
  document.getElementById('lista-proximos').innerHTML=futuros.length?futuros.slice(0,6).map(a=>cardAgendamento(a,true)).join(''):'<p class="vazio">Nenhum atendimento futuro neste mês.</p>';
  desenharAvisosOperacionais(hojeLista);
}
function instanteAgendamento(a){return a.hora?new Date(`${dataDoRegistro(a.data)}T${String(a.hora).slice(0,5)}:00`):null;}
function estaAtrasado(a){const instante=instanteAgendamento(a);return Boolean(instante)&&['agendado','confirmado'].includes(a.status)&&instante<new Date();}
function desenharAvisosOperacionais(lista){
  const agora=new Date(); const atrasados=lista.filter(estaAtrasado); const proximos=lista.filter(a=>instanteAgendamento(a)&&instanteAgendamento(a)>=agora).sort((a,b)=>instanteAgendamento(a)-instanteAgendamento(b));
  const agendados=lista.filter(a=>a.status==='agendado'); const proximo=proximos[0];
  document.getElementById('avisos-operacionais').innerHTML=`
    <article class="aviso-operacional ${atrasados.length?'urgente':''}"><strong>${atrasados.length?`${atrasados.length} em atraso`:'Nenhum atraso'}</strong><span>${atrasados.length?'Abra a agenda para resolver.':'A agenda está em dia.'}</span></article>
    <article class="aviso-operacional"><strong>${proximo?`Próximo às ${String(proximo.hora).slice(0,5)}`:'Sem próximo atendimento'}</strong><span>${proximo?`${escapar(proximo.cliente_nome)} — ${escapar(proximo.servico_nome)}`:'Nenhum outro horário hoje.'}</span></article>
    <article class="aviso-operacional"><strong>${agendados.length} agendado${agendados.length===1?'':'s'}</strong><span>${agendados.length?'Próximos serviços ainda não pagos.':'Nenhum serviço aguardando.'}</span></article>`;
}

async function carregarCalendario(){
  const inicio=dataISO(mesAtual.getFullYear(),mesAtual.getMonth(),1); const ultimo=new Date(mesAtual.getFullYear(),mesAtual.getMonth()+1,0);
  try{agendamentosDoMes=await api.listarAgendamentosPeriodo(inicio,dataISO(ultimo.getFullYear(),ultimo.getMonth(),ultimo.getDate()));desenharCalendario();}
  catch(err){document.getElementById('calendario').innerHTML=`<p class="vazio">${escapar(err.message)}</p>`;}
}
function desenharCalendario(){
  document.getElementById('mes-label').textContent=`${nomesMeses[mesAtual.getMonth()]} de ${mesAtual.getFullYear()}`;
  const primeiro=new Date(mesAtual.getFullYear(),mesAtual.getMonth(),1); const ultimo=new Date(mesAtual.getFullYear(),mesAtual.getMonth()+1,0);
  let html=nomesDias.map(n=>`<div class="dia-semana">${n}</div>`).join('');
  for(let i=0;i<primeiro.getDay();i++)html+='<div class="dia-cel vazio-mes"></div>';
  for(let dia=1;dia<=ultimo.getDate();dia++){
    const data=dataISO(mesAtual.getFullYear(),mesAtual.getMonth(),dia); const qtd=agendamentosDoMes.filter(a=>dataDoRegistro(a.data)===data&&a.status!=='cancelado').length;
    html+=`<button class="dia-cel ${data===hojeISO()?'hoje':''} ${data===diaSelecionado?'selecionado':''}" aria-label="Dia ${dia}, ${qtd} atendimento${qtd===1?'':'s'}" onclick="selecionarDia('${data}')"><span class="numero-dia">${dia}</span>${qtd?`<span class="contador-dia">${qtd} marcado${qtd>1?'s':''}</span>`:''}</button>`;
  }
  document.getElementById('calendario').innerHTML=html;
}
async function selecionarDia(data){diaSelecionado=data;document.getElementById('filtro-data').value=data;desenharCalendario();await carregarAgenda(data);}
document.getElementById('mes-anterior').addEventListener('click',async()=>{mesAtual=new Date(mesAtual.getFullYear(),mesAtual.getMonth()-1,1);await carregarCalendario();await carregarInicio();});
document.getElementById('mes-proximo').addEventListener('click',async()=>{mesAtual=new Date(mesAtual.getFullYear(),mesAtual.getMonth()+1,1);await carregarCalendario();await carregarInicio();});
document.getElementById('btn-hoje').addEventListener('click',async()=>{mesAtual=new Date();await carregarCalendario();await selecionarDia(hojeISO());});
document.getElementById('filtro-data').addEventListener('change',async e=>{const[ano,mes]=e.target.value.split('-').map(Number);mesAtual=new Date(ano,mes-1,1);await carregarCalendario();await selecionarDia(e.target.value);});

function cardAgendamento(a,mostrarData=false){
  const atrasado=estaAtrasado(a); const status=atrasado?'Em atraso':({agendado:'Agendado',confirmado:'Agendado',em_andamento:'Agendado',concluido:'Concluído',cancelado:'Cancelado',faltou:'Cancelado'}[a.status]||a.status);
  const pagamento=a.pagamento; const pagTexto=pagamento?.status==='pago'?'Pago':pagamento?.status==='parcial'?'Parcial':'Pendente';
  return `<article class="item-card card-agendamento ${atrasado?'atrasado':escapar(a.status)}">
    <div class="hora-destaque">${mostrarData?escapar(dataDoRegistro(a.data).slice(8,10)+'/'+dataDoRegistro(a.data).slice(5,7)):escapar(a.hora?String(a.hora).slice(0,5):'A definir')}</div>
    <div class="item-info"><strong>${escapar(a.cliente_nome)}</strong><span>${escapar(a.servico_nome)} · ${duracaoTexto(a.duracao_minutos)} · ${dinheiro(a.valor_servico)}</span>${!a.hora?'<span>Horário a definir</span>':''}${a.observacoes?`<span>${escapar(a.observacoes)}</span>`:''}<div class="tags"><span class="tag ${atrasado?'atrasado':escapar(a.status)}">${escapar(status)}</span><span class="tag pagamento-${pagamento?.status||'pendente'}">${pagTexto}</span></div></div>
    <div class="acoes">${a.cliente_telefone?`<button onclick="abrirWhatsAppAgendamento(${Number(a.id)})">WhatsApp</button>`:''}<button onclick="editarAgendamento(${Number(a.id)})">Editar</button><button onclick="abrirPagamento(${Number(a.id)})">Pago</button>${!['cancelado','concluido'].includes(a.status)?`<button onclick="marcarStatus(${Number(a.id)},'cancelado')">Cancelar</button>`:''}</div>
  </article>`;
}
async function carregarAgenda(data){
  const lista=document.getElementById('lista-agendamentos');lista.innerHTML='<p class="vazio">Carregando...</p>';document.getElementById('dia-selecionado-titulo').textContent=formatarData(data,true);
  try{agendaDiaCache=await api.listarAgendamentos(data);document.getElementById('resumo-dia').textContent=`${agendaDiaCache.length} atendimento(s)`;lista.innerHTML=agendaDiaCache.length?agendaDiaCache.map(a=>cardAgendamento(a)).join(''):'<p class="vazio">Nenhum atendimento neste dia.</p>';}
  catch(err){lista.innerHTML=`<p class="vazio">${escapar(err.message)}</p>`;}
}
function formularioAgendamento(item={}){
  const clientes=clientesCache.map(c=>`<option value="${c.id}" ${Number(item.cliente_id)===Number(c.id)?'selected':''}>${escapar(c.nome)}</option>`).join('');
  const servicos=servicosCache.map(s=>`<option value="${s.id}" ${Number(item.servico_id)===Number(s.id)?'selected':''}>${escapar(s.nome)} · ${duracaoTexto(s.duracao_minutos)} · ${s.preco==null?'sem valor':dinheiro(s.preco)}</option>`).join('');
  abrirModal(item.id?'Editar agendamento':'Novo agendamento',`
    <div class="destaque-form"><strong>1. Quando será?</strong><div class="linha-campos"><div class="campo"><label for="ag-data">Dia</label><input type="date" id="ag-data" value="${escapar(dataDoRegistro(item.data)||diaSelecionado)}"></div><div class="campo"><label for="ag-hora">Hora de início</label><input type="time" id="ag-hora" value="${escapar(String(item.hora||'').slice(0,5))}"></div></div></div>
    <div class="campo"><label for="ag-cliente-id">2. Cliente</label><select id="ag-cliente-id"><option value="">Escolha uma cliente</option>${clientes}</select></div>
    <div class="campo"><label for="ag-cliente-nome">Ou digite um nome rápido</label><input id="ag-cliente-nome" value="${escapar(item.cliente_nome||'')}" placeholder="Nome da cliente"></div>
    <div class="campo"><label for="ag-servico-id">3. Serviço já cadastrado</label><select id="ag-servico-id"><option value="">${servicos?'Escolha um serviço':'Nenhum serviço cadastrado'}</option>${servicos}</select></div>
    <div class="campo"><label for="ag-servico-nome">Ou digite um novo serviço</label><input id="ag-servico-nome" placeholder="Ex.: Escova"></div>
    <div id="ag-resumo-servico" class="resumo-selecao"></div>
    <div class="campo"><label for="ag-obs">Observações</label><textarea id="ag-obs" placeholder="Ex.: retoque de raiz, cabelo longo...">${escapar(item.observacoes||'')}</textarea></div>
    <div class="modal-botoes"><button class="btn-cancelar" onclick="fecharModal()">Voltar</button><button class="btn-confirmar" onclick="salvarAgendamento(${item.id?Number(item.id):'null'})">Salvar agendamento</button></div>`);
  const cli=document.getElementById('ag-cliente-id'); const serv=document.getElementById('ag-servico-id'); const novoServ=document.getElementById('ag-servico-nome');
  cli.addEventListener('change',()=>{const c=clientesCache.find(x=>Number(x.id)===Number(cli.value));if(c)document.getElementById('ag-cliente-nome').value=c.nome;});
  const resumo=()=>{const s=servicosCache.find(x=>Number(x.id)===Number(serv.value));document.getElementById('ag-resumo-servico').innerHTML=s?`Duração prevista: <strong>${duracaoTexto(s.duracao_minutos)}</strong> · Valor: <strong>${s.preco==null?'a definir':dinheiro(s.preco)}</strong>`:novoServ.value.trim()?'O novo serviço será salvo em Serviços com duração inicial de <strong>1h</strong> e valor a definir.':'';};serv.addEventListener('change',()=>{if(serv.value)novoServ.value='';resumo();});novoServ.addEventListener('input',()=>{if(novoServ.value.trim())serv.value='';resumo();});resumo();
  document.getElementById('ag-cliente-nome').addEventListener('blur',e=>e.target.value=formatarNome(e.target.value));
  novoServ.addEventListener('blur',e=>e.target.value=formatarNome(e.target.value));
}
async function abrirNovoAgendamento(clienteId=null,servicoId=null){
  if(!clientesCache.length)clientesCache=await api.listarClientes();if(!servicosCache.length)servicosCache=await api.listarServicos();
  formularioAgendamento({cliente_id:clienteId,servico_id:servicoId});
}
document.getElementById('btn-novo-agendamento').addEventListener('click',()=>abrirNovoAgendamento());document.getElementById('btn-agendar-inicio').addEventListener('click',()=>abrirNovoAgendamento());
function localizarAgendamento(id){return[...agendaDiaCache,...agendamentosDoMes].find(a=>Number(a.id)===Number(id));}
function editarAgendamento(id){const a=localizarAgendamento(id);if(a)formularioAgendamento(a);}
async function salvarAgendamento(id){
  const clienteId=document.getElementById('ag-cliente-id').value;let cliente=clientesCache.find(c=>Number(c.id)===Number(clienteId));const nomeRapido=formatarNome(document.getElementById('ag-cliente-nome').value);const servicoId=document.getElementById('ag-servico-id').value;let servico=servicosCache.find(s=>Number(s.id)===Number(servicoId));const novoServicoNome=formatarNome(document.getElementById('ag-servico-nome').value);
  try{if(!cliente&&nomeRapido){cliente=await api.criarCliente({nome:nomeRapido,telefone:null,observacoes:null});clientesCache.push(cliente);}if(!servico&&novoServicoNome){servico=await api.criarServico({nome:novoServicoNome,duracao_minutos:60,preco:null,ativo:true});servicosCache.push(servico);}const dados={cliente_id:cliente?.id||null,cliente_nome:cliente?.nome||nomeRapido||'Cliente sem nome',servico_id:servico?.id||null,servico_nome:servico?.nome||'Serviço sem nome',data:document.getElementById('ag-data').value||hojeISO(),hora:document.getElementById('ag-hora').value,duracao_minutos:servico?.duracao_minutos||60,valor_servico:servico?.preco??null,observacoes:document.getElementById('ag-obs').value.trim(),status:id?(localizarAgendamento(id)?.status||'agendado'):'agendado'};if(id)await api.atualizarAgendamento(id,dados);else await api.criarAgendamento(dados);fecharModal();diaSelecionado=dados.data;const[ano,mes]=dados.data.split('-').map(Number);mesAtual=new Date(ano,mes-1,1);await atualizarSistema();mostrarToast(id?'Agendamento atualizado.':'Agendamento, cliente e serviço salvos juntos.');}catch(err){mostrarToast(err.message);}
}
async function marcarStatus(id,status){const a=localizarAgendamento(id);if(!a)return;try{await api.atualizarAgendamento(id,{...a,status});await carregarCalendario();await carregarAgenda(diaSelecionado);await carregarInicio();mostrarToast({confirmado:'Atendimento confirmado.',em_andamento:'Atendimento iniciado.',concluido:'Atendimento concluído.',faltou:'Falta registrada.',cancelado:'Agendamento cancelado.'}[status]||'Atualizado.');}catch(err){mostrarToast(err.message);}}
function abrirWhatsAppAgendamento(id){const a=localizarAgendamento(id);const tel=telefoneWhatsApp(a?.cliente_telefone);if(!tel)return mostrarToast('Cadastre o telefone da cliente primeiro.');const quando=a.hora?`no dia ${formatarData(a.data)} às ${String(a.hora).slice(0,5)}`:`no dia ${formatarData(a.data)}, com horário ainda a combinar`;const msg=`Olá, ${a.cliente_nome}! Confirmando seu atendimento de ${a.servico_nome} ${quando}. Lu Fashion Hair.`;window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`,'_blank','noopener');}

function abrirPagamento(id){
  const a=localizarAgendamento(id)||pagamentosCache.map(p=>({...p.agendamentos,pagamento:p})).find(x=>Number(x.id)===Number(id));if(!a)return;const p=a.pagamento||{};
  abrirModal('Registrar pagamento',`<div class="resumo-pagamento"><strong>${escapar(a.cliente_nome)}</strong><span>${escapar(a.servico_nome)} · ${formatarData(a.data)}</span></div>
    <div class="linha-campos"><div class="campo"><label for="pag-valor">Valor do serviço</label><div class="campo-dinheiro"><span>R$</span><input id="pag-valor" inputmode="decimal" value="${valorCampo(p.valor_servico??a.valor_servico)}"></div></div><div class="campo"><label for="pag-desconto">Desconto</label><div class="campo-dinheiro"><span>R$</span><input id="pag-desconto" inputmode="decimal" value="${valorCampo(p.desconto||'')}"></div></div></div>
    <div class="campo"><label for="pag-recebido">Quanto recebeu</label><div class="campo-dinheiro"><span>R$</span><input id="pag-recebido" inputmode="decimal" value="${valorCampo(p.valor_pago||'') }" placeholder="Deixe em branco se ainda não recebeu"></div></div>
    <div class="linha-campos"><div class="campo"><label for="pag-forma">Forma de pagamento</label><select id="pag-forma"><option value="">Ainda não pago</option>${[['pix','Pix'],['dinheiro','Dinheiro'],['debito','Débito'],['credito','Crédito'],['transferencia','Transferência'],['outro','Outro']].map(([v,t])=>`<option value="${v}" ${p.forma_pagamento===v?'selected':''}>${t}</option>`).join('')}</select></div><div class="campo"><label for="pag-data">Data do pagamento</label><input type="date" id="pag-data" value="${p.data_pagamento||hojeISO()}"></div></div>
    <div class="campo"><label for="pag-obs">Observação financeira</label><textarea id="pag-obs">${escapar(p.observacoes||'')}</textarea></div>
    <div class="modal-botoes"><button class="btn-cancelar" onclick="fecharModal()">Voltar</button><button class="btn-confirmar" onclick="salvarPagamento(${p.id?Number(p.id):'null'},${Number(a.id)})">Salvar pagamento</button></div>`);
}
async function salvarPagamento(id,agendamentoId){
  const dados={valor_servico:parseDinheiro(document.getElementById('pag-valor').value),desconto:parseDinheiro(document.getElementById('pag-desconto').value),valor_pago:parseDinheiro(document.getElementById('pag-recebido').value),forma_pagamento:document.getElementById('pag-forma').value||null,data_pagamento:document.getElementById('pag-recebido').value?document.getElementById('pag-data').value:null,observacoes:document.getElementById('pag-obs').value.trim()||null};
  const quitado=dados.valor_pago>=Math.max(dados.valor_servico-dados.desconto,0);
  try{if(id)await api.atualizarPagamento(id,dados);else await api.criarPagamento({...dados,agendamento_id:agendamentoId});if(quitado)await api.atualizarAgendamento(agendamentoId,{status:'concluido'});fecharModal();await atualizarSistema();mostrarToast(quitado?'Pagamento salvo e atendimento concluído.':'Pagamento salvo como pendente ou parcial.');}catch(err){mostrarToast(err.message);}
}

document.getElementById('busca-cliente').addEventListener('input',e=>carregarClientes(e.target.value));
async function carregarClientes(busca=''){
  const lista=document.getElementById('lista-clientes');try{clientesCache=await api.listarClientes(busca);lista.innerHTML=clientesCache.length?clientesCache.map(c=>`<article class="item-card"><div class="item-info"><strong>${escapar(c.nome)}</strong><span>${escapar(c.telefone||'Telefone não informado')}</span>${c.observacoes?`<span>${escapar(c.observacoes)}</span>`:''}</div><div class="acoes">${c.telefone?`<button onclick="abrirWhatsAppCliente(${c.id})">WhatsApp</button>`:''}<button onclick="abrirNovoAgendamento(${c.id})">Agendar</button><button onclick="editarCliente(${c.id})">Editar</button><button class="perigo" onclick="excluirCliente(${c.id})">Lixeira</button></div></article>`).join(''):'<p class="vazio">Nenhuma cliente cadastrada.</p>';}catch(err){lista.innerHTML=`<p class="vazio">${escapar(err.message)}</p>`;}
}
function formularioCliente(c={}){abrirModal(c.id?'Editar cliente':'Nova cliente',`<div class="campo"><label for="cli-nome">Nome completo</label><input id="cli-nome" value="${escapar(c.nome||'')}" placeholder="Ex.: Maria da Silva"></div><div class="campo"><label for="cli-telefone">Telefone / WhatsApp</label><input id="cli-telefone" value="${escapar(c.telefone||'')}" placeholder="(00) 00000-0000" inputmode="tel"></div><div class="campo"><label for="cli-obs">Preferências e observações</label><textarea id="cli-obs" placeholder="Ex.: cor usada, alergia, preferência...">${escapar(c.observacoes||'')}</textarea></div><div class="modal-botoes"><button class="btn-cancelar" onclick="fecharModal()">Voltar</button><button class="btn-confirmar" onclick="salvarCliente(${c.id?Number(c.id):'null'})">Salvar</button></div>`);document.getElementById('cli-nome').addEventListener('blur',e=>e.target.value=formatarNome(e.target.value));}
document.getElementById('btn-novo-cliente').addEventListener('click',()=>formularioCliente());function editarCliente(id){const c=clientesCache.find(x=>Number(x.id)===Number(id));if(c)formularioCliente(c);}
async function salvarCliente(id){const dados={nome:formatarNome(document.getElementById('cli-nome').value)||'Cliente sem nome',telefone:document.getElementById('cli-telefone').value.trim()||null,observacoes:document.getElementById('cli-obs').value.trim()||null};try{if(id)await api.atualizarCliente(id,dados);else await api.criarCliente(dados);fecharModal();await carregarClientes();await carregarCalendario();mostrarToast(id?'Cliente atualizada em todo o sistema.':'Cliente cadastrada.');}catch(err){mostrarToast(err.message);}}
async function excluirCliente(id){if(!confirm('Mover esta cliente para a lixeira por 3 dias?'))return;try{await api.moverClienteLixeira(id);await carregarClientes();mostrarToast('Cliente movida para a lixeira.');}catch(err){mostrarToast(err.message);}}
function abrirWhatsAppCliente(id){const c=clientesCache.find(x=>Number(x.id)===Number(id));const tel=telefoneWhatsApp(c?.telefone);if(!tel)return mostrarToast('Cadastre o telefone da cliente primeiro.');const msg=`Olá, ${c.nome}! Tudo bem? Aqui é a Lu, da Lu Fashion Hair. Como posso ajudar?`;window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`,'_blank','noopener');}

async function carregarLixeira(){
  const lista=document.getElementById('lista-lixeira');try{lixeiraCache=await api.listarLixeira();lista.innerHTML=lixeiraCache.length?lixeiraCache.map(c=>{const fim=new Date(new Date(c.deleted_at).getTime()+3*86400000);const horas=Math.max(0,Math.ceil((fim-new Date())/3600000));const prazo=horas>24?`${Math.ceil(horas/24)} dia(s)`:`${horas} hora(s)`;return `<article class="item-card cancelado"><div class="item-info"><strong>${escapar(c.nome)}</strong><span>Exclusão automática em aproximadamente ${prazo}</span></div><div class="acoes"><button onclick="restaurarCliente(${c.id})">Restaurar</button><button class="perigo" onclick="excluirClienteAgora(${c.id})">Excluir agora</button></div></article>`;}).join(''):'<p class="vazio">A lixeira está vazia.</p>';}catch(err){lista.innerHTML=`<p class="vazio">${escapar(err.message)}</p>`;}
}
async function restaurarCliente(id){try{await api.restaurarCliente(id);await carregarLixeira();await carregarClientes();mostrarToast('Cliente restaurada.');}catch(err){mostrarToast(err.message);}}
async function excluirClienteAgora(id){if(!confirm('Excluir definitivamente agora? Essa ação não pode ser desfeita.'))return;try{await api.excluirClienteAgora(id);await carregarLixeira();mostrarToast('Cliente excluída definitivamente.');}catch(err){mostrarToast(err.message);}}

async function carregarServicos(){const lista=document.getElementById('lista-servicos');try{servicosCache=await api.listarServicos();lista.innerHTML=servicosCache.length?servicosCache.map(s=>`<article class="item-card"><div class="item-info"><strong>${escapar(s.nome)}</strong><span>${duracaoTexto(s.duracao_minutos)} · ${s.preco==null?'Valor a definir':dinheiro(s.preco)}</span></div><div class="acoes"><button onclick="abrirNovoAgendamento(null,${s.id})">Agendar</button><button onclick="editarServico(${s.id})">Editar</button><button class="perigo" onclick="excluirServico(${s.id})">Excluir</button></div></article>`).join(''):'<p class="vazio">Nenhum serviço cadastrado.</p>';}catch(err){lista.innerHTML=`<p class="vazio">${escapar(err.message)}</p>`;}}
const modelosServico={progressiva:{nome:'Progressiva',duracao:180},semi:{nome:'Progressiva Semidefinitiva',duracao:180},alisamento:{nome:'Alisamento',duracao:180},blindagem:{nome:'Blindagem Box',duracao:120},corte:{nome:'Corte Feminino',duracao:60},escova:{nome:'Escova',duracao:60},coloracao:{nome:'Coloração',duracao:150},mechas:{nome:'Mechas / Luzes',duracao:240},hidratacao:{nome:'Hidratação',duracao:60},manicure:{nome:'Manicure',duracao:60},pedicure:{nome:'Pedicure',duracao:60},sobrancelha:{nome:'Design de Sobrancelhas',duracao:45}};
function formularioServico(s={}){const total=Number(s.duracao_minutos||60);const clientes=clientesCache.map(c=>`<option value="${c.id}">${escapar(c.nome)}</option>`).join('');abrirModal(s.id?'Editar serviço':'Novo serviço',`${!s.id?`<div class="campo"><label for="serv-modelo">Começar com um modelo</label><select id="serv-modelo"><option value="">Escolha ou preencha abaixo</option>${Object.entries(modelosServico).map(([k,v])=>`<option value="${k}">${v.nome}</option>`).join('')}</select></div>`:''}<div class="campo"><label for="serv-nome">Nome do serviço</label><input id="serv-nome" value="${escapar(s.nome||'')}" placeholder="Ex.: Progressiva"></div><div class="linha-campos"><div class="campo"><label>Tempo necessário</label><div class="linha-campos"><div><input type="number" id="serv-horas" min="0" max="24" value="${Math.floor(total/60)}"><small class="ajuda-campo">horas</small></div><div><input type="number" id="serv-minutos" min="0" max="59" value="${total%60}"><small class="ajuda-campo">minutos</small></div></div></div><div class="campo"><label for="serv-preco">Valor</label><div class="campo-dinheiro"><span>R$</span><input id="serv-preco" inputmode="decimal" value="${valorCampo(s.preco)}"></div></div></div>${!s.id?`<div><div class="linha-campos"><div class="campo"><label for="serv-data">Data</label><input type="date" id="serv-data" value="${hojeISO()}"></div><div class="campo"><label for="serv-hora">Horário</label><input type="time" id="serv-hora"></div></div><div class="campo"><label for="serv-cliente">Cliente cadastrada</label><select id="serv-cliente"><option value="">Sem cliente definida</option>${clientes}</select></div><button type="button" id="btn-cliente-rapida" class="btn-secundario">+ Adicionar nova cliente</button><div id="cliente-rapida-campos" class="oculto"><div class="linha-campos"><div class="campo"><label for="serv-cliente-nome">Nome</label><input id="serv-cliente-nome" placeholder="Nome da cliente"></div><div class="campo"><label for="serv-cliente-telefone">WhatsApp</label><input id="serv-cliente-telefone" inputmode="tel" placeholder="(00) 00000-0000"></div></div></div><p class="ajuda-campo">Ao salvar, o serviço aparecerá na Agenda. O que ficar vazio poderá ser completado depois.</p></div>`:''}<div class="modal-botoes"><button class="btn-cancelar" onclick="fecharModal()">Voltar</button><button class="btn-confirmar" onclick="salvarServico(${s.id?Number(s.id):'null'})">Salvar</button></div>`);document.getElementById('serv-modelo')?.addEventListener('change',e=>{const m=modelosServico[e.target.value];if(m){document.getElementById('serv-nome').value=m.nome;document.getElementById('serv-horas').value=Math.floor(m.duracao/60);document.getElementById('serv-minutos').value=m.duracao%60;}});document.getElementById('btn-cliente-rapida')?.addEventListener('click',()=>document.getElementById('cliente-rapida-campos').classList.toggle('oculto'));document.getElementById('serv-nome').addEventListener('blur',e=>e.target.value=formatarNome(e.target.value));}
document.getElementById('btn-novo-servico').addEventListener('click',()=>formularioServico());function editarServico(id){const s=servicosCache.find(x=>Number(x.id)===Number(id));if(s)formularioServico(s);}
async function salvarServico(id){const precoTexto=document.getElementById('serv-preco').value.trim();const duracaoInformada=Number(document.getElementById('serv-horas').value||0)*60+Number(document.getElementById('serv-minutos').value||0);const dados={nome:formatarNome(document.getElementById('serv-nome').value)||'Serviço sem nome',duracao_minutos:duracaoInformada>=1&&duracaoInformada<=1440?duracaoInformada:60,preco:precoTexto===''?null:parseDinheiro(precoTexto),ativo:true};const clienteId=!id?document.getElementById('serv-cliente').value:null;let cliente=clientesCache.find(c=>Number(c.id)===Number(clienteId));const data=!id?(document.getElementById('serv-data').value||hojeISO()):null;const hora=!id?document.getElementById('serv-hora').value:null;const novoNome=!id?formatarNome(document.getElementById('serv-cliente-nome').value):'';const novoTelefone=!id?document.getElementById('serv-cliente-telefone').value.trim():'';try{if(novoNome||novoTelefone){cliente=await api.criarCliente({nome:novoNome||'Cliente sem nome',telefone:novoTelefone||null});clientesCache.push(cliente);}const servico=id?await api.atualizarServico(id,dados):await api.criarServico(dados);if(!id)await api.criarAgendamento({cliente_id:cliente?.id||null,cliente_nome:cliente?.nome||'Cliente sem nome',servico_id:servico.id,servico_nome:servico.nome,data,hora:hora||null,duracao_minutos:servico.duracao_minutos,valor_servico:servico.preco,status:'agendado'});fecharModal();await atualizarSistema();mostrarToast(id?'Serviço atualizado em todo o sistema.':'Serviço salvo e colocado na Agenda.');}catch(err){mostrarToast(err.message);}}
async function excluirServico(id){const servico=servicosCache.find(s=>Number(s.id)===Number(id));if(!confirm('Excluir este serviço e retirar também seus atendimentos e pagamentos dos totais? Essa ação não pode ser desfeita.'))return;try{await api.excluirAgendamentosDoServico(id);if(servico?.nome)await api.excluirAgendamentosOrfaosPorNome(servico.nome);await api.excluirServico(id);await atualizarSistema();mostrarToast('Serviço, agenda e valores ligados foram excluídos.');}catch(err){mostrarToast(err.message);}}

document.getElementById('financeiro-mes').addEventListener('change',carregarFinanceiro);document.getElementById('despesas-mes').addEventListener('change',carregarDespesas);document.getElementById('resumo-mes').addEventListener('change',carregarResumos);
async function carregarFinanceiro(){
  const {inicio,fim}=periodoMes(document.getElementById('financeiro-mes').value);try{[pagamentosCache,despesasCache]=await Promise.all([api.listarPagamentosPeriodo(inicio,fim),api.listarDespesasPeriodo(inicio,fim)]);pagamentosCache=pagamentosCache.filter(p=>p.agendamentos);const recebido=pagamentosCache.reduce((s,p)=>s+Number(p.valor_pago||0),0);const pendente=pagamentosCache.filter(p=>!['cancelado','faltou'].includes(p.agendamentos.status)).reduce((s,p)=>s+pendentePagamento(p),0);const despesas=despesasCache.filter(d=>d.pago).reduce((s,d)=>s+Number(d.valor),0);document.getElementById('fin-recebido').textContent=dinheiro(recebido);document.getElementById('fin-pendente').textContent=dinheiro(pendente);document.getElementById('fin-despesas').textContent=dinheiro(despesas);document.getElementById('fin-saldo').textContent=dinheiro(recebido-despesas);desenharPagamentos();}catch(err){document.getElementById('lista-pagamentos').innerHTML=`<p class="vazio">${escapar(err.message)}</p>`;}
}
function desenharPagamentos(){document.getElementById('lista-pagamentos').innerHTML=pagamentosCache.length?pagamentosCache.map(p=>`<article class="item-card"><div class="item-info"><strong>${escapar(p.agendamentos.cliente_nome)}</strong><span>${formatarData(p.agendamentos.data)} · ${escapar(p.agendamentos.servico_nome)}</span><span>${p.status==='pago'?`${dinheiro(p.valor_pago)} recebido por ${escapar(p.forma_pagamento||'')}`:`${dinheiro(pendentePagamento(p))} pendente`}</span><span class="tag pagamento-${p.status}">${p.status==='pago'?'Pago':p.status==='parcial'?'Parcial':'Pendente'}</span></div><div class="acoes"><button onclick="abrirPagamentoFinanceiro(${p.id})">${p.status==='pago'?'Editar':'Receber'}</button><button class="perigo" onclick="excluirPagamento(${p.id})">Excluir</button></div></article>`).join(''):'<p class="vazio">Nenhum pagamento neste mês.</p>';}
function abrirPagamentoFinanceiro(id){const p=pagamentosCache.find(x=>Number(x.id)===Number(id));if(p)abrirPagamento(p.agendamento_id);}
async function excluirPagamento(id){if(!confirm('Excluir este pagamento? O atendimento continuará na agenda.'))return;try{await api.excluirPagamento(id);await atualizarSistema();mostrarToast('Pagamento excluído dos totais.');}catch(err){mostrarToast(err.message);}}
async function carregarDespesas(){const {inicio,fim}=periodoMes(document.getElementById('despesas-mes').value);try{despesasCache=await api.listarDespesasPeriodo(inicio,fim);const pagas=despesasCache.filter(d=>d.pago).reduce((s,d)=>s+Number(d.valor),0);const pendentes=despesasCache.filter(d=>!d.pago).reduce((s,d)=>s+Number(d.valor),0);document.getElementById('despesas-total').textContent=dinheiro(pagas);document.getElementById('despesas-pendentes').textContent=dinheiro(pendentes);desenharDespesas();}catch(err){document.getElementById('lista-despesas').innerHTML=`<p class="vazio">${escapar(err.message)}</p>`;}}
function desenharDespesas(){document.getElementById('lista-despesas').innerHTML=despesasCache.length?despesasCache.map(d=>`<article class="item-card"><div class="item-info"><strong>${escapar(d.descricao)}</strong><span>${formatarData(d.data)} · ${escapar(d.categoria)} · ${dinheiro(d.valor)}</span><span class="tag ${d.pago?'concluido':''}">${d.pago?'Paga':'Pendente'}</span></div><div class="acoes"><button onclick="editarDespesa(${d.id})">Editar</button><button class="perigo" onclick="excluirDespesa(${d.id})">Excluir</button></div></article>`).join(''):'<p class="vazio">Nenhuma despesa neste mês.</p>';}
function formularioDespesa(d={}){abrirModal(d.id?'Editar despesa':'Nova despesa',`<div class="campo"><label for="desp-descricao">Descrição</label><input id="desp-descricao" value="${escapar(d.descricao||'')}" placeholder="Ex.: Produtos para cabelo"></div><div class="linha-campos"><div class="campo"><label for="desp-valor">Valor</label><div class="campo-dinheiro"><span>R$</span><input id="desp-valor" inputmode="decimal" value="${valorCampo(d.valor)}" placeholder="0,00"></div></div><div class="campo"><label for="desp-data">Data</label><input type="date" id="desp-data" value="${d.data||hojeISO()}"></div></div><div class="campo"><label for="desp-categoria">Categoria</label><select id="desp-categoria">${[['produtos','Produtos'],['materiais','Materiais'],['aluguel','Aluguel'],['energia','Energia'],['agua','Água'],['internet','Internet'],['transporte','Transporte'],['manutencao','Manutenção'],['outros','Outros']].map(([v,t])=>`<option value="${v}" ${d.categoria===v?'selected':''}>${t}</option>`).join('')}</select></div><label class="check"><input type="checkbox" id="desp-pago" ${d.pago!==false?'checked':''}> Já foi paga</label><div class="campo"><label for="desp-obs">Observação</label><textarea id="desp-obs">${escapar(d.observacoes||'')}</textarea></div><div class="modal-botoes"><button class="btn-cancelar" onclick="fecharModal()">Voltar</button><button class="btn-confirmar" onclick="salvarDespesa(${d.id?Number(d.id):'null'})">Salvar</button></div>`);}
document.getElementById('btn-nova-despesa').addEventListener('click',()=>formularioDespesa());function editarDespesa(id){const d=despesasCache.find(x=>Number(x.id)===Number(id));if(d)formularioDespesa(d);}
async function salvarDespesa(id){const dados={descricao:formatarNome(document.getElementById('desp-descricao').value)||'Despesa sem descrição',valor:parseDinheiro(document.getElementById('desp-valor').value),data:document.getElementById('desp-data').value||hojeISO(),categoria:document.getElementById('desp-categoria').value||'outros',pago:document.getElementById('desp-pago').checked,observacoes:document.getElementById('desp-obs').value.trim()||null};try{if(id)await api.atualizarDespesa(id,dados);else await api.criarDespesa(dados);fecharModal();await atualizarSistema();mostrarToast('Despesa salva.');}catch(err){mostrarToast(err.message);}}
async function excluirDespesa(id){if(!confirm('Excluir esta despesa?'))return;try{await api.excluirDespesa(id);await atualizarSistema();mostrarToast('Despesa excluída.');}catch(err){mostrarToast(err.message);}}

async function carregarResumos(){
  const {inicio,fim}=periodoMes(document.getElementById('resumo-mes').value);try{const[agenda,pagamentos,despesas]=await Promise.all([api.listarAgendamentosPeriodo(inicio,fim),api.listarPagamentosPeriodo(inicio,fim),api.listarDespesasPeriodo(inicio,fim)]);const validos=agenda.filter(a=>!['cancelado','faltou'].includes(a.status));const agendados=agenda.filter(a=>['agendado','confirmado','em_andamento'].includes(a.status)).length;const concluidos=agenda.filter(a=>a.status==='concluido').length;const cancelados=agenda.filter(a=>['cancelado','faltou'].includes(a.status)).length;const recebidos=pagamentos.reduce((s,p)=>s+Number(p.valor_pago||0),0);const gastos=despesas.filter(d=>d.pago).reduce((s,d)=>s+Number(d.valor),0);document.getElementById('resumo-cards').innerHTML=`<article class="metrica"><span>Agendados</span><strong>${agendados}</strong><small>aguardando atendimento</small></article><article class="metrica"><span>Concluídos</span><strong>${concluidos}</strong><small>atendimentos finalizados</small></article><article class="metrica"><span>Cancelados</span><strong>${cancelados}</strong><small>inclui faltas antigas</small></article><article class="metrica destaque-verde"><span>Recebido</span><strong>${dinheiro(recebidos)}</strong><small>ticket médio ${dinheiro(concluidos?recebidos/concluidos:0)}</small></article><article class="metrica"><span>Despesas</span><strong>${dinheiro(gastos)}</strong><small>pagas no mês</small></article><article class="metrica"><span>Saldo</span><strong>${dinheiro(recebidos-gastos)}</strong><small>recebido menos despesas</small></article>`;desenharRanking('resumo-servicos',validos,'servico_nome');desenharRanking('resumo-clientes',validos,'cliente_nome');}catch(err){document.getElementById('resumo-cards').innerHTML=`<p class="vazio">${escapar(err.message)}</p>`;}
}
function desenharRanking(id,itens,campo){const contagem={};itens.forEach(i=>contagem[i[campo]]=(contagem[i[campo]]||0)+1);const ranking=Object.entries(contagem).sort((a,b)=>b[1]-a[1]).slice(0,8);document.getElementById(id).innerHTML=ranking.length?ranking.map(([nome,q],i)=>`<article class="ranking"><span>${i+1}</span><strong>${escapar(nome)}</strong><b>${q}</b></article>`).join(''):'<p class="vazio">Sem dados neste mês.</p>';}

async function atualizarSistema(){await carregarServicos();await carregarCalendario();await Promise.all([carregarAgenda(diaSelecionado),carregarInicio(),carregarFinanceiro(),carregarDespesas(),carregarResumos()]);}

if(getToken())setTimeout(()=>entrarNoPainel().catch(()=>{}),0);
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
