/* ============================================================
   GIBSON MANAGER PRO — CONTROLE DE COBRANÇAS
   pages-cobrancas.js  v1.0
   ============================================================ */

Pages.renderCobrancas = async function () {
    const el = document.getElementById('pageContent');
    el.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';

    // ── Carregar dados ─────────────────────────────────────────
    const [parcelas, eventos, artistas] = await Promise.all([
        ParcelasDB.listar(true),
        EventosDB.listar(),
        ArtistasDB.listar(),
    ]);

    const hoje     = new Date(); hoje.setHours(0,0,0,0);
    const em30     = new Date(hoje); em30.setDate(hoje.getDate() + 30);
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    // Enriquecer parcelas com info do evento/artista
    const enriched = parcelas.map(p => {
        const ev  = eventos.find(e => e.id === p.evento_id) || {};
        const art = artistas.find(a => a.id === ev.artista_id) || {};
        const venc = p.data_vencimento ? new Date(String(p.data_vencimento).slice(0,10) + 'T12:00:00') : null;
        venc && venc.setHours(0,0,0,0);

        let estado = 'futura';
        if (p.status === 'Pago') {
            estado = 'paga';
        } else if (venc && venc < hoje) {
            estado = 'atrasada';
        } else if (venc && venc >= hoje && venc <= em30) {
            estado = 'proxima';
        }

        return {
            ...p,
            _ev: ev,
            _art: art,
            _venc: venc,
            _estado: estado,
            _contratante: ev.razao_social || ev.nome_contratante || ev.contratante || '—',
            _artNome: art.nome || '—',
            _cidade: ev.cidade ? `${ev.cidade}${ev.estado ? '/' + ev.estado : ''}` : '—',
        };
    });

    // ── Totais ─────────────────────────────────────────────────
    const atrasadas = enriched.filter(p => p._estado === 'atrasada');
    const proximas  = enriched.filter(p => p._estado === 'proxima');
    const pagas     = enriched.filter(p => p._estado === 'paga');
    const futuras   = enriched.filter(p => p._estado === 'futura');
    const pagasMes  = pagas.filter(p => {
        if (!p.data_pagamento) return false;
        const d = new Date(String(p.data_pagamento).slice(0,10)+'T12:00:00');
        return d >= inicioMes && d <= fimMes;
    });

    const soma = arr => arr.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);

    const totalAtrasado  = soma(atrasadas);
    const totalProximo   = soma(proximas);
    const totalPagoMes   = soma(pagasMes);
    const totalPendente  = soma([...atrasadas, ...proximas, ...futuras]);

    // ── Estado do filtro (preservado em memória) ───────────────
    if (!Pages._cobrancasFiltro) Pages._cobrancasFiltro = 'todas';

    // ── HTML ───────────────────────────────────────────────────
    el.innerHTML = `
    <div class="cobrancas-page fade-in">

      <!-- Cabeçalho -->
      <div class="page-header mb-3" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div>
          <h2 style="margin:0;"><i class="fas fa-hand-holding-usd" style="color:var(--brand-primary);margin-right:8px;"></i>Controle de Cobranças</h2>
          <p class="text-muted" style="margin:4px 0 0;">Parcelas e recebimentos de todos os shows</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn-secondary" onclick="Pages.renderCobrancas()" title="Atualizar">
            <i class="fas fa-sync-alt"></i> Atualizar
          </button>
          <button class="btn-primary" onclick="Pages._cobExportarExcel()" title="Exportar Excel">
            <i class="fas fa-file-excel"></i> Exportar
          </button>
        </div>
      </div>

      <!-- Cards de resumo -->
      <div class="grid grid-4 mb-3">
        <div class="stat-card cobranca-card atrasada" style="cursor:pointer;" onclick="Pages._cobFiltrar('atrasadas')">
          <div class="stat-icon red"><i class="fas fa-exclamation-triangle"></i></div>
          <div class="stat-content">
            <h3>${Utils.formatCurrency(totalAtrasado)}</h3>
            <p>Atrasadas</p>
            <small>${atrasadas.length} parcela(s)</small>
          </div>
        </div>
        <div class="stat-card cobranca-card proxima" style="cursor:pointer;" onclick="Pages._cobFiltrar('proximas')">
          <div class="stat-icon yellow"><i class="fas fa-clock"></i></div>
          <div class="stat-content">
            <h3>${Utils.formatCurrency(totalProximo)}</h3>
            <p>Vencem em 30 dias</p>
            <small>${proximas.length} parcela(s)</small>
          </div>
        </div>
        <div class="stat-card cobranca-card paga" style="cursor:pointer;" onclick="Pages._cobFiltrar('pagas')">
          <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
          <div class="stat-content">
            <h3>${Utils.formatCurrency(totalPagoMes)}</h3>
            <p>Recebido no mês</p>
            <small>${pagasMes.length} parcela(s)</small>
          </div>
        </div>
        <div class="stat-card cobranca-card" style="cursor:pointer;" onclick="Pages._cobFiltrar('todas')">
          <div class="stat-icon blue"><i class="fas fa-dollar-sign"></i></div>
          <div class="stat-content">
            <h3>${Utils.formatCurrency(totalPendente)}</h3>
            <p>Total a receber</p>
            <small>${atrasadas.length + proximas.length + futuras.length} pendente(s)</small>
          </div>
        </div>
      </div>

      ${atrasadas.length > 0 ? `
      <div class="alert-banner" style="background:#fff0f0;border-left:4px solid var(--danger);padding:12px 18px;border-radius:4px;margin-bottom:20px;display:flex;align-items:center;gap:10px;">
        <i class="fas fa-exclamation-circle" style="color:var(--danger);font-size:18px;"></i>
        <span style="font-weight:600;color:var(--danger);">${atrasadas.length} parcela(s) em atraso</span>
        <span style="color:#666;font-size:13px;">— total de ${Utils.formatCurrency(totalAtrasado)} em aberto</span>
      </div>` : ''}

      <!-- Filtros -->
      <div class="card mb-3">
        <div class="card-body" style="padding:14px 18px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span style="font-size:13px;font-weight:600;color:var(--text-secondary);">Filtrar:</span>
            <div class="cob-filtros" style="display:flex;gap:6px;flex-wrap:wrap;">
              ${Pages._cobTabBtn('todas',     'Todas',              enriched.length)}
              ${Pages._cobTabBtn('atrasadas', 'Atrasadas',          atrasadas.length, 'danger')}
              ${Pages._cobTabBtn('proximas',  'Próximas (30 dias)', proximas.length,  'warning')}
              ${Pages._cobTabBtn('futuras',   'Futuras',            futuras.length)}
              ${Pages._cobTabBtn('pagas',     'Pagas',              pagas.length,     'success')}
            </div>
            <div style="margin-left:auto;">
              <input type="text" id="cobBusca" placeholder="Buscar contratante ou artista..." class="form-control" style="width:240px;font-size:13px;" oninput="Pages._cobBuscar(this.value)">
            </div>
          </div>
        </div>
      </div>

      <!-- Tabela -->
      <div class="card">
        <div class="card-body" style="padding:0;">
          <div id="cobTabelaWrap">
            ${Pages._cobRenderTabela(enriched, Pages._cobrancasFiltro, '')}
          </div>
        </div>
      </div>

    </div>`;

    // Guardar dados para reusar no filtro sem recarregar
    Pages._cobDados = enriched;

    // Ativar o botão do filtro atual
    Pages._cobAtivarTab(Pages._cobrancasFiltro);
};

