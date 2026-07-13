/* ========================================
   GIBSON MANAGER PRO - EVENTOS (CORRIGIDO)
   Módulo de Eventos com Agenda Integrada e Multi-etapas
======================================== */

// Variáveis globais para agenda
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Renderizar módulo de Eventos com Agenda
Pages.renderEventos = async function() {
    // Buscar eventos e artistas em paralelo (evita 2 round-trips sequenciais)
    let [todosEventos, artistas] = await Promise.all([
        EventosDB.listar(),
        ArtistasDB.listar()
    ]);
    [todosEventos, artistas] = await Promise.all([
        Auth.filterByPermissions(todosEventos, 'eventos'),
        Auth.filterByPermissions(artistas, 'artistas')
    ]);

    // Separar reservas (para o calendário) dos eventos reais (para lista e próximos)
    const reservas = todosEventos.filter(e => e.status === 'Reserva' || e.status === 'Reserva Alt.');
    let eventos = todosEventos.filter(e => e.status !== 'Reserva' && e.status !== 'Reserva Alt.');

    // Filtrar por termo de busca (só eventos reais)
    if (Pages.currentSearchTerm) {
        eventos = eventos.filter(e =>
            e.local?.toLowerCase().includes(Pages.currentSearchTerm) ||
            e.cidade?.toLowerCase().includes(Pages.currentSearchTerm) ||
            e.razao_social?.toLowerCase().includes(Pages.currentSearchTerm) ||
            e.nome_contratante?.toLowerCase().includes(Pages.currentSearchTerm)
        );
    }

    // Para o calendário usamos todos (inclui reservas como bloqueio visual)
    const eventosCalendario = todosEventos;

    // Mapa artista_id → nome (compartilhado com renderCalendario e renderListaView)
    const artMapEv = {};
    artistas.forEach(a => { artMapEv[a.id] = a; });

    // ── Cálculos da Timeline ─────────────────────────────────
    const DIAS = 10;
    const hojeEv = new Date(); hojeEv.setHours(0,0,0,0);
    // Janela: começa no 1º dia do mês atual para ter contexto de mês
    const winStartEv = new Date(currentYear, currentMonth, 1);
    const winEndEv = new Date(currentYear, currentMonth, DIAS);
    const diasEv = Array.from({length: DIAS}, (_, i) => { const d = new Date(currentYear, currentMonth, i + 1); return d; });
    const dsnEv = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
    const todayColEv = diasEv.findIndex(d => d.toDateString() === hojeEv.toDateString()) + 1;
    const mesNomeEv = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][currentMonth];

    // KPIs do mês
    const eventosMesEv = todosEventos.filter(e => { const d = new Date(e.data+'T12:00:00'); return d.getMonth()===currentMonth && d.getFullYear()===currentYear; });
    const confirmadosEv = eventosMesEv.filter(e => e.status==='Confirmado').length;
    const reservasEv = eventosMesEv.filter(e => e.status==='Reserva'||e.status==='Reserva Alt.'||e.status==='Opção').length;
    const fatEv = eventosMesEv.filter(e => ['Confirmado','Reserva'].includes(e.status)).reduce((s,e)=>s+(e.cache_bruto||0),0);

    // Eventos na janela de 10 dias (1–10 do mês)
    const eventosJanelaEv = todosEventos.filter(e => { const d = new Date(e.data+'T12:00:00'); return d >= winStartEv && d <= winEndEv; });

    // Lanes por artista (todos os artistas, mesmo sem eventos)
    const lanesEv = artistas.map((art, i) => {
        const ini = art.nome.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
        const janela = eventosJanelaEv.filter(e => e.artista_id === art.id && e.status !== 'Reserva Alt.');
        const totalMes = eventosMesEv.filter(e => e.artista_id === art.id).length;
        return { ...art, ini, janela, totalMes };
    }).sort((a,b) => b.totalMes - a.totalMes);
    const maxShowsEv = lanesEv[0]?.totalMes || 1;

    function _blocoEv(e) {
        const d = new Date(e.data+'T12:00:00');
        const col = diasEv.findIndex(x => x.toDateString() === d.toDateString()) + 1;
        if (col < 1) return '';
        const st = e.status || '';
        let bg, border, textCor, statusTxt;
        if (st === 'Confirmado') {
            bg='linear-gradient(135deg,rgba(212,175,55,0.22),rgba(150,120,30,0.18))'; border='1px solid rgba(212,175,55,0.5);border-left:3px solid var(--brand-primary)'; textCor='var(--brand-primary)'; statusTxt='✓ confirmado';
        } else if (st === 'Reserva') {
            bg='linear-gradient(135deg,rgba(74,134,216,0.2),rgba(50,90,160,0.12))'; border='1px solid rgba(74,134,216,0.4);border-left:3px solid #4a86d8'; textCor='#a9cdf5'; statusTxt='reserva';
        } else if (st === 'Reserva Alt.') {
            bg='rgba(160,130,230,0.12)'; border='1px dashed rgba(160,130,230,0.55)'; textCor='#c3aef0'; statusTxt='alt.';
        } else if (st === 'Opção') {
            bg='rgba(111,91,168,0.12)'; border='1px dashed rgba(111,91,168,0.55)'; textCor='#c3aef0'; statusTxt='opção';
        } else {
            bg='var(--bg-secondary)'; border='1px solid var(--border-color)'; textCor='var(--text-muted)'; statusTxt=st;
        }
        const span = e.span || 1;
        return `<div style="grid-row:1;grid-column:${col}/span ${span};margin:8px 4px;background:${bg};border:${border};border-radius:9px;padding:8px 10px;z-index:2;overflow:hidden;cursor:pointer" onclick="Pages.showEventosDoDay('${e.data}')">
            <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.local||'—'}</div>
            <div style="font-size:10px;color:${textCor};margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.cidade||''}${e.estado?'/'+e.estado:''}</div>
            <div style="font-size:10px;color:${textCor};font-weight:600;margin-top:3px">${statusTxt}</div>
        </div>`;
    }

    // Calendário mensal (pré-renderizado)
    const calHtmlEv = await this.renderCalendario(eventosCalendario, currentMonth, currentYear, artMapEv);
    // Lista (pré-renderizada) — inclui todos os status (Confirmado, Reserva, Opção etc)
    let eventosListaFiltrada = [...todosEventos];
    if (Pages.currentSearchTerm) {
        eventosListaFiltrada = eventosListaFiltrada.filter(e =>
            e.local?.toLowerCase().includes(Pages.currentSearchTerm) ||
            e.cidade?.toLowerCase().includes(Pages.currentSearchTerm) ||
            e.razao_social?.toLowerCase().includes(Pages.currentSearchTerm) ||
            e.nome_contratante?.toLowerCase().includes(Pages.currentSearchTerm)
        );
    }
    const listaHtmlEv = await this.renderListaView(eventosListaFiltrada, artMapEv);

    const html = `
        <div class="fade-in" style="padding:0;">

            <!-- Cabeçalho -->
            <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:18px">
                <div>
                    <div style="font-size:11px;letter-spacing:2.5px;font-weight:700;color:var(--brand-primary);margin-bottom:8px">AGENDA DE TURNÊ</div>
                    <h1 style="font-size:26px;font-weight:800;letter-spacing:-.5px;margin:0">Timeline de eventos</h1>
                </div>
                <div style="display:flex;gap:9px">
                    <button class="btn-secondary" onclick="Utils.exportToExcel(eventos, 'lista_eventos')"><i class="fas fa-file-excel"></i> Exportar</button>
                    ${Auth.canEdit('eventos') ? `<button class="btn-primary" onclick="Modals.showEventoMultiStepModal()"><i class="fas fa-plus"></i> Novo evento</button>` : ''}
                </div>
            </div>

            <!-- KPI strip -->
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px">
                <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:14px;padding:15px 17px">
                    <div style="font-size:11.5px;color:var(--text-muted);font-weight:600">Eventos em ${mesNomeEv}</div>
                    <div style="font-size:22px;font-weight:800;margin-top:7px">${eventosMesEv.length}</div>
                </div>
                <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:14px;padding:15px 17px">
                    <div style="font-size:11.5px;color:var(--text-muted);font-weight:600">Confirmados</div>
                    <div style="font-size:22px;font-weight:800;margin-top:7px;color:var(--success)">${confirmadosEv}</div>
                </div>
                <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:14px;padding:15px 17px">
                    <div style="font-size:11.5px;color:var(--text-muted);font-weight:600">Reservas · Opções</div>
                    <div style="font-size:22px;font-weight:800;margin-top:7px;color:#7db3f0">${reservasEv}</div>
                </div>
                <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:14px;padding:15px 17px">
                    <div style="display:flex;justify-content:space-between">
                        <span style="font-size:11.5px;color:var(--text-muted);font-weight:600">Faturamento previsto</span>
                        ${fatEv > 0 ? '<span style="font-size:11px;color:var(--success);font-weight:700">▲</span>' : ''}
                    </div>
                    <div style="font-size:22px;font-weight:800;margin-top:7px;color:var(--brand-primary)">${Utils.formatCurrency(fatEv)}</div>
                </div>
            </div>

            <!-- Card principal -->
            <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:16px;overflow:hidden">

                <!-- Controles -->
                <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--border-color)">
                    <div style="display:flex;align-items:center;gap:12px">
                        <div style="display:flex;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:9px;overflow:hidden">
                            <button onclick="Pages.changeMonth(-1)" style="padding:7px 11px;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:13px">‹</button>
                            <span style="padding:7px 14px;font-size:13px;font-weight:700;border-left:1px solid var(--border-color);border-right:1px solid var(--border-color)">${mesNomeEv} ${currentYear}</span>
                            <button onclick="Pages.changeMonth(1)" style="padding:7px 11px;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:13px">›</button>
                        </div>
                        <span style="font-size:12px;color:var(--text-muted)">1 – ${DIAS} ${mesNomeEv.toLowerCase().substring(0,3)} · primeiros ${DIAS} dias</span>
                    </div>
                    <div style="display:flex;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:9px;padding:3px;gap:1px">
                        <span id="ev-view-tl" onclick="Pages._setEvView('timeline')" style="padding:6px 13px;border-radius:6px;background:var(--brand-primary);color:#141416;font-size:12px;font-weight:700;cursor:pointer">Timeline</span>
                        <span id="ev-view-mes" onclick="Pages._setEvView('mes')" style="padding:6px 13px;border-radius:6px;color:var(--text-muted);font-size:12px;font-weight:600;cursor:pointer">Mês</span>
                        <span id="ev-view-lista" onclick="Pages._setEvView('lista')" style="padding:6px 13px;border-radius:6px;color:var(--text-muted);font-size:12px;font-weight:600;cursor:pointer">Lista</span>
                    </div>
                </div>

                <!-- VIEW: Timeline -->
                <div id="ev-view-timeline">
                    <!-- day header -->
                    <div style="display:flex;padding:0 20px;border-bottom:1px solid var(--border-color);background:var(--bg-secondary)">
                        <div style="width:180px;flex-shrink:0;padding:10px 0;font-size:10px;letter-spacing:1px;color:var(--text-muted);font-weight:700">ARTISTA / OCUPAÇÃO</div>
                        <div style="flex:1;display:grid;grid-template-columns:repeat(${DIAS},1fr)">
                            ${diasEv.map(d => {
                                const isToday = d.toDateString() === hojeEv.toDateString();
                                const isWk = d.getDay()===0||d.getDay()===6;
                                return `<div style="text-align:center;padding:8px 0;${isWk?'background:rgba(0,0,0,0.12)':''}">
                                    <div style="font-size:9px;color:${isToday?'var(--brand-primary)':'var(--text-muted)'};font-weight:700">${dsnEv[d.getDay()]}</div>
                                    <div style="font-size:13px;font-weight:${isToday?'800':'700'};color:${isToday?'var(--brand-primary)':'var(--text-secondary)'};margin-top:2px">${d.getDate()}</div>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>

                    <!-- lanes -->
                    ${lanesEv.map((art, li) => {
                        const barPct = maxShowsEv > 0 ? ((art.totalMes / maxShowsEv) * 100).toFixed(0) : 0;
                        const barCor = li===0 ? 'var(--brand-primary)' : 'var(--text-muted)';
                        const livre = art.janela.length === 0;
                        return `<div style="display:flex;padding:0 20px;border-bottom:1px solid var(--border-color)">
                            <div style="width:180px;flex-shrink:0;display:flex;align-items:center;gap:11px;padding:13px 0">
                                <div style="width:38px;height:38px;border-radius:10px;background:var(--bg-secondary);border:1px solid var(--border-color);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:${li===0?'var(--brand-primary)':'var(--text-secondary)'};flex-shrink:0">${art.ini}</div>
                                <div style="min-width:0">
                                    <div style="font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${art.nome}</div>
                                    <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
                                        ${livre ? `<div style="width:44px;height:4px;border-radius:2px;background:var(--border-color)"></div><span style="font-size:10px;color:var(--text-muted)">livre</span>` : `<div style="width:44px;height:4px;border-radius:2px;background:var(--border-color);overflow:hidden"><div style="width:${barPct}%;height:100%;background:${barCor}"></div></div><span style="font-size:10px;color:var(--text-muted)">${art.totalMes} show(s)</span>`}
                                    </div>
                                </div>
                            </div>
                            <div style="flex:1;position:relative;display:grid;grid-template-columns:repeat(${DIAS},1fr);min-height:74px">
                                ${diasEv.map((d,i) => `<div style="border-left:1px solid var(--border-color);grid-row:1;grid-column:${i+1};${(d.getDay()===0||d.getDay()===6)?'background:rgba(0,0,0,0.12)':''}"></div>`).join('')}
                                ${todayColEv>=1&&todayColEv<=DIAS?`<div style="position:absolute;left:calc(${((todayColEv-1)/DIAS)*100}% + ${(1/DIAS)*50}%);top:0;bottom:0;width:2px;background:linear-gradient(rgba(244,196,48,0),rgba(244,196,48,.65),rgba(244,196,48,0));z-index:1;pointer-events:none"></div>`:''}
                                ${livre ? `<div style="grid-row:1;grid-column:3/span 3;margin:10px 5px;border:1.5px dashed var(--border-color);border-radius:9px;display:flex;align-items:center;justify-content:center;gap:6px;z-index:2;cursor:pointer;color:var(--text-muted)" onclick="Modals.showEventoMultiStepModal()"><span style="font-size:14px;color:var(--brand-primary)">+</span><span style="font-size:11px;font-weight:600">Janela livre · agendar</span></div>` : art.janela.map(e => _blocoEv(e)).join('')}
                            </div>
                        </div>`;
                    }).join('')}

                    <!-- legend -->
                    <div style="display:flex;align-items:center;gap:18px;padding:12px 20px;border-top:1px solid var(--border-color);background:var(--bg-secondary)">
                        <span style="font-size:10.5px;color:var(--text-muted);font-weight:700;letter-spacing:.5px">STATUS</span>
                        <span style="display:flex;align-items:center;gap:6px;font-size:11.5px"><span style="width:10px;height:10px;border-radius:3px;background:var(--brand-primary)"></span>Confirmado</span>
                        <span style="display:flex;align-items:center;gap:6px;font-size:11.5px"><span style="width:10px;height:10px;border-radius:3px;background:#4a86d8"></span>Reserva</span>
                        <span style="display:flex;align-items:center;gap:6px;font-size:11.5px"><span style="width:10px;height:10px;border-radius:3px;border:1.5px dashed #8b6fd8"></span>Opção</span>
                        <span style="display:flex;align-items:center;gap:6px;font-size:11.5px"><span style="width:10px;height:10px;border-radius:3px;border:1.5px dashed var(--border-color)"></span>Janela livre</span>
                        <div style="flex:1"></div>
                        ${todayColEv>=1&&todayColEv<=DIAS?`<span style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-muted)"><span style="width:2px;height:12px;background:var(--brand-primary);display:inline-block"></span>hoje · ${hojeEv.getDate()} ${mesNomeEv.substring(0,3).toLowerCase()}</span>`:''}
                    </div>
                </div>

                <!-- VIEW: Calendário Mensal -->
                <div id="ev-view-mes-content" style="display:none;padding:20px">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                        <button class="btn-secondary btn-sm" onclick="Pages.changeMonth(-1)"><i class="fas fa-chevron-left"></i> Anterior</button>
                        <div style="text-align:center">
                            <span style="font-size:17px;font-weight:800">${mesNomeEv} ${currentYear}</span>
                            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Clique em um dia com evento para ver detalhes</div>
                        </div>
                        <button class="btn-secondary btn-sm" onclick="Pages.changeMonth(1)">Próximo <i class="fas fa-chevron-right"></i></button>
                    </div>
                    <div class="calendar-grid">${calHtmlEv}</div>
                </div>

                <!-- VIEW: Lista -->
                <div id="ev-view-lista-content" style="display:none;padding:20px">
                    ${listaHtmlEv}
                </div>
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
};

