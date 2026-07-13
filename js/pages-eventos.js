/* ========================================
   GIBSON MANAGER PRO - PAGES (EVENTOS, AGENDA, CONTRATOS)
   Páginas de Eventos, Agenda e Contratos
======================================== */

// Extender objeto Pages
Pages.renderAgenda = async function() {
    let eventos = await EventosDB.listar();
    eventos = await Auth.filterByPermissions(eventos, 'eventos');

    // Organizar eventos por mês
    const eventosPorMes = {};
    eventos.forEach(e => {
        const data = new Date(e.data);
        const key = `${data.getFullYear()}-${data.getMonth()}`;
        if (!eventosPorMes[key]) {
            eventosPorMes[key] = [];
        }
        eventosPorMes[key].push(e);
    });

    const hoje = new Date();
    // Usa as variáveis globais de navegação se existirem, senão usa o mês/ano atual
    if (typeof window.agendaMes === 'undefined') window.agendaMes = hoje.getMonth();
    if (typeof window.agendaAno === 'undefined') window.agendaAno = hoje.getFullYear();

    const html = `
        <div class="agenda-container">
            <div class="page-header flex-between mb-3">
                <div>
                    <h2>Agenda de Shows</h2>
                    <p class="text-muted">${eventos.length} evento(s) cadastrado(s)</p>
                </div>
                ${Auth.canEdit('eventos') ? `
                    <button class="btn-primary" onclick="Modals.showEventoModal()">
                        <i class="fas fa-plus"></i> Novo Evento
                    </button>
                ` : ''}
            </div>

            <!-- Calendário Simplificado -->
            <div class="card mb-3">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <button class="btn-secondary btn-sm" onclick="Pages.mudarMesAgenda(-1)">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <h3 class="card-title" style="margin: 0; text-align: center; flex: 1;">
                        <i class="fas fa-calendar-alt"></i> ${Utils.getMonthName(window.agendaMes)} ${window.agendaAno}
                    </h3>
                    <button class="btn-secondary btn-sm" onclick="Pages.mudarMesAgenda(1)">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="card-body">
                    ${await this.renderMiniCalendar(window.agendaMes, window.agendaAno, eventos)}
                </div>
            </div>

            <!-- Lista de Eventos Próximos -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Próximos Eventos</h3>
                </div>
                <div class="card-body">
                    ${await this.renderProximosEventos(eventos)}
                </div>
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
};

Pages.mudarMesAgenda = function(delta) {
    window.agendaMes += delta;
    if (window.agendaMes > 11) {
        window.agendaMes = 0;
        window.agendaAno++;
    } else if (window.agendaMes < 0) {
        window.agendaMes = 11;
        window.agendaAno--;
    }
    Pages.renderAgenda();
};

Pages.renderMiniCalendar = async function(mes, ano, eventos) {
    const primeiroDia = new Date(ano, mes, 1).getDay();
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();
    const hoje = new Date().getDate();
    
    let html = '<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; text-align: center;">';
    
    // Cabeçalho dos dias
    ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach(dia => {
        html += `<div style="font-weight: 600; color: var(--text-secondary); padding: 8px;">${dia}</div>`;
    });
    
    // Dias vazios antes do primeiro dia
    for (let i = 0; i < primeiroDia; i++) {
        html += '<div></div>';
    }
    
    // Dias do mês
    for (let dia = 1; dia <= ultimoDia; dia++) {
        const dataCompleta = new Date(ano, mes, dia);
        const eventosNoDia = eventos.filter(e => {
            if (!e.data) return false;
            const dStr = e.data.includes('T') ? e.data : e.data + 'T12:00:00';
            const dataEvento = new Date(dStr);
            return dataEvento.getDate() === dia && 
                   dataEvento.getMonth() === mes && 
                   dataEvento.getFullYear() === ano;
        });
        
        const isHoje = dia === hoje && mes === new Date().getMonth() && ano === new Date().getFullYear();
        
        html += `
            <div style="
                padding: 8px;
                border-radius: 8px;
                background: ${eventosNoDia.length > 0 ? 'var(--red-primary)' : isHoje ? 'rgba(225, 6, 0, 0.2)' : 'var(--bg-secondary)'};
                color: ${eventosNoDia.length > 0 || isHoje ? 'white' : 'var(--text-primary)'};
                font-weight: ${isHoje ? '700' : '400'};
                cursor: ${eventosNoDia.length > 0 ? 'pointer' : 'default'};
                position: relative;
            " ${eventosNoDia.length > 0 ? `title="${eventosNoDia.length} evento(s)"` : ''}>
                ${dia}
                ${eventosNoDia.length > 0 ? `<div style="position: absolute; bottom: 2px; right: 2px; width: 6px; height: 6px; background: white; border-radius: 50%;"></div>` : ''}
            </div>
        `;
    }
    
    html += '</div>';
    return html;
};

Pages.renderProximosEventos = async function(eventos) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zera as horas para comparar corretamente o dia de hoje

    const proximos = eventos
        .filter(e => {
            if (!e.data) return false;
            // Garantir que não haja timezone shift (cair pro dia anterior) se for só YYYY-MM-DD
            const dStr = e.data.includes('T') ? e.data : e.data + 'T12:00:00';
            const dataEvento = new Date(dStr);
            dataEvento.setHours(0, 0, 0, 0);
            return dataEvento >= hoje;
        })
        .sort((a, b) => new Date(a.data) - new Date(b.data))
        .slice(0, 10);

    if (proximos.length === 0) {
        return '<p class="text-muted">Nenhum evento próximo.</p>';
    }

    let html = '<div class="event-timeline">';
    
    for (const evento of proximos) {
        const artista = await ArtistasDB.buscarPorId(evento.artista_id);
        const lucro = await Utils.calcularLucroEvento(evento.id);
        const dStr = evento.data.includes('T') ? evento.data : evento.data + 'T12:00:00';
        const dataEvt = new Date(dStr);
        
        html += `
            <div class="event-timeline-item" style="padding: 20px; border-left: 3px solid var(--red-primary); margin-bottom: 16px; background: var(--bg-secondary); border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <span style="font-size: 24px; font-weight: 700; color: var(--red-primary);">
                                ${dataEvt.getDate()}
                            </span>
                            <div>
                                <p style="margin: 0; color: var(--text-secondary); font-size: 12px;">
                                    ${Utils.formatDate(evento.data)} - ${evento.horario}
                                </p>
                                <h4 style="margin: 4px 0; font-size: 18px;">${evento.local}</h4>
                            </div>
                        </div>
                        <p style="color: var(--text-secondary); margin: 8px 0;">
                            <i class="fas fa-microphone"></i> ${artista ? artista.nome : 'Artista não encontrado'} |
                            <i class="fas fa-map-marker-alt"></i> ${evento.cidade}/${evento.estado}
                        </p>
                        <div style="margin-top: 12px; display: flex; gap: 16px;">
                            <span style="font-size: 13px; color: var(--text-secondary);">
                                Cachê: <strong style="color: var(--success);">${Utils.formatCurrency(evento.cache_bruto)}</strong>
                            </span>
                            <span style="font-size: 13px; color: var(--text-secondary);">
                                Lucro: <strong style="color: ${lucro.lucro >= 0 ? 'var(--success)' : 'var(--danger)'};">
                                    ${Utils.formatCurrency(lucro.lucro)}
                                </strong>
                            </span>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span class="badge badge-${evento.status === 'Confirmado' ? 'success' : 'warning'}">
                            ${evento.status}
                        </span>
                        <div style="margin-top: 12px;">
                            <button class="btn-secondary btn-sm" onclick="Modals.showEventoModal('${evento.id}')">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
};

