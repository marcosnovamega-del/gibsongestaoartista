/* ========================================
   KSHOW MANAGER - ARTIST PORTAL
   Interface e Lógica exclusiva para o Artista
======================================== */

Pages.renderArtistaPortal = async function() {
    const artistaId = Auth.getArtistaVinculado();
    if (!artistaId) {
        document.getElementById('pageContent').innerHTML = `
            <div class="portal-body">
                <div class="portal-header">
                    <div class="portal-welcome">
                        <h1>Olá, Usuário</h1>
                        <p>Nenhum artista vinculado à sua conta.</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    Utils.showLoading();

    const [artista, eventos, todosBorderos] = await Promise.all([
        ArtistasDB.buscarPorId(artistaId),
        EventosDB.buscarPorArtista(artistaId),
        BorderosDB.listar()
    ]);

    Utils.hideLoading();

    // Próximos eventos
    const hoje = new Date();
    const proximos = eventos
        .filter(e => new Date(e.data) >= hoje)
        .sort((a, b) => new Date(a.data) - new Date(b.data));

    const proximoShow = proximos[0] || null;

    // Calcular Saldo (Baseado nos borderôs finalizados)
    const borderosArtista = todosBorderos.filter(b => {
        const ev = eventos.find(e => e.id === b.evento_id);
        return ev && b.status === 'APROVADO';
    });
    const saldoTotal = borderosArtista.reduce((sum, b) => sum + (parseFloat(b.lucro_liquido) || 0), 0);

    const html = `
        <div class="portal-body">
            <!-- Header -->
            <header class="portal-header">
                <div class="portal-welcome">
                    <h1>Olá, ${artista.nome.split(' ')[0]}!</h1>
                    <p>Sua agenda está atualizada.</p>
                    <button id="pwaPortalBtn" onclick="installPWA()" style="display:none; margin-top:8px; background:var(--portal-accent); color:white; border:none; padding:4px 10px; border-radius:20px; font-size:10px; font-weight:700;">
                        <i class="fas fa-download"></i> Baixar App
                    </button>
                </div>
                <img src="${artista.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(artista.nome)}&background=8B5CF6&color=fff`}" class="portal-avatar">
            </header>

            <!-- Stats -->
            <div class="portal-stats">
                <div class="portal-stat-card">
                    <div class="portal-stat-icon"><i class="fas fa-wallet"></i></div>
                    <div class="portal-stat-value">${Utils.formatCurrency(saldoTotal)}</div>
                    <div class="portal-stat-label">Saldo em Conta</div>
                </div>
                <div class="portal-stat-card">
                    <div class="portal-stat-icon"><i class="fas fa-calendar-check"></i></div>
                    <div class="portal-stat-value">${proximos.length}</div>
                    <div class="portal-stat-label">Shows Agendados</div>
                </div>
            </div>

            <!-- Próximo Show -->
            <div class="portal-next-show">
                ${proximoShow ? `
                    <div class="next-show-card" onclick="Pages.renderEventoDetalhesPortal('${proximoShow.id}')">
                        <div class="next-show-label">Próxima Parada</div>
                        <div class="next-show-title">${proximoShow.cidade} / ${proximoShow.estado}</div>
                        <div class="info-item">
                            <i class="fas fa-map-marker-alt"></i> ${proximoShow.local}
                        </div>
                        <div class="next-show-info">
                            <div class="info-item">
                                <i class="fas fa-calendar"></i> ${Utils.formatDate(proximoShow.data)}
                            </div>
                            <div class="info-item">
                                <i class="fas fa-clock"></i> ${proximoShow.horario || '--:--'}
                            </div>
                        </div>
                    </div>
                ` : `
                    <div class="next-show-card" style="background: var(--portal-card); border: 1px dashed var(--portal-muted);">
                        <div class="next-show-label">Sem shows próximos</div>
                        <div class="next-show-title">Aproveite o descanso!</div>
                    </div>
                `}
            </div>

            <!-- Lista de Agenda -->
            <div class="portal-section-title">
                <h2>Sua Agenda</h2>
                <a href="#" onclick="Pages.changePage('eventos')">Ver Todos</a>
            </div>

            <div class="agenda-list">
                ${proximos.length > 0 ? proximos.slice(0, 5).map(e => {
                    const dt = new Date(e.data);
                    const dia = dt.getDate();
                    const mes = Utils.getMonthName(dt.getMonth()).substring(0, 3);
                    return `
                        <div class="agenda-item" onclick="Pages.renderEventoDetalhesPortal('${e.id}')">
                            <div class="agenda-date">
                                <span class="date-day">${dia}</span>
                                <span class="date-month">${mes}</span>
                            </div>
                            <div class="agenda-info">
                                <h3>${e.cidade} - ${e.estado}</h3>
                                <p>${e.local}</p>
                            </div>
                            <i class="fas fa-chevron-right" style="margin-left: auto; color: var(--portal-muted); font-size: 12px;"></i>
                        </div>
                    `;
                }).join('') : '<p style="padding: 0 20px; color: var(--portal-muted);">Nenhum show marcado.</p>'}
            </div>

            <!-- Bottom Nav -->
            <nav class="portal-nav">
                <a href="#" class="nav-btn active" onclick="Pages.renderArtistaPortal()">
                    <i class="fas fa-home"></i>
                    <span>Início</span>
                </a>
                <a href="#" class="nav-btn" onclick="Pages.renderAgendaPortal()">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Agenda</span>
                </a>
                <a href="#" class="nav-btn" onclick="Pages.renderFinanceiroPortal()">
                    <i class="fas fa-wallet"></i>
                    <span>Financeiro</span>
                </a>
                <a href="#" class="nav-btn" onclick="Auth.logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Sair</span>
                </a>
            </nav>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
};

// Detalhes do Evento para o Artista (Simplificado)
Pages.renderEventoDetalhesPortal = async function(eventoId) {
    Utils.showLoading();
    const evento = await EventosDB.buscarPorId(eventoId);
    Utils.hideLoading();

    if (!evento) return;

    const html = `
        <div class="portal-body">
            <header class="portal-header">
                <div class="portal-welcome">
                    <button onclick="Pages.renderArtistaPortal()" style="background:none; border:none; color:var(--portal-accent); padding:0; margin-bottom:10px;">
                        <i class="fas fa-arrow-left"></i> Voltar
                    </button>
                    <h1>Detalhes do Show</h1>
                </div>
            </header>

            <div style="padding: 0 20px;">
                <div class="next-show-card" style="margin-bottom:20px;">
                    <div class="next-show-title">${evento.cidade} - ${evento.estado}</div>
                    <p style="margin:0; opacity:0.8;">${evento.local}</p>
                </div>

                <div class="portal-stat-card" style="margin-bottom:12px;">
                    <div style="font-size:12px; color:var(--portal-muted); margin-bottom:4px;">Data e Hora</div>
                    <div style="font-weight:700;">${Utils.formatDate(evento.data)} às ${evento.horario || '--:--'}</div>
                </div>

                <div class="portal-stat-card" style="margin-bottom:12px;">
                    <div style="font-size:12px; color:var(--portal-muted); margin-bottom:4px;">Localização</div>
                    <div style="font-weight:700;">${evento.endereco || 'Endereço não informado'}</div>
                </div>

                <div class="portal-stat-card" style="margin-bottom:12px;">
                    <div style="font-size:12px; color:var(--portal-muted); margin-bottom:4px;">Contratante / Responsável</div>
                    <div style="font-weight:700;">${evento.responsavel || 'Não informado'}</div>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:20px;">
                    <button class="btn-primary" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(evento.local + ' ' + evento.cidade)}')">
                        <i class="fas fa-map-marked-alt"></i> Como Chegar
                    </button>
                    <button class="btn-secondary" style="background:#25D366; color:white; border-color:#25D366;" onclick="window.open('${Utils.generateWhatsAppLink(evento.telefone_contratante)}')">
                        <i class="fab fa-whatsapp"></i> Contato
                    </button>
                </div>
            </div>

            <!-- Bottom Nav (Reutilizada) -->
            <nav class="portal-nav">
                <a href="#" class="nav-btn" onclick="Pages.renderArtistaPortal()">
                    <i class="fas fa-home"></i>
                    <span>Início</span>
                </a>
                <a href="#" class="nav-btn" onclick="Pages.renderAgendaPortal()">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Agenda</span>
                </a>
                <a href="#" class="nav-btn" onclick="Pages.renderFinanceiroPortal()">
                    <i class="fas fa-wallet"></i>
                    <span>Financeiro</span>
                </a>
                <a href="#" class="nav-btn" onclick="Auth.logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Sair</span>
                </a>
            </nav>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
};

// Agenda Completa para o Artista
Pages.renderAgendaPortal = async function() {
    const artistaId = Auth.getArtistaVinculado();
    Utils.showLoading();
    const eventos = await EventosDB.buscarPorArtista(artistaId);
    Utils.hideLoading();

    const hoje = new Date();
    const proximos = eventos
        .filter(e => new Date(e.data) >= hoje)
        .sort((a, b) => new Date(a.data) - new Date(b.data));

    const passados = eventos
        .filter(e => new Date(e.data) < hoje)
        .sort((a, b) => new Date(b.data) - new Date(a.data));

    const html = `
        <div class="portal-body">
            <header class="portal-header">
                <div class="portal-welcome">
                    <h1>Sua Agenda</h1>
                    <p>${eventos.length} shows no total</p>
                </div>
            </header>

            <div class="portal-section-title">
                <h2>Próximos Shows</h2>
            </div>
            <div class="agenda-list">
                ${proximos.length > 0 ? proximos.map(e => {
                    const dt = new Date(e.data);
                    return `
                        <div class="agenda-item" onclick="Pages.renderEventoDetalhesPortal('${e.id}')">
                            <div class="agenda-date">
                                <span class="date-day">${dt.getDate()}</span>
                                <span class="date-month">${Utils.getMonthName(dt.getMonth()).substring(0,3)}</span>
                            </div>
                            <div class="agenda-info">
                                <h3>${e.cidade} - ${e.estado}</h3>
                                <p>${e.local}</p>
                            </div>
                            <i class="fas fa-chevron-right" style="margin-left:auto; color:var(--portal-muted); font-size:12px;"></i>
                        </div>
                    `;
                }).join('') : '<p style="padding:0 20px; color:var(--portal-muted);">Nenhum show futuro.</p>'}
            </div>

            <div class="portal-section-title" style="margin-top:24px;">
                <h2>Histórico</h2>
            </div>
            <div class="agenda-list">
                ${passados.slice(0, 10).map(e => {
                    const dt = new Date(e.data);
                    return `
                        <div class="agenda-item" style="opacity:0.6;" onclick="Pages.renderEventoDetalhesPortal('${e.id}')">
                            <div class="agenda-date">
                                <span class="date-day">${dt.getDate()}</span>
                                <span class="date-month">${Utils.getMonthName(dt.getMonth()).substring(0,3)}</span>
                            </div>
                            <div class="agenda-info">
                                <h3>${e.cidade} - ${e.estado}</h3>
                                <p>${e.local}</p>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <nav class="portal-nav">
                <a href="#" class="nav-btn" onclick="Pages.renderArtistaPortal()">
                    <i class="fas fa-home"></i>
                    <span>Início</span>
                </a>
                <a href="#" class="nav-btn active" onclick="Pages.renderAgendaPortal()">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Agenda</span>
                </a>
                <a href="#" class="nav-btn" onclick="Pages.renderFinanceiroPortal()">
                    <i class="fas fa-wallet"></i>
                    <span>Financeiro</span>
                </a>
                <a href="#" class="nav-btn" onclick="Auth.logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Sair</span>
                </a>
            </nav>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = html;
};

// Financeiro para o Artista
Pages.renderFinanceiroPortal = async function() {
    const artistaId = Auth.getArtistaVinculado();
    Utils.showLoading();
    const [eventos, todosBorderos] = await Promise.all([
        EventosDB.buscarPorArtista(artistaId),
        BorderosDB.listar()
    ]);
    Utils.hideLoading();

    const borderosArtista = todosBorderos.filter(b => {
        const ev = eventos.find(e => e.id === b.evento_id);
        return ev && (b.status === 'APROVADO' || b.status === 'FINALIZADO');
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const totalRecebido = borderosArtista.reduce((sum, b) => sum + (parseFloat(b.lucro_liquido) || 0), 0);

    const html = `
        <div class="portal-body">
            <header class="portal-header">
                <div class="portal-welcome">
                    <h1>Financeiro</h1>
                    <p>Resumo de recebimentos</p>
                </div>
            </header>

            <div style="padding:0 20px; margin-bottom:24px;">
                <div class="next-show-card" style="background:var(--portal-card); border:1px solid rgba(255,255,255,0.1);">
                    <div class="next-show-label">Total em Saldo</div>
                    <div class="next-show-title" style="color:var(--portal-accent); font-size:28px;">${Utils.formatCurrency(totalRecebido)}</div>
                    <p style="margin:8px 0 0; font-size:11px; color:var(--portal-muted);">Saldo consolidado de shows finalizados.</p>
                </div>
            </div>

            <div class="portal-section-title">
                <h2>Últimos Fechamentos</h2>
            </div>

            <div class="agenda-list">
                ${borderosArtista.length > 0 ? borderosArtista.map(b => {
                    const ev = eventos.find(e => e.id === b.evento_id);
                    return `
                        <div class="agenda-item">
                            <div class="agenda-info">
                                <h3>${ev ? ev.cidade : 'Evento'}</h3>
                                <p>${ev ? Utils.formatDate(ev.data) : ''}</p>
                            </div>
                            <div style="margin-left:auto; text-align:right;">
                                <div style="font-weight:700; color:var(--portal-accent);">${Utils.formatCurrency(b.lucro_liquido)}</div>
                                <div style="font-size:10px; color:var(--portal-muted);">${b.status}</div>
                            </div>
                        </div>
                    `;
                }).join('') : '<p style="padding:0 20px; color:var(--portal-muted);">Nenhum fechamento disponível.</p>'}
            </div>

            <nav class="portal-nav">
                <a href="#" class="nav-btn" onclick="Pages.renderArtistaPortal()">
                    <i class="fas fa-home"></i>
                    <span>Início</span>
                </a>
                <a href="#" class="nav-btn" onclick="Pages.renderAgendaPortal()">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Agenda</span>
                </a>
                <a href="#" class="nav-btn active" onclick="Pages.renderFinanceiroPortal()">
                    <i class="fas fa-wallet"></i>
                    <span>Financeiro</span>
                </a>
                <a href="#" class="nav-btn" onclick="Auth.logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Sair</span>
                </a>
            </nav>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = html;
};
