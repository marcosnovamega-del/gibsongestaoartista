/* =============================================
   KSHOW — ARTISTA APP JS (DEFINITIVO)
   Auth por artista_id salvo no localStorage
   Sem username — só senha
   ============================================= */

const SB_URL = 'https://talaepizcasxzutytliv.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhbGFlcGl6Y2FzeHp1dHl0bGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTg2MjgsImV4cCI6MjA5Mzc5NDYyOH0.T6J0l48hbULilE2xEMDkqVpwd1t6gBFMgVEEQG9GhmM';

const H = () => ({
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
});

async function sbGet(table, params = {}) {
  const url = new URL(`${SB_URL}/rest/v1/${table}`);
  url.searchParams.set('select', '*');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, `eq.${v}`));
  const r = await fetch(url, { headers: H() });
  if (!r.ok) throw new Error(`Erro ${r.status} ao buscar ${table}`);
  return r.json();
}

async function sbPatch(table, id, data) {
  const url = `${SB_URL}/rest/v1/${table}?id=eq.${id}`;
  const r = await fetch(url, { method: 'PATCH', headers: H(), body: JSON.stringify(data) });
  if (!r.ok) throw new Error(`Erro ao salvar: ${await r.text()}`);
  return r.json();
}

// ── Armazenamento ──────────────────────────
const KEY_ARTISTA = 'kshow_ar_id';   // artista_id permanente
const KEY_SESS    = 'kshow_ar_sess'; // sessão (user + senha validada)

function saveArtistaId(id) { localStorage.setItem(KEY_ARTISTA, id); }
function getArtistaId()    { return localStorage.getItem(KEY_ARTISTA); }
function saveSess(obj)     { localStorage.setItem(KEY_SESS, JSON.stringify(obj)); }
function getSess()         { try { return JSON.parse(localStorage.getItem(KEY_SESS)); } catch { return null; } }
function clearAll()        { localStorage.removeItem(KEY_ARTISTA); localStorage.removeItem(KEY_SESS); }
function getParam(k)       { return new URLSearchParams(window.location.search).get(k); }

// ── Estado global ─────────────────────────
let artista = null;
let usuario = null;
let eventos = [];
let deferredPrompt = null;
let activeFilter   = 'proximos';

// ── Utils ─────────────────────────────────
const fmt  = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const mes  = d => ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][new Date(d).getMonth()];
const dia  = d => new Date(d).getDate();

function $id(id) { return document.getElementById(id); }