Pages.renderEventos = async function() {
    let eventos = await EventosDB.listar();
    eventos = await Auth.filterByPermissions(eventos, 'eventos');

    const html = `
        <div class="eventos-container">
            <div class="page-header flex-between mb-3">
                <div>
                    <h2>Eventos</h2>
                    <p class="text-muted">${eventos.length} evento(s) cadastrado(s)</p>
                </div>
                ${Auth.canEdit('eventos') ? `
                    <button class="btn-primary" onclick="Modals.showEventoModal()">
                        <i class="fas fa-plus"></i> Novo Evento
                    </button>
                ` : ''}
            </div>

            ${eventos.length > 0 ? `
                <div class="card">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Artista</th>
                                    <th>Local</th>
                                    <th>Cidade/UF</th>
                                    <th>Cachê Bruto</th>
                                    <th>Valor Líquido</th>
                                    <th>Lucro</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="eventosTableBody">
                                ${await this.renderEventosTableRows(eventos)}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : `
                <div class="card text-center" style="padding: 60px;">
                    <i class="fas fa-ticket-alt" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--text-secondary);">Nenhum evento cadastrado</h3>
                    ${Auth.canEdit('eventos') ? `
                        <button class="btn-primary mt-2" onclick="Modals.showEventoModal()">
                            <i class="fas fa-plus"></i> Cadastrar Primeiro Evento
                        </button>
                    ` : ''}
                </div>
            `}
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
};

