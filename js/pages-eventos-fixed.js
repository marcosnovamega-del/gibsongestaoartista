/* ========================================
   GIBSON MANAGER PRO - EVENTOS (CORRIGIDO)
   Módulo de Eventos com Agenda Integrada e Multi-etapas
======================================== */

// Variáveis globais para agenda
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Renderizar módulo de Eventos com Agenda
Pages.renderEventos = async function() {
    let eventos = await EventosDB.listar();
    eventos = await Auth.filterByPermissions(eventos, 'eventos');

    // Filtrar por termo de busca
    if (Pages.currentSearchTerm) {
        eventos = eventos.filter(e => 
            e.local.toLowerCase().includes(Pages.currentSearchTerm) ||
            e.cidade.toLowerCase().includes(Pages.currentSearchTerm) ||
            e.razao_social?.toLowerCase().includes(Pages.currentSearchTerm) ||
            e.nome_contratante?.toLowerCase().includes(Pages.currentSearchTerm)
        );
    }

    const html = `
        <div class="eventos-container">
            <!-- Abas de Visualização -->
            <div class="page-header flex-between mb-3">
                <div>
                    <h2>Gestão de Eventos</h2>
                    <p class="text-muted">${eventos.length} evento(s) cadastrado(s)</p>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button class="btn-secondary" onclick="Utils.exportToExcel(eventos, 'lista_eventos')">
                        <i class="fas fa-file-excel"></i> Exportar
                    </button>
                    ${Auth.canEdit('eventos') ? `
                        <button class="btn-primary" onclick="Modals.showEventoMultiStepModal()">
                            <i class="fas fa-plus"></i> Novo Evento
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- Tabs: Agenda | Lista -->
            <div class="tabs-container card mb-3">
                <div class="tab-buttons">
                    <button class="tab-btn active" data-tab="agenda">
                        <i class="fas fa-calendar-alt"></i> Agenda
                    </button>
                    <button class="tab-btn" data-tab="lista">
                        <i class="fas fa-list"></i> Lista Completa
                    </button>
                </div>

                <!-- Tab: Agenda -->
                <div class="tab-pane active" id="tab-agenda">
                    ${await this.renderAgendaView(eventos)}
                </div>

                <!-- Tab: Lista -->
                <div class="tab-pane" id="tab-lista">
                    ${await this.renderListaView(eventos)}
                </div>
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;

    // Event listeners para tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        });
    });
};

// Renderizar visualização de Agenda
Pages.renderAgendaView = async function(eventos) {
    return `
        <div class="agenda-view">
            <!-- Controles do Calendário -->
            <div class="calendar-controls" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 16px; background: var(--bg-secondary); border-radius: 12px;">
                <button class="btn-secondary btn-sm" onclick="Pages.changeMonth(-1)">
                    <i class="fas fa-chevron-left"></i> Anterior
                </button>
                <div style="text-align: center;">
                    <h3 style="margin: 0; font-size: 22px; font-weight: 800; color: var(--red-primary);">
                        ${Utils.getMonthName(currentMonth)} ${currentYear}
                    </h3>
                    <small style="color: var(--text-muted);">Clique em um dia com evento para ver detalhes</small>
                </div>
                <button class="btn-secondary btn-sm" onclick="Pages.changeMonth(1)">
                    Próximo <i class="fas fa-chevron-right"></i>
                </button>
            </div>

            <!-- Calendário -->
            <div class="calendar-grid">
                ${await this.renderCalendario(eventos, currentMonth, currentYear)}
            </div>

            <!-- Próximos Eventos -->
            <div class="mt-3">
                <h4 style="font-size: 18px; font-weight: 700; margin-bottom: 16px; color: var(--red-primary);">
                    <i class="fas fa-clock"></i> Próximos Eventos
                </h4>
                ${await this.renderProximosEventosLista(eventos)}
            </div>
        </div>
    `;
};