function showToast(msg, isErr = false) {
  const t = $id('toast');
  t.textContent = msg;
  t.style.background = isErr ? 'rgba(239,68,68,0.95)' : 'rgba(15,18,32,0.95)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

function loading(on) {
  $id('loadingScreen').style.display = on ? 'flex' : 'none';
}

function showScreen(id) {
  ['firstAccessScreen','loginScreen','app','detail'].forEach(s => {
    const el = $id(s);
    if (el) el.style.display = 'none';
  });
  const el = $id(id);
  if (!el) return;
  const isAuth = ['firstAccessScreen','loginScreen'].includes(id);
  el.style.display = isAuth ? 'flex' : 'block';
}

// ── CARREGAR ARTISTA ───────────────────────
async function loadArtista(artistaId) {
  const list = await sbGet('artistas', { id: artistaId });
  if (!list || !list.length) throw new Error('Artista não encontrado no sistema.');
  return list[0];
}

async function loadUsuario(artistaId) {
  const list = await sbGet('usuarios', { artista_vinculado: artistaId });
  return (list || []).find(u => u.nivel === 'Artista') || null;
}

async function loadEventos(artistaId) {
  try { return await sbGet('eventos', { artista_id: artistaId }); }
  catch { return []; }
}

// ── FLUXO PRINCIPAL ───────────────────────
async function init() {
  loading(true);
  const idParam = getParam('id');
  const sessao  = getSess();
  const idLocal = getArtistaId();

  // 1. QR/Link com ?id= → salvar id e iniciar
  if (idParam) {
    saveArtistaId(idParam);
    // Se já tem sessão válida para este artista → entrar direto
    if (sessao && sessao._artista_id === idParam) {
      try {
        artista = await loadArtista(idParam);
        usuario = { ...sessao };
        eventos = await loadEventos(idParam);
        loading(false);
        renderApp();
        return;
      } catch { /* cai no fluxo de senha */ }
    }
    await initComArtista(idParam);
    return;
  }

  // 2. PWA aberto pelo ícone (sem ?id=) — usar id salvo
  if (sessao) {
    const artId = sessao._artista_id || idLocal;
    if (artId) {
      try {
        artista = await loadArtista(artId);
        usuario = { ...sessao };
        eventos = await loadEventos(artId);
        loading(false);
        renderApp();
        return;
      } catch { clearAll(); }
    }
  }

  if (idLocal) {
    await initComArtista(idLocal);
    return;
  }

  // 3. Sem nada — pedir link
  loading(false);
  showScreen('loginScreen');
}

async function initComArtista(artistaId) {
  loading(true);
  try {
    artista = await loadArtista(artistaId);
    usuario = await loadUsuario(artistaId);

    if (!usuario) {
      loading(false);
      const el = $id('loginError');
      el.textContent = 'Acesso não configurado. Peça ao seu gerente para ativar seu acesso no sistema.';
      el.style.display = 'block';
      showScreen('loginScreen');
      return;
    }

    const isFirst = !usuario.password || !usuario.password.trim();

    // Preencher tela de primeiro acesso / senha
    $id('faAvatar').src = artista.foto ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(artista.nome)}&background=8B5CF6&color=fff&size=256`;
    $id('faName').textContent    = `Olá, ${artista.nome.split(' ')[0]}!`;
    $id('faSubtitle').textContent = isFirst
      ? 'Crie sua senha para acessar sua agenda de shows.'
      : 'Digite sua senha para entrar.';
    $id('faPasswordLabel').textContent = isFirst ? 'Criar senha' : 'Senha';
    $id('faConfirmRow').style.display  = isFirst ? 'block' : 'none';
    $id('faSubmitBtn').textContent     = isFirst ? 'Criar e entrar' : 'Entrar';

    loading(false);
    showScreen('firstAccessScreen');

    $id('faForm').onsubmit = (e) => { e.preventDefault(); submitSenha(isFirst); };

  } catch(err) {
    loading(false);
    const el = $id('loginError');
    el.textContent = err.message;
    el.style.display = 'block';
    showScreen('loginScreen');
  }
}

async function submitSenha(isFirst) {
  const pwd  = $id('faPassword').value;
  const conf = $id('faConfirm').value;
  const err  = $id('faError');
  err.style.display = 'none';

  if (!pwd || pwd.length < 4) {
    err.textContent = 'Senha precisa ter pelo menos 4 caracteres.'; err.style.display='block'; return;
  }
  if (isFirst && pwd !== conf) {
    err.textContent = 'As senhas não coincidem.'; err.style.display='block'; return;
  }
  if (!isFirst && pwd !== usuario.password) {
    err.textContent = 'Senha incorreta.'; err.style.display='block'; return;
  }

  loading(true);
  try {
    if (isFirst) {
      // Salvar senha no banco
      const result = await sbPatch('usuarios', usuario.id, { password: pwd });
      // Verificar se realmente salvou
      const verificado = await sbGet('usuarios', { id: usuario.id });
      const u = verificado[0];
      if (!u || u.password !== pwd) {
        throw new Error('Falha ao salvar senha. Verifique as permissões do banco.');
      }
      usuario = { ...u };
    }
    saveSess({ ...usuario, _artista_id: artista.id });
    eventos = await loadEventos(artista.id);
    loading(false);
    renderApp();
  } catch(e) {
    loading(false);
    err.textContent = e.message || 'Erro ao salvar. Tente novamente.';
    err.style.display = 'block';
  }
}

// ── RENDER APP ────────────────────────────
function renderApp() {
  const name = artista.nome.split(' ')[0];
  const foto = artista.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(artista.nome)}&background=8B5CF6&color=fff&size=256`;
  $id('headerName').textContent = `Olá, ${name}!`;
  $id('headerSub').textContent  = `${eventos.length} show${eventos.length!==1?'s':''} na agenda`;
  $id('userAvatar').src         = foto;
  renderHome();
  showScreen('app');
}

function renderHome() {
  const now  = new Date(); now.setHours(0,0,0,0);
  const prox = eventos.filter(e => new Date(e.data) >= now).sort((a,b)=>new Date(a.data)-new Date(b.data));
  const past  = eventos.filter(e => new Date(e.data) <  now).sort((a,b)=>new Date(b.data)-new Date(a.data));

  $id('statProximos').textContent = prox.length;
  $id('statTotal').textContent    = eventos.length;

  const pSec = $id('proximoSection');
  if (prox.length > 0) {
    const p = prox[0];
    pSec.style.display = 'block';
    $id('proximoCard').innerHTML = `
      <div class="nc-pill"><i class="fas fa-star" style="font-size:9px;"></i> Próxima parada</div>
      <div class="nc-city">${p.cidade} — ${p.estado}</div>
      <div class="nc-venue">${p.local}</div>
      <div class="nc-meta">
        <div class="nc-meta-item"><i class="fas fa-calendar-alt"></i>${fmt(p.data)}</div>
        <div class="nc-meta-item"><i class="fas fa-clock"></i>${p.horario||'A definir'}</div>
      </div>`;
    $id('proximoCard').onclick = () => renderDetail(p);
  } else {
    pSec.style.display = 'none';
  }

  const lista = activeFilter === 'proximos' ? prox : past;
  renderLista(lista, activeFilter === 'historico');
}

function setFilter(f) {
  activeFilter = f;
  document.querySelectorAll('.filter-chip').forEach(el => el.classList.toggle('active', el.dataset.f === f));
  renderHome();
}

function renderLista(evs, isPast) {
  const el = $id('showList');
  if (!evs.length) {
    el.innerHTML = `<div class="empty-state">
      <span class="empty-icon"><i class="fas fa-calendar-times"></i></span>
      <p class="empty-text">${isPast?'Nenhum show realizado.':'Nenhum show agendado.'}</p></div>`;
    return;
  }
  el.innerHTML = evs.map((e,i) => `
    <div class="show-item${isPast?' past':''}" style="animation-delay:${i*.04}s"
         onclick='renderDetail(${JSON.stringify(e)})'>
      <div class="show-date-box">
        <div class="show-day">${dia(e.data)}</div>
        <div class="show-month">${mes(e.data)}</div>
      </div>
      <div class="show-divider"></div>
      <div class="show-info">
        <div class="show-city">${e.cidade} — ${e.estado}</div>
        <div class="show-venue">${e.local}</div>
      </div>
      <i class="fas fa-chevron-right show-arrow"></i>
    </div>`).join('');
}

function renderDetail(ev) {
  if (typeof ev === 'string') ev = JSON.parse(ev);
  document.querySelector('#detail .detail-city-text').textContent  = `${ev.cidade} / ${ev.estado}`;
  document.querySelector('#detail .detail-venue-text').textContent = ev.local;

  $id('detailBody').innerHTML = [
    { icon:'fa-calendar-alt',   label:'Data',         val: fmt(ev.data) },
    { icon:'fa-clock',          label:'Horário',       val: ev.horario||'A definir' },
    { icon:'fa-map-marker-alt', label:'Endereço',      val: ev.endereco||'Não informado' },
    ev.responsavel ? { icon:'fa-user-tie', label:'Responsável', val: ev.responsavel } : null,
    ev.tipo_evento ? { icon:'fa-tag',      label:'Tipo',        val: ev.tipo_evento } : null,
  ].filter(Boolean).map((r,i)=>`
    <div class="info-card" style="animation-delay:${i*.05}s">
      <div class="info-icon"><i class="fas ${r.icon}"></i></div>
      <div><div class="info-label">${r.label}</div><div class="info-value">${r.val}</div></div>
    </div>`).join('');

  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((ev.endereco||ev.local)+' '+ev.cidade)}`;
  const tel  = (ev.telefone_contratante||'').replace(/\D/g,'');
  const wa   = tel.length>=10 ? `https://wa.me/55${tel}` : null;

  $id('actionRow').innerHTML = `
    <button class="btn-action btn-maps" onclick="window.open('${maps}','_blank')">
      <i class="fas fa-map-marked-alt"></i> Como Chegar
    </button>
    ${wa ? `<button class="btn-action btn-whats" onclick="window.open('${wa}','_blank')">
      <i class="fab fa-whatsapp"></i> Contato</button>` : '<div></div>'}`;

  showScreen('detail');
}