Pages.renderEventosTableRows = async function(eventos) {
    let html = '';
    
    for (const evento of eventos) {
        const artista = await ArtistasDB.buscarPorId(evento.artista_id);
        const lucro = await Utils.calcularLucroEvento(evento.id);
        
        html += `
            <tr>
                <td>${Utils.formatDate(evento.data)}</td>
                <td>${artista ? artista.nome : '-'}</td>
                <td>${evento.local}</td>
                <td>${evento.cidade}/${evento.estado}</td>
                <td>${Utils.formatCurrency(evento.cache_bruto)}</td>
                <td>${Utils.formatCurrency(evento.valor_liquido)}</td>
                <td class="${lucro.lucro >= 0 ? 'text-success' : 'text-danger'}">
                    ${Utils.formatCurrency(lucro.lucro)}
                    <small style="display: block; font-size: 11px;">(${lucro.margem}%)</small>
                </td>
                <td>
                    <span class="badge badge-${evento.status === 'Confirmado' ? 'success' : evento.status === 'Realizado' ? 'info' : 'warning'}">
                        ${evento.status}
                    </span>
                </td>
                <td>
                    <button class="btn-secondary btn-sm" onclick="Modals.showEventoModal('${evento.id}')">
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

Pages.renderContratos = async function() {
    let contratos = await ContratosDB.listar();
    
    // Buscar eventos associados
    const contratosComDados = [];
    for (const contrato of contratos) {
        const evento = await EventosDB.buscarPorId(contrato.evento_id);
        const artista = evento ? await ArtistasDB.buscarPorId(evento.artista_id) : null;
        contratosComDados.push({
            ...contrato,
            evento,
            artista
        });
    }

    const html = `
        <div class="contratos-container">
            <div class="page-header mb-3">
                <h2>Contratos</h2>
                <p class="text-muted">${contratos.length} contrato(s) gerado(s)</p>
            </div>

            <div class="grid grid-3 mb-3">
                <div class="stat-card">
                    <div class="stat-icon green">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${contratos.filter(c => c.status === 'Assinado').length}</h3>
                        <p>Assinados</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon yellow">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${contratos.filter(c => c.status === 'Pendente').length}</h3>
                        <p>Pendentes</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon red">
                        <i class="fas fa-times-circle"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${contratos.filter(c => c.status === 'Cancelado').length}</h3>
                        <p>Cancelados</p>
                    </div>
                </div>
            </div>

            ${contratosComDados.length > 0 ? `
                <div class="card">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Artista</th>
                                    <th>Evento</th>
                                    <th>Data do Evento</th>
                                    <th>Data de Geração</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${contratosComDados.map(c => `
                                    <tr>
                                        <td>${c.artista ? c.artista.nome : '-'}</td>
                                        <td>${c.evento ? c.evento.local : '-'}</td>
                                        <td>${c.evento ? Utils.formatDate(c.evento.data) : '-'}</td>
                                        <td>${Utils.formatDate(c.data_geracao)}</td>
                                        <td>
                                            <span class="badge badge-${c.status === 'Assinado' ? 'success' : c.status === 'Pendente' ? 'warning' : 'danger'}">
                                                ${c.status}
                                            </span>
                                        </td>
                                        <td>
                                            <button class="btn-secondary btn-sm" onclick="Modals.showContratoPreview('${c.id}')">
                                                <i class="fas fa-eye"></i> Ver
                                            </button>
                                            ${c.status === 'Pendente' && Auth.canEdit('contratos') ? `
                                                <button class="btn-primary btn-sm" onclick="Pages.assinarContrato('${c.id}')">
                                                    <i class="fas fa-signature"></i> Assinar
                                                </button>
                                            ` : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : `
                <div class="card text-center" style="padding: 60px;">
                    <i class="fas fa-file-contract" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--text-secondary);">Nenhum contrato gerado</h3>
                    <p class="text-muted">Contratos são gerados automaticamente ao criar eventos.</p>
                </div>
            `}
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
};

Pages.assinarContrato = async function(contratoId) {
    const confirmed = await Utils.confirm('Confirmar assinatura deste contrato?');
    if (!confirmed) return;

    Utils.showLoading();
    const result = await ContratosDB.assinar(contratoId);
    Utils.hideLoading();

    if (result) {
        Utils.showToast('✅ Contrato assinado com sucesso!', 'success');
        this.renderContratos();
    } else {
        Utils.showToast('Erro ao assinar contrato', 'error');
    }
};