/* ========================================
   GIBSON MANAGER PRO - RELATÓRIOS CONSOLIDADOS
   KPIs anuais, gráfico mensal, funil de vendas,
   ranking por artista, por cidade, inadimplência
======================================== */

Pages.renderRelatoriosConsolidados = async function (anoParam, artistaFiltroParam) {
    const pc = document.getElementById('pageContent');
    pc.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';

    const hoje  = new Date();
    const ano   = anoParam ? parseInt(anoParam) : hoje.getFullYear();
    const artistaFiltro = artistaFiltroParam || 'todos';

    // ── Carregar dados ──────────────────────────────────────────
    const escritorioId = window.Auth?.currentUser?.escritorio_id || null;
    const buildQ = (table) => {
        let q = sbClient.from(table).select('*');
        if (escritorioId) q = q.eq('escritorio_id', escritorioId);
        return q;
    };

    const [
        { data: todosEvts    = [] },
        { data: artistas     = [] },
        { data: todasProps   = [] },
        { data: todasParc    = [] },
        { data: despesas     = [] },
    ] = await Promise.all([
        buildQ('eventos'),
        buildQ('artistas'),
        buildQ('propostas'),
        buildQ('parcelas'),
        buildQ('despesas'),
    ]);

    // ── Filtros ─────────────────────────────────────────────────
    const artMap = {};
    artistas.forEach(a => { artMap[a.id] = a.nome; });

    // Eventos do ano selecionado
    const eventosAno = todosEvts.filter(e => {
        if (!e.data) return false;
        const d = new Date(e.data + 'T12:00:00');
        const matchAno = d.getFullYear() === ano;
        const matchArt = artistaFiltro === 'todos' || e.artista_id === artistaFiltro;
        return matchAno && matchArt;
    });

    const STATUS_REALIZADO = ['Realizado', 'Concluído', 'Encerrado', 'Finalizado'];
    const STATUS_CONFIRMADO = ['Confirmado', 'Fechado', 'Contrato Assinado'];
    const STATUS_ATIVO = [...STATUS_REALIZADO, ...STATUS_CONFIRMADO];

    // Propostas do ano
    const propostas = todasProps.filter(p => {
        const d = new Date((p.data_evento || p.created_at || '').slice(0, 10) + 'T12:00:00');
        const matchAno = d.getFullYear() === ano;
        const matchArt = artistaFiltro === 'todos' || p.artista_id === artistaFiltro;
        return matchAno && matchArt;
    });

    // Parcelas do ano
    const parcelas = todasParc.filter(p => {
        if (!p.data_vencimento) return false;
        const d = new Date(String(p.data_vencimento).slice(0, 10) + 'T12:00:00');
        return d.getFullYear() === ano;
    });

    // ── KPIs globais ────────────────────────────────────────────
    const showsTotal      = eventosAno.length;
    const showsRealizados = eventosAno.filter(e => STATUS_REALIZADO.includes(e.status)).length;
    const showsConfirm    = eventosAno.filter(e => STATUS_CONFIRMADO.includes(e.status)).length;
    const showsAtivos     = eventosAno.filter(e => STATUS_ATIVO.includes(e.status));

    const faturamentoBruto  = showsAtivos.reduce((s, e) => s + (parseFloat(e.cache_bruto) || 0), 0);
    const comissaoTotal     = showsAtivos.reduce((s, e) => s + (parseFloat(e.comissao) || 0), 0);
    const faturamentoLiq    = faturamentoBruto - comissaoTotal;
    const ticketMedio       = showsAtivos.length > 0 ? faturamentoBruto / showsAtivos.length : 0;

    const parcPagas     = parcelas.filter(p => p.status === 'Pago');
    const parcAtrasadas = parcelas.filter(p => p.status !== 'Pago' && p.data_vencimento &&
        new Date(String(p.data_vencimento).slice(0,10) + 'T12:00:00') < hoje);

    const totalRecebido    = parcPagas.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
    const totalAtrasado    = parcAtrasadas.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
    const totalAReceber    = parcelas.filter(p => p.status !== 'Pago').reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
    const txInadimplencia  = (totalRecebido + totalAtrasado) > 0
        ? (totalAtrasado / (totalRecebido + totalAtrasado) * 100).toFixed(1) : 0;

    // Funil de vendas
    const propRascunho  = propostas.filter(p => p.status === 'Rascunho').length;
    const propEnviada   = propostas.filter(p => p.status === 'Enviada').length;
    const propAceita    = propostas.filter(p => p.status === 'Aceita').length;
    const propRecusada  = propostas.filter(p => p.status === 'Recusada').length;
    const propTotal     = propostas.length;
    const txConversao   = propTotal > 0 ? (propAceita / propTotal * 100).toFixed(1) : 0;

    // ── Dados por mês (para gráfico) ─────────────────────────────
    const mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const dadosMensais = mesesNomes.map((_, m) => {
        const evsMes = eventosAno.filter(e => new Date(e.data + 'T12:00:00').getMonth() === m);
        const brutoMes  = evsMes.filter(e => STATUS_ATIVO.includes(e.status)).reduce((s, e) => s + (parseFloat(e.cache_bruto) || 0), 0);
        const showsMes  = evsMes.filter(e => STATUS_ATIVO.includes(e.status)).length;
        const recebMes  = parcelas.filter(p => {
            const d = new Date(String(p.data_vencimento).slice(0,10) + 'T12:00:00');
            return p.status === 'Pago' && d.getMonth() === m;
        }).reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
        return { mes: mesesNomes[m], bruto: brutoMes, shows: showsMes, recebido: recebMes };
    });

    // ── Ranking por artista ──────────────────────────────────────
    const porArtista = {};
    showsAtivos.forEach(e => {
        const id = e.artista_id;
        if (!id) return;
        if (!porArtista[id]) porArtista[id] = { nome: artMap[id] || 'Desconhecido', shows: 0, bruto: 0, liquido: 0 };
        porArtista[id].shows++;
        porArtista[id].bruto   += parseFloat(e.cache_bruto) || 0;
        porArtista[id].liquido += (parseFloat(e.cache_bruto) || 0) - (parseFloat(e.comissao) || 0);
    });
    const rankingArtistas = Object.values(porArtista).sort((a, b) => b.bruto - a.bruto);

    // ── Ranking por cidade ───────────────────────────────────────
    const porCidade = {};
    showsAtivos.forEach(e => {
        const cidade = (e.cidade || 'Não informada').trim();
        if (!porCidade[cidade]) porCidade[cidade] = { shows: 0, bruto: 0 };
        porCidade[cidade].shows++;
        porCidade[cidade].bruto += parseFloat(e.cache_bruto) || 0;
    });
    const rankingCidades = Object.entries(porCidade)
        .map(([nome, d]) => ({ nome, ...d }))
        .sort((a, b) => b.shows - a.shows)
        .slice(0, 10);

    // ── Breakdown por status ─────────────────────────────────────
    const statusCount = {};
    eventosAno.forEach(e => {
        const st = e.status || 'Sem status';
        if (!statusCount[st]) statusCount[st] = { count: 0, bruto: 0 };
        statusCount[st].count++;
        statusCount[st].bruto += parseFloat(e.cache_bruto) || 0;
    });

    const anosDisp = [ano - 2, ano - 1, ano, ano + 1];

    // ── HTML ────────────────────────────────────────────────────
    const html = `
<div class="relatorios-page" style="padding:24px;max-width:1200px;margin:0 auto;">

    <!-- HEADER -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:28px;">
        <div>
            <h2 style="font-size:22px;font-weight:700;display:flex;align-items:center;gap:10px;margin:0 0 6px;">
                <i class="fas fa-chart-bar" style="color:var(--red-primary,#e8261c);"></i>
                Relatórios Consolidados
            </h2>
            <p style="color:var(--text-muted,#888);font-size:13px;margin:0;">
                Visão geral de performance — ano ${ano}
            </p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <select id="relArtista" onchange="Pages._mudarFiltroRelatorio()"
                style="background:var(--card-bg,#1a1a1a);color:var(--text-primary,#fff);border:1px solid var(--border-color,#333);border-radius:8px;padding:8px 12px;font-size:13px;">
                <option value="todos" ${artistaFiltro==='todos'?'selected':''}>Todos os Artistas</option>
                ${artistas.map(a => `<option value="${a.id}" ${artistaFiltro===a.id?'selected':''}>${a.nome}</option>`).join('')}
            </select>
            <select id="relAno" onchange="Pages._mudarFiltroRelatorio()"
                style="background:var(--card-bg,#1a1a1a);color:var(--text-primary,#fff);border:1px solid var(--border-color,#333);border-radius:8px;padding:8px 12px;font-size:13px;">
                ${anosDisp.map(a => `<option value="${a}" ${a===ano?'selected':''}>${a}</option>`).join('')}
            </select>
            <button onclick="Pages._exportarRelatoriosPDF()" class="btn-secondary" style="display:flex;align-items:center;gap:6px;">
                <i class="fas fa-file-pdf"></i> PDF
            </button>
        </div>
    </div>

    <!-- KPIs LINHA 1 -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:14px;">
        ${_relKpi('fas fa-calendar-check','#3B82F6',showsTotal + ' shows','No ano · ' + showsRealizados + ' realizados · ' + showsConfirm + ' confirmados')}
        ${_relKpi('fas fa-dollar-sign','#8B5CF6',Utils.formatCurrency(faturamentoBruto),'Cachê bruto total')}
        ${_relKpi('fas fa-hand-holding-usd','#10B981',Utils.formatCurrency(faturamentoLiq),'Cachê líquido (- comissão)')}
        ${_relKpi('fas fa-ticket-alt','#F59E0B',Utils.formatCurrency(ticketMedio),'Ticket médio por show')}
    </div>

    <!-- KPIs LINHA 2 -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:24px;">
        ${_relKpi('fas fa-check-circle','#10B981',Utils.formatCurrency(totalRecebido),'Total recebido (parcelas pagas)')}
        ${_relKpi('fas fa-clock','#F59E0B',Utils.formatCurrency(totalAReceber - totalAtrasado),'A receber (no prazo)')}
        ${_relKpi('fas fa-exclamation-triangle','#EF4444',Utils.formatCurrency(totalAtrasado),'Em atraso · ' + txInadimplencia + '% inadimplência')}
        ${_relKpi('fas fa-percentage','#EC4899',txConversao + '%','Taxa de conversão propostas')}
    </div>

    <!-- GRÁFICO MENSAL + FUNIL -->
    <div style="display:grid;grid-template-columns:1fr 340px;gap:16px;margin-bottom:24px;" class="rel-grid-responsive">

        <!-- Gráfico -->
        <div class="card" style="padding:20px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                <h3 style="font-size:15px;font-weight:700;margin:0;display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-chart-line" style="color:var(--red-primary,#e8261c);"></i>
                    Faturamento Mensal ${ano}
                </h3>
                <div style="display:flex;gap:12px;font-size:11px;color:var(--text-muted,#888);">
                    <span><span style="display:inline-block;width:10px;height:10px;background:#8B5CF6;border-radius:2px;margin-right:4px;"></span>Cachê bruto</span>
                    <span><span style="display:inline-block;width:10px;height:10px;background:#10B981;border-radius:2px;margin-right:4px;"></span>Recebido</span>
                </div>
            </div>
            <canvas id="relGraficoMensal" height="220"></canvas>
        </div>

        <!-- Funil de Vendas -->
        <div class="card" style="padding:20px;">
            <h3 style="font-size:15px;font-weight:700;margin:0 0 16px;display:flex;align-items:center;gap:8px;">
                <i class="fas fa-filter" style="color:var(--red-primary,#e8261c);"></i>
                Funil de Propostas ${ano}
            </h3>
            ${_relFunilItem('Rascunho', propRascunho, propTotal, '#9CA3AF', 'fas fa-file-alt')}
            ${_relFunilItem('Enviada / Negociando', propEnviada, propTotal, '#F59E0B', 'fas fa-paper-plane')}
            ${_relFunilItem('Aceita / Fechada', propAceita, propTotal, '#10B981', 'fas fa-check-circle')}
            ${_relFunilItem('Recusada', propRecusada, propTotal, '#EF4444', 'fas fa-times-circle')}
            <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border-color,#333);display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:12px;color:var(--text-muted,#888);">Total de propostas</span>
                <strong style="font-size:16px;">${propTotal}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                <span style="font-size:12px;color:var(--text-muted,#888);">Taxa de conversão</span>
                <strong style="font-size:16px;color:#10B981;">${txConversao}%</strong>
            </div>
        </div>
    </div>

    <!-- RANKING ARTISTAS + CIDADES -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;" class="rel-grid-responsive">

        <!-- Ranking artistas -->
        <div class="card" style="padding:20px;">
            <h3 style="font-size:15px;font-weight:700;margin:0 0 16px;display:flex;align-items:center;gap:8px;">
                <i class="fas fa-microphone" style="color:var(--red-primary,#e8261c);"></i>
                Ranking por Artista
            </h3>
            ${rankingArtistas.length === 0
                ? '<p style="color:var(--text-muted,#888);font-size:13px;">Nenhum dado para o período.</p>'
                : rankingArtistas.map((a, i) => `
                <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-color,#222);">
                    <div style="width:24px;height:24px;border-radius:50%;background:${i===0?'#F59E0B':i===1?'#9CA3AF':i===2?'#B45309':'#333'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;">${i+1}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.nome}</div>
                        <div style="font-size:11px;color:var(--text-muted,#888);">${a.shows} show${a.shows!==1?'s':''}</div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                        <div style="font-weight:700;font-size:13px;">${Utils.formatCurrency(a.bruto)}</div>
                        <div style="font-size:11px;color:#10B981;">liq: ${Utils.formatCurrency(a.liquido)}</div>
                    </div>
                </div>`).join('')}
        </div>

        <!-- Ranking cidades -->
        <div class="card" style="padding:20px;">
            <h3 style="font-size:15px;font-weight:700;margin:0 0 16px;display:flex;align-items:center;gap:8px;">
                <i class="fas fa-map-marker-alt" style="color:var(--red-primary,#e8261c);"></i>
                Top 10 Cidades
            </h3>
            ${rankingCidades.length === 0
                ? '<p style="color:var(--text-muted,#888);font-size:13px;">Nenhum dado para o período.</p>'
                : rankingCidades.map((c, i) => {
                    const maxShows = rankingCidades[0].shows || 1;
                    const pct = Math.round((c.shows / maxShows) * 100);
                    return `
                    <div style="margin-bottom:10px;">
                        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
                            <span style="font-size:13px;font-weight:${i===0?'700':'500'};">${i+1}. ${c.nome}</span>
                            <span style="font-size:12px;color:var(--text-muted,#888);">${c.shows} show${c.shows!==1?'s':''} · ${Utils.formatCurrency(c.bruto)}</span>
                        </div>
                        <div style="height:6px;background:var(--border-color,#222);border-radius:3px;overflow:hidden;">
                            <div style="height:100%;width:${pct}%;background:var(--red-primary,#e8261c);border-radius:3px;transition:width .4s;"></div>
                        </div>
                    </div>`;
                }).join('')}
        </div>
    </div>

    <!-- BREAKDOWN POR STATUS + INADIMPLÊNCIA -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;" class="rel-grid-responsive">

        <!-- Status dos shows -->
        <div class="card" style="padding:20px;">
            <h3 style="font-size:15px;font-weight:700;margin:0 0 16px;display:flex;align-items:center;gap:8px;">
                <i class="fas fa-layer-group" style="color:var(--red-primary,#e8261c);"></i>
                Shows por Status
            </h3>
            ${Object.entries(statusCount).sort((a,b)=>b[1].count-a[1].count).map(([st, d]) => {
                const cor = STATUS_REALIZADO.includes(st) ? '#10B981'
                    : STATUS_CONFIRMADO.includes(st) ? '#3B82F6'
                    : st === 'Reserva' ? '#8B5CF6'
                    : st === 'Cancelado' ? '#EF4444'
                    : '#9CA3AF';
                return `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color,#222);">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="width:8px;height:8px;border-radius:50%;background:${cor};display:inline-block;"></span>
                        <span style="font-size:13px;">${st}</span>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-weight:700;font-size:13px;">${d.count}</span>
                        ${d.bruto > 0 ? `<span style="font-size:11px;color:var(--text-muted,#888);margin-left:8px;">${Utils.formatCurrency(d.bruto)}</span>` : ''}
                    </div>
                </div>`;
            }).join('')}
        </div>

        <!-- Inadimplência -->
        <div class="card" style="padding:20px;">
            <h3 style="font-size:15px;font-weight:700;margin:0 0 16px;display:flex;align-items:center;gap:8px;">
                <i class="fas fa-exclamation-circle" style="color:#EF4444;"></i>
                Recebimento e Inadimplência
            </h3>

            <!-- Barra de recebimento -->
            ${(() => {
                const totalParcelas = totalRecebido + totalAtrasado + (totalAReceber - totalAtrasado);
                const pctPago     = totalParcelas > 0 ? (totalRecebido / totalParcelas * 100).toFixed(1) : 0;
                const pctAtrasado = totalParcelas > 0 ? (totalAtrasado / totalParcelas * 100).toFixed(1) : 0;
                const pctFuturo   = totalParcelas > 0 ? ((totalAReceber - totalAtrasado) / totalParcelas * 100).toFixed(1) : 0;
                return `
                <div style="margin-bottom:20px;">
                    <div style="display:flex;height:20px;border-radius:10px;overflow:hidden;gap:2px;margin-bottom:8px;">
                        <div style="width:${pctPago}%;background:#10B981;transition:width .4s;" title="Pago: ${pctPago}%"></div>
                        <div style="width:${pctFuturo}%;background:#F59E0B;transition:width .4s;" title="A receber: ${pctFuturo}%"></div>
                        <div style="width:${pctAtrasado}%;background:#EF4444;transition:width .4s;" title="Atrasado: ${pctAtrasado}%"></div>
                    </div>
                    <div style="display:flex;gap:16px;flex-wrap:wrap;">
                        <span style="font-size:11px;color:#10B981;"><span style="display:inline-block;width:8px;height:8px;background:#10B981;border-radius:2px;margin-right:4px;"></span>Recebido ${pctPago}%</span>
                        <span style="font-size:11px;color:#F59E0B;"><span style="display:inline-block;width:8px;height:8px;background:#F59E0B;border-radius:2px;margin-right:4px;"></span>A receber ${pctFuturo}%</span>
                        <span style="font-size:11px;color:#EF4444;"><span style="display:inline-block;width:8px;height:8px;background:#EF4444;border-radius:2px;margin-right:4px;"></span>Atrasado ${pctAtrasado}%</span>
                    </div>
                </div>`;
            })()}

            <!-- Métricas de inadimplência -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:12px;">
                    <div style="font-size:18px;font-weight:700;color:#10B981;">${Utils.formatCurrency(totalRecebido)}</div>
                    <div style="font-size:11px;color:var(--text-muted,#888);margin-top:2px;">Total recebido</div>
                </div>
                <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:12px;">
                    <div style="font-size:18px;font-weight:700;color:#EF4444;">${Utils.formatCurrency(totalAtrasado)}</div>
                    <div style="font-size:11px;color:var(--text-muted,#888);margin-top:2px;">Em atraso · ${txInadimplencia}%</div>
                </div>
            </div>

            <!-- Parcelas atrasadas -->
            <div style="margin-top:8px;">
                <div style="font-size:12px;color:var(--text-muted,#888);margin-bottom:8px;">
                    <i class="fas fa-list"></i> ${parcAtrasadas.length} parcela${parcAtrasadas.length!==1?'s':''} vencida${parcAtrasadas.length!==1?'s':''}
                </div>
                ${parcAtrasadas.slice(0, 5).map(p => {
                    const ev = todosEvts.find(e => e.id === p.evento_id);
                    const dias = Math.floor((hoje - new Date(String(p.data_vencimento).slice(0,10) + 'T12:00:00')) / 86400000);
                    return `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-color,#222);font-size:12px;">
                        <div>
                            <div style="font-weight:600;">${ev ? (ev.local || ev.cidade || 'Show') : 'Show'}</div>
                            <div style="color:#EF4444;">${dias} dia${dias!==1?'s':''} em atraso</div>
                        </div>
                        <div style="font-weight:700;color:#EF4444;">${Utils.formatCurrency(parseFloat(p.valor)||0)}</div>
                    </div>`;
                }).join('')}
                ${parcAtrasadas.length > 5 ? `<div style="font-size:11px;color:var(--text-muted,#888);margin-top:6px;">+${parcAtrasadas.length-5} outras — veja Cobranças</div>` : ''}
            </div>
        </div>
    </div>

    <!-- TABELA MENSAL DETALHADA -->
    <div class="card" style="padding:20px;margin-bottom:24px;">
        <h3 style="font-size:15px;font-weight:700;margin:0 0 16px;display:flex;align-items:center;gap:8px;">
            <i class="fas fa-table" style="color:var(--red-primary,#e8261c);"></i>
            Detalhamento por Mês — ${ano}
        </h3>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                    <tr style="border-bottom:2px solid var(--border-color,#333);">
                        <th style="text-align:left;padding:8px 12px;color:var(--text-muted,#888);font-weight:600;">Mês</th>
                        <th style="text-align:center;padding:8px 12px;color:var(--text-muted,#888);font-weight:600;">Shows</th>
                        <th style="text-align:right;padding:8px 12px;color:var(--text-muted,#888);font-weight:600;">Cachê Bruto</th>
                        <th style="text-align:right;padding:8px 12px;color:var(--text-muted,#888);font-weight:600;">Recebido</th>
                        <th style="text-align:right;padding:8px 12px;color:var(--text-muted,#888);font-weight:600;">% Recebido</th>
                    </tr>
                </thead>
                <tbody>
                    ${dadosMensais.map((m, idx) => {
                        const pct = m.bruto > 0 ? (m.recebido / m.bruto * 100).toFixed(0) : '—';
                        const isMesAtual = idx === hoje.getMonth() && ano === hoje.getFullYear();
                        return `
                        <tr style="border-bottom:1px solid var(--border-color,#222);${isMesAtual?'background:rgba(232,38,28,0.04);':''}">
                            <td style="padding:8px 12px;font-weight:${isMesAtual?'700':'400'};${isMesAtual?'color:var(--red-primary,#e8261c);':''}">
                                ${m.mes}${isMesAtual?' ←':''}
                            </td>
                            <td style="padding:8px 12px;text-align:center;">${m.shows > 0 ? m.shows : '<span style="color:var(--text-muted,#888);">—</span>'}</td>
                            <td style="padding:8px 12px;text-align:right;">${m.bruto > 0 ? Utils.formatCurrency(m.bruto) : '<span style="color:var(--text-muted,#888);">—</span>'}</td>
                            <td style="padding:8px 12px;text-align:right;${m.recebido>0?'color:#10B981;font-weight:600;':'color:var(--text-muted,#888);'}">${m.recebido > 0 ? Utils.formatCurrency(m.recebido) : '—'}</td>
                            <td style="padding:8px 12px;text-align:right;">${typeof pct==='string'&&pct!=='—' ? `<span style="color:${parseInt(pct)>=80?'#10B981':parseInt(pct)>=50?'#F59E0B':'#EF4444'}">${pct}%</span>` : '<span style="color:var(--text-muted,#888);">—</span>'}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
                <tfoot>
                    <tr style="border-top:2px solid var(--border-color,#333);font-weight:700;">
                        <td style="padding:10px 12px;">TOTAL</td>
                        <td style="padding:10px 12px;text-align:center;">${showsAtivos.length}</td>
                        <td style="padding:10px 12px;text-align:right;">${Utils.formatCurrency(faturamentoBruto)}</td>
                        <td style="padding:10px 12px;text-align:right;color:#10B981;">${Utils.formatCurrency(totalRecebido)}</td>
                        <td style="padding:10px 12px;text-align:right;">${faturamentoBruto > 0 ? '<span style="color:#10B981;">' + (totalRecebido/faturamentoBruto*100).toFixed(0) + '%</span>' : '—'}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>