// ── Render da tabela ────────────────────────────────────────────────────────
Pages._cobRenderTabela = function (dados, filtro, busca) {
    let lista = dados;

    if (filtro === 'atrasadas') lista = dados.filter(p => p._estado === 'atrasada');
    else if (filtro === 'proximas') lista = dados.filter(p => p._estado === 'proxima');
    else if (filtro === 'futuras')  lista = dados.filter(p => p._estado === 'futura');
    else if (filtro === 'pagas')    lista = dados.filter(p => p._estado === 'paga');

    if (busca) {
        const b = busca.toLowerCase();
        lista = lista.filter(p =>
            p._contratante.toLowerCase().includes(b) ||
            p._artNome.toLowerCase().includes(b) ||
            (p.descricao || '').toLowerCase().includes(b)
        );
    }

    // Ordenar: atrasadas primeiro, depois por vencimento
    lista.sort((a, b) => {
        const ordem = { atrasada: 0, proxima: 1, futura: 2, paga: 3 };
        if (ordem[a._estado] !== ordem[b._estado]) return ordem[a._estado] - ordem[b._estado];
        if (!a._venc && !b._venc) return 0;
        if (!a._venc) return 1;
        if (!b._venc) return -1;
        return a._venc - b._venc;
    });

    if (!lista.length) {
        return `<div style="text-align:center;padding:48px;color:var(--text-secondary);">
            <i class="fas fa-check-circle" style="font-size:36px;opacity:.3;margin-bottom:12px;display:block;"></i>
            Nenhuma parcela encontrada para este filtro.
        </div>`;
    }

    const linhas = lista.map(p => {
        const { cor, badge, icone } = Pages._cobEstadoStyle(p._estado);

        const diasAtraso = p._estado === 'atrasada' && p._venc
            ? Math.floor((new Date() - p._venc) / 86400000)
            : null;

        const diasVenc = (p._estado === 'proxima' || p._estado === 'futura') && p._venc
            ? Math.floor((p._venc - new Date()) / 86400000) + 1
            : null;

        const totalParc = p.total_parcelas || '?';
        const numParc   = p.numero_parcela || '—';
        const descParc  = p.descricao || `Parcela ${numParc}`;

        const whatsBtn = p._estado !== 'paga'
            ? `<button class="btn-icon" title="Copiar mensagem WhatsApp" onclick="Pages._cobCopiarWhats(${JSON.stringify(p).replace(/"/g, '&quot;')})" style="color:#25D366;">
                 <i class="fab fa-whatsapp"></i>
               </button>` : '';

        const pagarBtn = p._estado !== 'paga' && Auth.isAdmin()
            ? `<button class="btn-icon btn-success-icon" title="Marcar como recebido" onclick="Pages._cobMarcarPago('${p.id}')">
                 <i class="fas fa-check"></i>
               </button>` : '';

        const eventoBtn = p.evento_id
            ? `<button class="btn-icon" title="Ver evento" onclick="Pages.changePage('eventos')" style="color:var(--brand-primary);">
                 <i class="fas fa-external-link-alt"></i>
               </button>` : '';

        const dataPagoHtml = p._estado === 'paga' && p.data_pagamento
            ? `<div style="font-size:11px;color:var(--success);margin-top:2px;"><i class="fas fa-check"></i> Pago em ${new Date(String(p.data_pagamento).slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR')}</div>`
            : '';

        const atrasadoHtml = diasAtraso !== null
            ? `<div style="font-size:11px;color:var(--danger);font-weight:600;margin-top:2px;">${diasAtraso} dia(s) em atraso</div>` : '';

        const proximoHtml = diasVenc !== null && p._estado === 'proxima'
            ? `<div style="font-size:11px;color:#f59e0b;margin-top:2px;">vence em ${diasVenc} dia(s)</div>` : '';

        return `
        <tr style="border-left:3px solid ${cor};">
          <td style="padding:12px 14px;">
            <div style="font-weight:600;font-size:13px;">${p._artNome}</div>
            <div style="font-size:12px;color:var(--text-secondary);">${p._contratante}</div>
            <div style="font-size:11px;color:var(--text-secondary);">${p._cidade}</div>
          </td>
          <td style="padding:12px 14px;">
            <div style="font-size:13px;">${descParc}</div>
            <div style="font-size:11px;color:var(--text-secondary);">${numParc}ª de ${totalParc}</div>
          </td>
          <td style="padding:12px 14px;">
            <div style="font-size:13px;font-weight:600;">${p._venc ? Utils.formatDate(p.data_vencimento) : '—'}</div>
            ${atrasadoHtml}${proximoHtml}${dataPagoHtml}
          </td>
          <td style="padding:12px 14px;font-family:monospace;font-size:14px;font-weight:700;color:${p._estado === 'paga' ? 'var(--success)' : cor};">
            ${Utils.formatCurrency(p.valor)}
          </td>
          <td style="padding:12px 14px;">
            <span class="badge" style="background:${badge.bg};color:${badge.text};padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;">
              <i class="${icone}" style="margin-right:4px;"></i>${badge.label}
            </span>
          </td>
          <td style="padding:12px 14px;text-align:right;white-space:nowrap;">
            ${pagarBtn}${whatsBtn}${eventoBtn}
          </td>
        </tr>`;
    }).join('');

    return `
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:var(--bg-secondary);border-bottom:2px solid var(--border-color);">
          <th style="padding:11px 14px;text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--text-secondary);">Artista / Contratante</th>
          <th style="padding:11px 14px;text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--text-secondary);">Parcela</th>
          <th style="padding:11px 14px;text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--text-secondary);">Vencimento</th>
          <th style="padding:11px 14px;text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--text-secondary);">Valor</th>
          <th style="padding:11px 14px;text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--text-secondary);">Status</th>
          <th style="padding:11px 14px;text-align:right;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--text-secondary);">Ações</th>
        </tr>
      </thead>
      <tbody>
        ${linhas}
      </tbody>
    </table>`;
};