// Alternar view na página de Eventos
Pages._setEvView = function(view) {
    const tl = document.getElementById('ev-view-timeline');
    const mes = document.getElementById('ev-view-mes-content');
    const lista = document.getElementById('ev-view-lista-content');
    const btnTl = document.getElementById('ev-view-tl');
    const btnMes = document.getElementById('ev-view-mes');
    const btnLista = document.getElementById('ev-view-lista');
    if (!tl) return;
    [tl, mes, lista].forEach(el => el && (el.style.display = 'none'));
    [btnTl, btnMes, btnLista].forEach(b => { if(b){ b.style.background='transparent'; b.style.color='var(--text-muted)'; }});
    if (view === 'timeline') { tl.style.display=''; btnTl.style.background='var(--brand-primary)'; btnTl.style.color='#141416'; }
    else if (view === 'mes') { mes.style.display=''; btnMes.style.background='var(--brand-primary)'; btnMes.style.color='#141416'; }
    else { lista.style.display=''; btnLista.style.background='var(--brand-primary)'; btnLista.style.color='#141416'; }
};

// [renderAgendaView removida — lógica integrada em renderEventos]
// PLACEHOLDER para manter compatibilidade caso seja chamada externamente
Pages.renderAgendaView = async function(eventos) {
    const artistas = await ArtistasDB.listar();
    const artMap = {};
    artistas.forEach(a => { artMap[a.id] = a; });

    // Janela de 14 dias centrada em hoje
    const DIAS = 14;
    const hojeAg = new Date(); hojeAg.setHours(0,0,0,0);
    const winStart = new Date(hojeAg); winStart.setDate(hojeAg.getDate() - 2);
    const winEnd = new Date(winStart); winEnd.setDate(winStart.getDate() + DIAS - 1);
    const diasArr = Array.from({length: DIAS}, (_, i) => { const d = new Date(winStart); d.setDate(d.getDate() + i); return d; });
    const dsnAg = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
    const todayColAg = diasArr.findIndex(d => d.toDateString() === hojeAg.toDateString()) + 1;
    const mesNomeAg = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][hojeAg.getMonth()];

    // KPIs
    const mesAtualAg = hojeAg.getMonth(), anoAtualAg = hojeAg.getFullYear();
    const eventosMesAg = eventos.filter(e => { const d = new Date(e.data+'T12:00:00'); return d.getMonth()===mesAtualAg && d.getFullYear()===anoAtualAg; });
    const confirmadosAg = eventosMesAg.filter(e => e.status==='Confirmado').length;
    const reservasAgKpi = eventosMesAg.filter(e => e.status==='Reserva'||e.status==='Reserva Alt.'||e.status==='Opção').length;
    const fatPrevistoAg = eventosMesAg.filter(e => ['Confirmado','Reserva'].includes(e.status)).reduce((s,e)=>s+(e.cache_bruto||0),0);

    // Eventos na janela
    const eventosJanelaAg = eventos.filter(e => { const d = new Date(e.data+'T12:00:00'); return d >= winStart && d <= winEnd; });

    // Lanes por artista
    const artistasLanesAg = artistas.map(art => ({
        ...art,
        iniciais: art.nome.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase(),
        janela: eventosJanelaAg.filter(e => e.artista_id === art.id),
        totalMesAg: eventosMesAg.filter(e => e.artista_id === art.id).length
    })).filter(a => a.janela.length > 0 || a.totalMesAg > 0)
       .sort((a,b) => b.totalMesAg - a.totalMesAg);
    const maxShowsAg = artistasLanesAg[0]?.totalMesAg || 1;

    function _bloco(e) {
        const d = new Date(e.data+'T12:00:00');
        const col = diasArr.findIndex(x => x.toDateString() === d.toDateString()) + 1;
        if (col < 1) return '';
        const st = e.status || '';
        let bg, border, textCor, statusTxt;
        if (st === 'Confirmado') {
            bg='linear-gradient(135deg,rgba(212,175,55,0.18),rgba(212,175,55,0.06))'; border='1px solid rgba(212,175,55,0.4);border-left:3px solid var(--brand-primary)'; textCor='var(--brand-primary)'; statusTxt='✓ confirmado';
        } else if (st === 'Reserva') {
            bg='linear-gradient(135deg,rgba(74,134,216,0.18),rgba(74,134,216,0.06))'; border='1px solid rgba(74,134,216,0.35);border-left:3px solid #4a86d8'; textCor='#7db3f0'; statusTxt='reserva';
        } else if (st === 'Reserva Alt.') {
            bg='rgba(160,130,230,0.1)'; border='1px dashed rgba(160,130,230,0.5)'; textCor='#c3aef0'; statusTxt='alt.';
        } else if (st === 'Opção') {
            bg='rgba(111,91,168,0.12)'; border='1px dashed rgba(111,91,168,0.5)'; textCor='#c3aef0'; statusTxt='opção';
        } else {
            bg='var(--bg-secondary)'; border='1px solid var(--border-color)'; textCor='var(--text-muted)'; statusTxt=st;
        }
        return `<div style="grid-row:1;grid-column:${col}/span 1;margin:8px 4px;background:${bg};border:${border};border-radius:9px;padding:7px 9px;z-index:2;overflow:hidden;cursor:pointer" onclick="Pages.showEventosDoDay('${e.data}')">
            <div style="font-size:11.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.local||'—'}</div>
            <div style="font-size:10px;color:${textCor};margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.cidade||''}</div>
            <div style="font-size:10px;color:${textCor};margin-top:4px;font-weight:600">${statusTxt}</div>
        </div>`;
    }

    // Calendário mensal (mantido para tab alternativo)
    const calHtml = await this.renderCalendario(eventos, currentMonth, currentYear);

    return `
        <div>
            <!-- KPI strip -->
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px">
                <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:14px;padding:14px 16px">
                    <div style="font-size:11px;color:var(--text-muted);font-weight:600">Eventos em ${mesNomeAg}</div>
                    <div style="font-size:20px;font-weight:800;margin-top:6px">${eventosMesAg.length}</div>
                </div>
                <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:14px;padding:14px 16px">
                    <div style="font-size:11px;color:var(--text-muted);font-weight:600">Confirmados</div>
                    <div style="font-size:20px;font-weight:800;margin-top:6px;color:var(--success)">${confirmadosAg}</div>
                </div>
                <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:14px;padding:14px 16px">
                    <div style="font-size:11px;color:var(--text-muted);font-weight:600">Reservas · Opções</div>
                    <div style="font-size:20px;font-weight:800;margin-top:6px;color:#7db3f0">${reservasAgKpi}</div>
                </div>
                <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:14px;padding:14px 16px">
                    <div style="font-size:11px;color:var(--text-muted);font-weight:600">Faturamento previsto</div>
                    <div style="font-size:20px;font-weight:800;margin-top:6px;color:var(--brand-primary)">${Utils.formatCurrency(fatPrevistoAg)}</div>
                </div>
            </div>

            <!-- Timeline card -->
            <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:14px;overflow:hidden;margin-bottom:16px">

                <!-- controles -->
                <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border-color)">
                    <div style="display:flex;align-items:center;gap:12px">
                        <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:9px;padding:6px 14px;font-size:13px;font-weight:700">${mesNomeAg} ${anoAtualAg}</div>
                        <span style="font-size:12px;color:var(--text-muted)">${diasArr[0].getDate()} – ${diasArr[DIAS-1].getDate()} ${mesNomeAg.substring(0,3).toLowerCase()} · 14 dias</span>
                    </div>
                    <div style="display:flex;background:var(--card-bg);border:1px solid var(--border-color);border-radius:9px;padding:3px;gap:1px">
                        <span id="view-timeline-btn" style="padding:5px 12px;border-radius:6px;background:var(--brand-primary);color:#141416;font-size:12px;font-weight:700;cursor:pointer">Timeline</span>
                        <span id="view-calendar-btn" style="padding:5px 12px;border-radius:6px;color:var(--text-muted);font-size:12px;font-weight:600;cursor:pointer" onclick="Pages._toggleAgendaView()">Mês</span>
                    </div>
                </div>

                <!-- Timeline view -->
                <div id="agenda-timeline-view">
                    <!-- day header -->
                    <div style="display:flex;padding:0 18px;border-bottom:1px solid var(--border-color);background:var(--card-bg)">
                        <div style="width:160px;flex-shrink:0;padding:9px 0;font-size:10px;letter-spacing:1px;color:var(--text-muted);font-weight:700">ARTISTA</div>
                        <div style="flex:1;display:grid;grid-template-columns:repeat(${DIAS},1fr)">
                            ${diasArr.map(d => {
                                const isToday = d.toDateString() === hojeAg.toDateString();
                                const isWk = d.getDay()===0||d.getDay()===6;
                                return `<div style="text-align:center;padding:7px 0;${isWk?'opacity:.5':''}">
                                    <div style="font-size:9px;color:${isToday?'var(--brand-primary)':'var(--text-muted)'};font-weight:700">${dsnAg[d.getDay()]}</div>
                                    <div style="font-size:12px;font-weight:${isToday?'800':'700'};color:${isToday?'var(--brand-primary)':'var(--text-secondary)'};margin-top:2px">${d.getDate()}</div>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>

                    <!-- lanes -->
                    ${artistasLanesAg.length > 0 ? artistasLanesAg.map((art, li) => {
                        const barPct = maxShowsAg > 0 ? ((art.totalMesAg / maxShowsAg) * 100).toFixed(0) : 0;
                        const barCor = li===0 ? 'var(--brand-primary)' : 'var(--text-muted)';
                        return `<div style="display:flex;padding:0 18px;border-bottom:1px solid var(--border-color)">
                            <div style="width:160px;flex-shrink:0;display:flex;align-items:center;gap:9px;padding:11px 0">
                                <div style="width:34px;height:34px;border-radius:9px;background:var(--card-bg);border:1px solid var(--border-color);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;color:${li===0?'var(--brand-primary)':'var(--text-secondary)'};flex-shrink:0">${art.iniciais}</div>
                                <div style="min-width:0">
                                    <div style="font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${art.nome}</div>
                                    <div style="display:flex;align-items:center;gap:5px;margin-top:3px">
                                        <div style="width:38px;height:3px;border-radius:2px;background:var(--border-color);overflow:hidden"><div style="width:${barPct}%;height:100%;background:${barCor}"></div></div>
                                        <span style="font-size:10px;color:var(--text-muted)">${art.totalMesAg} show(s)</span>
                                    </div>
                                </div>
                            </div>
                            <div style="flex:1;position:relative;display:grid;grid-template-columns:repeat(${DIAS},1fr);min-height:66px">
                                ${diasArr.map((d,i) => `<div style="border-left:1px solid var(--border-color);grid-row:1;grid-column:${i+1};${(d.getDay()===0||d.getDay()===6)?'background:rgba(0,0,0,0.1)':''}"></div>`).join('')}
                                ${todayColAg>=1&&todayColAg<=DIAS?`<div style="position:absolute;left:calc(${((todayColAg-1)/DIAS)*100}% + ${(1/DIAS)*50}%);top:0;bottom:0;width:2px;background:linear-gradient(rgba(244,196,48,0),rgba(244,196,48,.6),rgba(244,196,48,0));z-index:1;pointer-events:none"></div>`:''}
                                ${art.janela.map(e => _bloco(e)).join('')}
                            </div>
                        </div>`;
                    }).join('') : `<div style="padding:30px;text-align:center;color:var(--text-muted);font-size:13px"><i class="fas fa-calendar" style="font-size:28px;opacity:.3;display:block;margin-bottom:10px"></i>Nenhum evento nos próximos 14 dias</div>`}

                    <!-- legend -->
                    <div style="display:flex;align-items:center;gap:16px;padding:11px 18px;border-top:1px solid var(--border-color);background:var(--card-bg)">
                        <span style="font-size:10.5px;color:var(--text-muted);font-weight:700;letter-spacing:.5px">STATUS</span>
                        <span style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--text-secondary)"><span style="width:9px;height:9px;border-radius:2px;background:var(--brand-primary)"></span>Confirmado</span>
                        <span style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--text-secondary)"><span style="width:9px;height:9px;border-radius:2px;background:#4a86d8"></span>Reserva</span>
                        <span style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--text-secondary)"><span style="width:9px;height:9px;border-radius:2px;border:1.5px dashed #8b6fd8"></span>Alt./Opção</span>
                        <div style="flex:1"></div>
                        ${todayColAg>=1&&todayColAg<=DIAS?`<span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-muted)"><span style="width:2px;height:12px;background:var(--brand-primary);display:inline-block"></span>hoje · ${hojeAg.getDate()} ${mesNomeAg.substring(0,3)}</span>`:''}
                    </div>
                </div>

                <!-- Calendário mensal (oculto por padrão) -->
                <div id="agenda-calendar-view" style="display:none;padding:18px">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                        <button class="btn-secondary btn-sm" onclick="Pages.changeMonth(-1)"><i class="fas fa-chevron-left"></i> Anterior</button>
                        <div style="text-align:center">
                            <span style="font-size:17px;font-weight:800">${Utils.getMonthName(currentMonth)} ${currentYear}</span>
                            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Clique em um dia com evento para ver detalhes</div>
                        </div>
                        <button class="btn-secondary btn-sm" onclick="Pages.changeMonth(1)">Próximo <i class="fas fa-chevron-right"></i></button>
                    </div>
                    <div class="calendar-grid">${calHtml}</div>
                </div>
            </div>

            <!-- Próximos Eventos -->
            <div>
                <div style="font-size:12px;font-weight:700;color:var(--text-muted);letter-spacing:1px;margin-bottom:10px">PRÓXIMOS EVENTOS</div>
                ${await this.renderProximosEventosLista(eventos)}
            </div>
        </div>
    `;
};

// Alternar entre Timeline e Calendário mensal (mantido por compatibilidade)
Pages._toggleAgendaView = function() {
    const tl = document.getElementById('agenda-timeline-view');
    const cal = document.getElementById('agenda-calendar-view');
    const btnTl = document.getElementById('view-timeline-btn');
    const btnCal = document.getElementById('view-calendar-btn');
    if (!tl || !cal) return;
    const tlVisible = tl.style.display !== 'none';
    tl.style.display = tlVisible ? 'none' : '';
    cal.style.display = tlVisible ? '' : 'none';
    if (btnTl && btnCal) {
        btnTl.style.background = tlVisible ? 'transparent' : 'var(--brand-primary)';
        btnTl.style.color = tlVisible ? 'var(--text-muted)' : '#141416';
        btnCal.style.background = tlVisible ? 'var(--brand-primary)' : 'transparent';
        btnCal.style.color = tlVisible ? '#141416' : 'var(--text-muted)';
        btnCal.onclick = tlVisible ? null : function(){ Pages._toggleAgendaView(); };
        btnTl.onclick = tlVisible ? function(){ Pages._toggleAgendaView(); } : null;
    }
};

Pages.changeMonth = function(delta) {
    currentMonth += delta;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    this.renderEventos();
};

// Renderizar calendário
Pages.renderCalendario = async function(eventos, mes, ano, artMapExterno) {
    // Mapa artista_id -> objeto artista (passado pelo caller ou buscado como fallback)
    const _artMapCal = {};
    if (artMapExterno && typeof artMapExterno === 'object') {
        Object.assign(_artMapCal, artMapExterno);
    } else {
        try {
            const _arts = await ArtistasDB.listar();
            _arts.forEach(a => { _artMapCal[a.id] = a; });
        } catch(e) {}
    }

    const primeiroDia = new Date(ano, mes, 1).getDay();
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();
    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const mesHoje = hoje.getMonth();
    const anoHoje = hoje.getFullYear();
    
    let html = `
        <style>
            .calendar-grid {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 12px;
                background: var(--bg-secondary);
                padding: 20px;
                border-radius: 12px;
            }
            .calendar-day-header {
                font-weight: 700;
                font-size: 13px;
                color: var(--text-secondary);
                text-align: center;
                padding: 12px 8px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .calendar-day {
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                border-radius: 10px;
                padding: 12px;
                min-height: 100px;
                position: relative;
                transition: all 0.2s;
                cursor: default;
            }
            .calendar-day:hover {
                border-color: var(--brand-primary);
                box-shadow: 0 0 10px rgba(244,196,48,0.15);
            }
            .calendar-day.has-event {
                border-color: rgba(244,196,48,0.35);
                background: var(--bg-card);
            }
            .calendar-day.today {
                border: 2px solid var(--brand-primary);
                box-shadow: 0 0 14px rgba(244,196,48,0.2);
            }
            .calendar-day-number {
                font-weight: 700;
                font-size: 16px;
                color: var(--text-primary);
                margin-bottom: 6px;
            }
            .calendar-day.today .calendar-day-number {
                color: var(--brand-primary);
            }
            .calendar-day-events {
                font-size: 11px;
                color: var(--text-secondary);
                margin-top: 6px;
            }
            .calendar-day-event-dot {
                width: 6px;
                height: 6px;
                background: var(--brand-primary);
                border-radius: 50%;
                display: inline-block;
                margin-right: 4px;
                box-shadow: 0 0 8px var(--brand-primary);
            }
        </style>
    `;
    
    // Cabeçalhos dos dias
    ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach(dia => {
        html += `<div class="calendar-day-header">${dia}</div>`;
    });
    
    // Dias vazios antes do primeiro dia
    for (let i = 0; i < primeiroDia; i++) {
        html += '<div class="calendar-day" style="opacity: 0.3;"></div>';
    }
    
    // Dias do mês
    for (let dia = 1; dia <= ultimoDia; dia++) {
        // Fix timezone: parse com T12:00:00
        const eventosNoDia = eventos.filter(e => {
            const d = new Date(e.data + 'T12:00:00');
            return d.getDate() === dia && d.getMonth() === mes && d.getFullYear() === ano;
        });

        const isHoje = dia === diaHoje && mes === mesHoje && ano === anoHoje;
        const hasEvent = eventosNoDia.length > 0;
        const dataStr = `${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;

        // Mini-cards dos eventos (sem valores)
        let miniCards = '';
        for (const ev of eventosNoDia) {
            const st = ev.status || '';
            let stColor = 'var(--text-muted)', bgCard = 'var(--bg-secondary)', borderL = '3px solid var(--border-color)';
            if (st === 'Confirmado')                              { stColor='var(--brand-primary)'; borderL='3px solid var(--brand-primary)'; bgCard='rgba(244,196,48,0.06)'; }
            else if (st === 'Reserva')                            { stColor='#4a86d8';              borderL='3px solid #4a86d8';              bgCard='rgba(74,134,216,0.06)'; }
            else if (st==='Reserva Alt.'||st==='Opção')           { stColor='#9b7fe0';              borderL='3px dashed #9b7fe0';             bgCard='rgba(155,127,224,0.06)'; }
            else if (st==='Fechado'||st==='Contrato Assinado')    { stColor='#16a34a';              borderL='3px solid #16a34a';              bgCard='rgba(22,163,74,0.08)'; }
            const stDot = (st==='Confirmado'||st==='Fechado'||st==='Contrato Assinado')?'✓': st==='Reserva'?'◎': '◌';
            const stLabel = st==='Confirmado'?'conf': st==='Reserva'?'reserva': (st==='Fechado'||st==='Contrato Assinado')?'fechado': 'opção';
            const _nomArt = (_artMapCal[ev.artista_id]?.nome) || '';
            miniCards += `<div onclick="Pages.showEventosDoDay('${dataStr}')" style="margin-top:4px;padding:5px 8px;border-radius:7px;border-left:${borderL};background:${bgCard};cursor:pointer;transition:opacity .15s" onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">
                ${_nomArt ? `<div style="font-size:8.5px;font-weight:800;color:${stColor};text-transform:uppercase;letter-spacing:.8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:1px">${_nomArt}</div>` : ''}
                <div style="font-size:10.5px;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3">${ev.local||'—'}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px;gap:4px">
                    <span style="font-size:9px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0">${ev.cidade||''}${ev.estado?'/'+ev.estado:''}</span>
                    <span style="font-size:9px;font-weight:700;color:${stColor};flex-shrink:0;white-space:nowrap">${stDot} ${stLabel}</span>
                </div>
            </div>`;
        }

        html += `
            <div class="calendar-day ${hasEvent ? 'has-event' : ''} ${isHoje ? 'today' : ''}"
                 ${hasEvent ? `onclick="Pages.showEventosDoDay('${dataStr}')"` : ''}>
                <div class="calendar-day-number">${dia}</div>
                ${miniCards}
            </div>
        `;
    }
    
    return html;
};