function goBack() { showScreen('app'); }

function doLogout() {
  if (!confirm('Sair do app?')) return;
  clearAll();
  artista = usuario = null;
  eventos = [];
  showScreen('loginScreen');
}

// ── PWA ───────────────────────────────────
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e;
  document.querySelectorAll('.install-btn').forEach(b => b.style.display='flex');
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  document.querySelectorAll('.install-btn').forEach(b => b.style.display='none');
});
async function triggerInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isStandalone = () => window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

// ── INIT ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator)
    navigator.serviceWorker.register('./sw-artista.js').catch(()=>{});

  if (isIOS() && !isStandalone())
    document.querySelectorAll('.ios-hint').forEach(el => el.style.display='block');

  // Login manual (fallback quando não tem artista_id salvo)
  $id('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const user = $id('loginUsername').value.trim();
    const pass = $id('loginPassword').value;
    const errEl = $id('loginError');
    errEl.style.display = 'none';
    if (!user || !pass) { errEl.textContent='Preencha os campos.'; errEl.style.display='block'; return; }
    loading(true);
    try {
      const todos = await sbGet('usuarios');
      const u = todos.find(u => u.username===user && u.password===pass && u.ativo && u.nivel==='Artista');
      if (!u) throw new Error('Usuário não encontrado ou senha incorreta.');
      const artId = u.artista_vinculado;
      if (!artId) throw new Error('Usuário sem artista vinculado. Contate o gerente.');
      saveArtistaId(artId);
      saveSess({ ...u, _artista_id: artId });
      artista = await loadArtista(artId);
      usuario = u;
      eventos = await loadEventos(artId);
      loading(false);
      renderApp();
    } catch(err) {
      loading(false);
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    }
  });

  init();
});