</div>

<style>
@media(max-width:768px){
    .rel-grid-responsive { grid-template-columns: 1fr !important; }
}
</style>
`;

    pc.innerHTML = html;

    // ── Renderizar gráfico Chart.js ──────────────────────────────
    const canvas = document.getElementById('relGraficoMensal');
    if (canvas && window.Chart) {
        // destruir instância anterior se existir
        const oldChart = Chart.getChart(canvas);
        if (oldChart) oldChart.destroy();

        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: dadosMensais.map(m => m.mes),
                datasets: [
                    {
                        label: 'Cachê Bruto',
                        data: dadosMensais.map(m => m.bruto),
                        backgroundColor: 'rgba(139,92,246,0.7)',
                        borderRadius: 4,
                        order: 2,
                    },
                    {
                        label: 'Recebido',
                        data: dadosMensais.map(m => m.recebido),
                        backgroundColor: 'rgba(16,185,129,0.7)',
                        borderRadius: 4,
                        order: 1,
                    },
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ' ' + ctx.dataset.label + ': R$ ' + (ctx.parsed.y || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#888', font: { size: 11 } },
                        grid:  { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        ticks: {
                            color: '#888',
                            font: { size: 11 },
                            callback: v => 'R$ ' + (v/1000).toFixed(0) + 'k'
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });
    }
};

// ── Helpers privados ─────────────────────────────────────────────

function _relKpi(icon, cor, valor, label) {
    return `
    <div style="background:var(--card-bg,#1a1a1a);border:1px solid var(--border-color,#2a2a2a);border-radius:12px;padding:16px;display:flex;align-items:flex-start;gap:12px;">
        <div style="width:36px;height:36px;border-radius:8px;background:${cor}22;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <i class="${icon}" style="color:${cor};font-size:15px;"></i>
        </div>
        <div style="min-width:0;">
            <div style="font-size:17px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${valor}</div>
            <div style="font-size:11px;color:var(--text-muted,#888);margin-top:2px;line-height:1.3;">${label}</div>
        </div>
    </div>`;
}

function _relFunilItem(label, count, total, cor, icon) {
    const pct = total > 0 ? Math.round(count / total * 100) : 0;
    return `
    <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-size:12px;display:flex;align-items:center;gap:6px;">
                <i class="${icon}" style="color:${cor};width:12px;"></i> ${label}
            </span>
            <span style="font-size:12px;font-weight:700;">${count} <span style="font-weight:400;color:var(--text-muted,#888);">(${pct}%)</span></span>
        </div>
        <div style="height:8px;background:var(--border-color,#222);border-radius:4px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${cor};border-radius:4px;transition:width .4s;"></div>
        </div>
    </div>`;
}

// ── Navegação ────────────────────────────────────────────────────

Pages._mudarFiltroRelatorio = function () {
    const ano     = document.getElementById('relAno')?.value;
    const artista = document.getElementById('relArtista')?.value;
    Pages.renderRelatoriosConsolidados(ano, artista);
};

// ── Export PDF ───────────────────────────────────────────────────

Pages._exportarRelatoriosPDF = function () {
    if (!window.jspdf) { Utils.showToast('jsPDF não carregado.', 'error'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const anoEl     = document.getElementById('relAno');
    const artistaEl = document.getElementById('relArtista');
    const ano       = anoEl ? anoEl.value : new Date().getFullYear();
    const artistaNome = artistaEl ? artistaEl.options[artistaEl.selectedIndex]?.text : 'Todos';

    // Cabeçalho
    doc.setFillColor(232, 38, 28);
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('RELATÓRIO CONSOLIDADO — ' + ano, 14, 13);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('Gibson Manager Pro · ' + artistaNome, 14, 18);
    doc.text('Gerado em ' + new Date().toLocaleDateString('pt-BR'), 160, 18);

    // Coletar KPIs da página
    let y = 28;
    const kpiEls = document.querySelectorAll('.relatorios-page [style*="border-radius:12px"]');
    kpiEls.forEach(el => {
        const vals = el.querySelectorAll('div');
        if (vals.length >= 2) {
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(vals[1]?.textContent?.trim() || '', 14, y);
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'bold');
            doc.text(vals[0]?.textContent?.trim() || '', 14, y + 5);
            doc.setFont(undefined, 'normal');
            y += 12;
        }
    });

    // Tabela mensal
    y += 4;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Detalhamento por Mês', 14, y);
    y += 4;

    const tableEl = document.querySelector('.relatorios-page table');
    if (tableEl && doc.autoTable) {
        const rows = [];
        tableEl.querySelectorAll('tbody tr').forEach(tr => {
            const cells = [...tr.querySelectorAll('td')].map(td => td.textContent.trim().replace(/\s+/g, ' '));
            if (cells.length) rows.push(cells);
        });
        doc.autoTable({
            head: [['Mês', 'Shows', 'Cachê Bruto', 'Recebido', '% Recebido']],
            body: rows,
            startY: y + 2,
            theme: 'striped',
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: [232, 38, 28], textColor: 255, fontStyle: 'bold' },
        });
    }

    doc.save('relatorio-consolidado-' + ano + '.pdf');
    Utils.showToast('PDF exportado com sucesso!', 'success');
};