// Mostrar eventos do dia (modal popup)
Pages.showEventosDoDay = async function(data) {
    const todos = await EventosDB.listar();
    // Fix timezone: parse com T12:00:00
    const eventosDoDay = todos.filter(e => {
        const d = new Date(e.data + 'T12:00:00');
        const str = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        return str === data;
    });

    if (!eventosDoDay.length) return;

    let htmlItems = '';
    for (const ev of eventosDoDay) {
        const art = await ArtistasDB.buscarPorId(ev.artista_id);
        const st = ev.status || '';
        let stColor = 'var(--text-muted)';
        if (st === 'Confirmado') stColor = 'var(--brand-primary)';
        else if (st === 'Reserva') stColor = '#4a86d8';
        else if (st === 'Reserva Alt.' || st === 'Opção') stColor = '#c3aef0';
        else if (st === 'Fechado' || st === 'Contrato Assinado') stColor = '#16a34a';
        htmlItems += `<div style="padding:12px 0;border-bottom:1px solid var(--border-color)">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
                <div style="min-width:0;flex:1">
                    <div style="font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ev.local||'—'}</div>
                    <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${art?art.nome:'—'} · ${ev.cidade||''}${ev.estado?'/'+ev.estado:''}</div>
                    ${ev.horario ? `<div style="font-size:11.5px;color:var(--text-muted);margin-top:2px"><i class="fas fa-clock"></i> ${ev.horario}</div>` : ''}
        
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
                    <span style="font-size:11px;font-weight:700;color:${stColor};white-space:nowrap">${st}</span>
                    <button onclick="Swal.close();setTimeout(()=>Modals.showEventoMultiStepModal('${ev.id}'),100)" style="padding:4px 10px;border:1px solid var(--border-color);border-radius:6px;background:transparent;color:var(--text-primary);cursor:pointer;font-size:11px">Ver detalhes</button>
                </div>
            </div>
        </div>`;
    }

    const dateFmt = Utils.formatDate ? Utils.formatDate(data) : data;
    Swal.fire({
        title: `<span style="font-size:15px;font-weight:700">Eventos · ${dateFmt}</span>`,
        html: `<div style="text-align:left;max-height:380px;overflow-y:auto;padding-right:4px">${htmlItems}</div>`,
        showConfirmButton: false,
        showCloseButton: true,
        background: 'var(--card-bg)',
        color: 'var(--text-primary)',
        width: 440,
    });
};