// ── Helpers de estilo ───────────────────────────────────────────────────────
Pages._cobEstadoStyle = function (estado) {
    const estilos = {
        atrasada: { cor: '#e8261c', badge: { bg: '#ffe4e1', text: '#c0392b', label: 'Atrasada' }, icone: 'fas fa-exclamation-circle' },
        proxima:  { cor: '#f59e0b', badge: { bg: '#fef3c7', text: '#92400e', label: 'A vencer'  }, icone: 'fas fa-clock' },
        futura:   { cor: '#6b7280', badge: { bg: '#f3f4f6', text: '#374151', label: 'Futura'    }, icone: 'fas fa-hourglass-half' },
        paga:     { cor: '#22c55e', badge: { bg: '#dcfce7', text: '#166534', label: 'Recebida'  }, icone: 'fas fa-check-circle' },
    };
    return estilos[estado] || estilos.futura;
};

Pages._cobTabBtn = function (id, label, count, variante) {
    const cores = { danger: '#e8261c', warning: '#f59e0b', success: '#22c55e' };
    const cor = variante ? cores[variante] : 'var(--brand-primary)';
    return `<button id="cobTab_${id}" class="btn-secondary cob-tab-btn" style="font-size:12px;padding:5px 12px;" onclick="Pages._cobFiltrar('${id}')">
        ${label} <span style="background:${cor};color:#fff;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:4px;">${count}</span>
    </button>`;
};