// Mudar mês do calendário
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
Pages.renderCalendario = async function(eventos, mes, ano) {
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
                min-height: 90px;
                position: relative;
                transition: all 0.2s;
                cursor: default;
            }
            .calendar-day:hover {
                border-color: var(--red-primary);
                box-shadow: 0 0 15px var(--red-glow);
            }
            .calendar-day.has-event {
                border-color: var(--red-primary);
                background: linear-gradient(135deg, rgba(225, 6, 0, 0.1) 0%, var(--bg-card) 100%);
                cursor: pointer;
            }
            .calendar-day.today {
                border: 2px solid var(--red-primary);
                box-shadow: 0 0 20px var(--red-glow);
            }
            .calendar-day-number {
                font-weight: 700;
                font-size: 16px;
                color: var(--text-primary);
                margin-bottom: 6px;
            }
            .calendar-day.today .calendar-day-number {
                color: var(--red-primary);
            }
            .calendar-day-events {
                font-size: 11px;
                color: var(--text-secondary);
                margin-top: 6px;
            }
            .calendar-day-event-dot {
                width: 6px;
                height: 6px;
                background: var(--red-primary);
                border-radius: 50%;
                display: inline-block;
                margin-right: 4px;
                box-shadow: 0 0 8px var(--red-primary);
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
        const dataCompleta = new Date(ano, mes, dia);
        const eventosNoDia = eventos.filter(e => {
            const dataEvento = new Date(e.data);
            return dataEvento.getDate() === dia && 
                   dataEvento.getMonth() === mes && 
                   dataEvento.getFullYear() === ano;
        });
        
        const isHoje = dia === diaHoje && mes === mesHoje && ano === anoHoje;
        const hasEvent = eventosNoDia.length > 0;
        
        html += `
            <div class="calendar-day ${hasEvent ? 'has-event' : ''} ${isHoje ? 'today' : ''}" 
                 ${hasEvent ? `onclick="Pages.showEventosDoDay('${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}')"` : ''}>
                <div class="calendar-day-number">${dia}</div>
                ${hasEvent ? `
                    <div class="calendar-day-events">
                        <span class="calendar-day-event-dot"></span>
                        ${eventosNoDia.length} evento(s)
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    return html;
};

// Mostrar eventos do dia
Pages.showEventosDoDay = async function(data) {
    const eventos = await EventosDB.listar();
    const eventosDoDay = eventos.filter(e => {
        const dataEvento = new Date(e.data);
        const dataStr = `${dataEvento.getFullYear()}-${String(dataEvento.getMonth() + 1).padStart(2, '0')}-${String(dataEvento.getDate()).padStart(2, '0')}`;
        return dataStr === data;
    });

    if (eventosDoDay.length === 0) return;

    let html = '<div style="margin-top: 16px;">';
    for (const evento of eventosDoDay) {
        const artista = await ArtistasDB.buscarPorId(evento.artista_id);
        const lucro = await Utils.calcularLucroEvento(evento.id);
        
        html += `
            <div class="card mb-2" style="padding: 16px;">
                <div class="flex-between">
                    <div>
                        <h4 style="margin-bottom: 4px;">${evento.local}</h4>
                        <p style="font-size: 13px; color: var(--text-secondary); margin: 4px 0;">
                            <i class="fas fa-microphone"></i> ${artista ? artista.nome : '-'} | 
                            <i class="fas fa-clock"></i> ${evento.horario}
                        </p>
                        <p style="font-size: 13px; color: var(--text-secondary); margin: 4px 0;">
                            <i class="fas fa-dollar-sign"></i> Cachê: ${Utils.formatCurrency(evento.cache_bruto)} | 
                            Lucro: <strong style="color: ${lucro.lucro >= 0 ? 'var(--success)' : 'var(--danger)'};">${Utils.formatCurrency(lucro.lucro)}</strong>
                        </p>
                    </div>
                    <div>
                        <span class="badge badge-${evento.status === 'Confirmado' ? 'success' : 'warning'}">${evento.status}</span>
                        <button class="btn-secondary btn-sm mt-1" onclick="Modals.showEventoMultiStepModal('${evento.id}')">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    html += '</div>';

    // Inserir abaixo do calendário
    const agendaView = document.querySelector('.agenda-view');
    const existingList = agendaView.querySelector('.eventos-do-dia');
    if (existingList) existingList.remove();
    
    const div = document.createElement('div');
    div.className = 'eventos-do-dia';
    div.innerHTML = `
        <div class="mt-3">
            <h4 style="font-size: 18px; font-weight: 700; margin-bottom: 16px; color: var(--red-primary);">
                <i class="fas fa-calendar-day"></i> Eventos em ${Utils.formatDate(data)}
            </h4>
            ${html}
        </div>
    `;
    
    const proximosEventos = agendaView.querySelector('.mt-3');
    agendaView.insertBefore(div, proximosEventos);
    
    // Scroll até a lista
    div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
            <div class="card mb-2" style="padding: 16px; border-left: 4px solid var(--red-primary);">
                <div class="flex-between">
                    <div>
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <span style="font-size: 28px; font-weight: 900; color: var(--red-primary);">
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
Pages.renderListaView = async function(eventos) {
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
                    ${await this.renderEventosTableRows(eventos)}
                </tbody>
            </table>
        </div>
    `;
};

Pages.renderEventosTableRows = async function(eventos) {
    let html = '';
    
    // Ordenar por data (mais recentes primeiro)
    eventos.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    for (const evento of eventos) {
        const artista = await ArtistasDB.buscarPorId(evento.artista_id);
        const lucro = await Utils.calcularLucroEvento(evento.id);
        
        html += `
            <tr>
                <td><strong>${Utils.formatDate(evento.data)}</strong></td>
                <td>${artista ? artista.nome : '-'}</td>
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