// Renderizar próximos eventos
Pages.renderProximosEventosLista = async function(eventos) {
    const hoje = new Date();
    const proximos = eventos
        .filter(e => new Date(e.data) >= hoje)
        .sort((a, b) => new Date(a.data) - new Date(b.data))
        .slice(0, 5);

    if (proximos.length === 0) {
        return '<p class="text-muted">Nenhum evento próximo.</p>';
    }

    let html = '';
    for (const evento of proximos) {
        const artista = await ArtistasDB.buscarPorId(evento.artista_id);
        const lucro = await Utils.calcularLucroEvento(evento.id);
        const diasFaltando = Utils.daysBetween(hoje, evento.data);
        
        html += `
            <div class="card mb-2" style="padding: 16px; border-left: 4px solid var(--brand-primary);">
                <div class="flex-between">
                    <div>
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <span style="font-size: 28px; font-weight: 900; color: var(--brand-primary);">
                                ${new Date(evento.data).getDate()}
                            </span>
                            <div>
                                <p style="margin: 0; color: var(--text-secondary); font-size: 12px;">
                                    ${Utils.formatDate(evento.data)} (em ${diasFaltando} dias)
                                </p>
                                <h4 style="margin: 4px 0;">${evento.local}</h4>
                            </div>
                        </div>
                        <p style="font-size: 13px; color: var(--text-secondary); margin: 4px 0;">
                            <i class="fas fa-microphone"></i> ${artista ? artista.nome : '-'} | 
                            <i class="fas fa-map-marker-alt"></i> ${evento.cidade}/${evento.estado}
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <span class="badge badge-${evento.status === 'Confirmado' ? 'success' : 'warning'}">
                            ${evento.status}
                        </span>
                        <button class="btn-secondary btn-sm mt-2" onclick="Modals.showEventoMultiStepModal('${evento.id}')">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    return html;
};

// Renderizar visualização de Lista
Pages.renderListaView = async function(eventos, artMapExterno) {
    if (eventos.length === 0) {
        return `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-calendar-times" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
                <h3 style="color: var(--text-secondary);">Nenhum evento cadastrado</h3>
                ${Auth.canEdit('eventos') ? `
                    <button class="btn-primary mt-2" onclick="Modals.showEventoMultiStepModal()">
                        <i class="fas fa-plus"></i> Cadastrar Primeiro Evento
                    </button>
                ` : ''}
            </div>
        `;
    }

    return `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Artista</th>
                        <th>Local</th>
                        <th>Cidade/UF</th>
                        <th>Cachê</th>
                        <th>Lucro</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${await this.renderEventosTableRows(eventos, artMapExterno)}
                </tbody>
            </table>
        </div>
    `;
};

Pages.renderEventosTableRows = async function(eventos, artMapExterno) {
    let html = '';
    
    // Ordenar por data (mais recentes primeiro)
    eventos.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    // Buscar artistas (usa mapa passado ou fetch único como fallback)
    let _artMap = {};
    if (artMapExterno && typeof artMapExterno === 'object') {
        _artMap = artMapExterno;
    } else {
        try {
            const _arts = await ArtistasDB.listar();
            _arts.forEach(a => { _artMap[a.id] = a; });
        } catch(e) {}
    }

    // Buscar todas as despesas de uma vez (evita N chamadas individuais)
    let _todasDesp = [];
    try { _todasDesp = await DespesasDB.listar(); } catch(e) {}

    for (const evento of eventos) {
        const artista = _artMap[evento.artista_id] || null;
        // Calcular lucro localmente sem chamadas extras ao BD
        const receita = evento.valor_liquido || 0;
        const despesasEvento = _todasDesp.filter(d => d.evento_id === evento.id);
        const totalDesp = despesasEvento.reduce((s, d) => s + (parseFloat(d.valor) || 0), 0);
        const lucroVal = receita - totalDesp;
        const margemVal = receita > 0 ? (lucroVal / receita * 100).toFixed(2) : 0;
        const lucro = { lucro: lucroVal, margem: margemVal };
        
        html += `
            <tr>
                <td><strong>${Utils.formatDate(evento.data)}</strong></td>
                <td>${artista ? (artista.nome || artista) : '-'}</td>
                <td>${evento.local}</td>
                <td>${evento.cidade}/${evento.estado}</td>
                <td>${Utils.formatCurrency(evento.cache_bruto)}</td>
                <td class="${lucro.lucro >= 0 ? 'text-success' : 'text-danger'}">
                    ${Utils.formatCurrency(lucro.lucro)}
                    <small style="display: block; font-size: 11px;">(${lucro.margem}%)</small>
                </td>
                <td>
                    <span class="badge badge-${
                        evento.status === 'Confirmado' ? 'success' : 
                        evento.status === 'Realizado' ? 'info' : 
                        evento.status === 'Cancelado' ? 'danger' : 'warning'
                    }">
                        ${evento.status}
                    </span>
                </td>
                <td>
                    <button class="btn-secondary btn-sm" onclick="Modals.showEventoMultiStepModal('${evento.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${Auth.canDelete('eventos', evento.artista_id) ? `
                        <button class="btn-secondary btn-sm" onclick="Pages.deleteEvento('${evento.id}')" style="color: var(--danger);">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }
    
    return html;
};

// Deletar evento
Pages.deleteEvento = async function(eventoId) {
    const confirmed = await Utils.confirm('Tem certeza que deseja deletar este evento? Esta ação não pode ser desfeita.');
    if (!confirmed) return;

    Utils.showLoading();
    const result = await EventosDB.deletar(eventoId);
    Utils.hideLoading();

    if (result) {
        Utils.showToast('Evento deletado com sucesso!', 'success');
        this.renderEventos();
    } else {
        Utils.showToast('Erro ao deletar evento', 'error');
    }
};