Pages._cobAtivarTab = function (filtro) {
    document.querySelectorAll('.cob-tab-btn').forEach(b => b.style.opacity = '0.55');
    const btn = document.getElementById('cobTab_' + filtro);
    if (btn) { btn.style.opacity = '1'; btn.style.fontWeight = '700'; }
};

Pages._cobFiltrar = function (filtro) {
    Pages._cobrancasFiltro = filtro;
    const busca = document.getElementById('cobBusca')?.value || '';
    document.getElementById('cobTabelaWrap').innerHTML = Pages._cobRenderTabela(Pages._cobDados || [], filtro, busca);
    Pages._cobAtivarTab(filtro);
};

Pages._cobBuscar = function (termo) {
    document.getElementById('cobTabelaWrap').innerHTML =
        Pages._cobRenderTabela(Pages._cobDados || [], Pages._cobrancasFiltro || 'todas', termo);
};

// ── Marcar como recebido ────────────────────────────────────────────────────
Pages._cobMarcarPago = async function (id) {
    if (!Auth.isAdmin()) {
        alert('Apenas usuários Admin Master podem confirmar recebimentos.');
        return;
    }
    if (!confirm('Confirmar recebimento desta parcela?')) return;
    try {
        await ParcelasDB.marcarPaga(id);
        await Pages.renderCobrancas();
    } catch (e) {
        alert('Erro ao marcar como pago: ' + e.message);
    }
};

// ── Copiar mensagem WhatsApp ────────────────────────────────────────────────
Pages._cobCopiarWhats = function (p) {
    const venc = p.data_vencimento
        ? new Date(p.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')
        : '(data a confirmar)';
    const valor = Utils.formatCurrency(p.valor);
    const contratante = p._contratante || 'prezado contratante';
    const artista = p._artNome || 'o artista';
    const desc = p.descricao || `Parcela ${p.numero_parcela || ''}`;

    const msg = `Olá, ${contratante}!\n\nPassando para lembrar que temos uma parcela referente ao show de *${artista}* com vencimento em *${venc}*.\n\n📌 *${desc}*\n💰 Valor: *${valor}*\n\nQualquer dúvida, estou à disposição!\n\nAtt,\nDFG Produções e Eventos`;

    navigator.clipboard.writeText(msg)
        .then(() => {
            // Toast rápido
            const t = document.createElement('div');
            t.textContent = '✅ Mensagem copiada! Cole no WhatsApp.';
            Object.assign(t.style, {
                position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)',
                background:'#1a1a2e', color:'#fff', padding:'10px 22px', borderRadius:'6px',
                fontWeight:'600', zIndex:'9999', fontSize:'14px', boxShadow:'0 4px 20px rgba(0,0,0,.3)'
            });
            document.body.appendChild(t);
            setTimeout(() => t.remove(), 2800);
        })
        .catch(() => alert(msg));
};

// ── Exportar Excel ──────────────────────────────────────────────────────────
Pages._cobExportarExcel = function () {
    const dados = (Pages._cobDados || []).filter(p => p._estado !== 'paga');
    if (!dados.length) { alert('Nenhuma parcela pendente para exportar.'); return; }

    const linhas = [['Artista','Contratante','Cidade','Parcela','Vencimento','Valor','Status']];
    dados.forEach(p => {
        const est = { atrasada: 'Atrasada', proxima: 'A vencer', futura: 'Futura', paga: 'Paga' };
        linhas.push([
            p._artNome,
            p._contratante,
            p._cidade,
            p.descricao || `Parcela ${p.numero_parcela}`,
            p.data_vencimento || '—',
            parseFloat(p.valor) || 0,
            est[p._estado] || p._estado,
        ]);
    });

    Utils.exportToExcel
        ? Utils.exportToExcel(dados.map(p => ({
            Artista: p._artNome,
            Contratante: p._contratante,
            Cidade: p._cidade,
            Parcela: p.descricao || `Parcela ${p.numero_parcela}`,
            Vencimento: p.data_vencimento || '—',
            Valor: parseFloat(p.valor) || 0,
            Status: { atrasada:'Atrasada', proxima:'A vencer', futura:'Futura', paga:'Paga' }[p._estado] || p._estado,
        })), 'cobrancas')
        : alert('Função de exportação não disponível.');
};
