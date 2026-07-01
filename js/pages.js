/* ========================================
   GIBSON MANAGER PRO - PAGES (OTIMIZADO)
   Dashboard e Artistas - Performance Máxima
======================================== */

const Pages = {
    currentPage: null,
    cache: {},

    // Renderizar Dashboard (OTIMIZADO)
    async renderDashboard() {
        if (this.cache.dashboardData && Date.now() - this.cache.dashboardTime < 60000) {
            this.renderDashboardHTML(this.cache.dashboardData);
            return;
        }

        const hoje = new Date();
        const mes = hoje.getMonth();
        const ano = hoje.getFullYear();

        const [totais, eventos, parcelas, artistas] = await Promise.all([
            Utils.calcularTotaisMes(mes, ano),
            EventosDB.listar(),
            ParcelasDB.listar(),
            ArtistasDB.listar()
        ]);
        const artMap = {};
        artistas.forEach(a => { artMap[a.id] = a.nome; });

        const eventosDoMes = eventos.filter(e => {
            const d = new Date(e.data);
            return d.getMonth() === mes && d.getFullYear() === ano;
        });

        const parcelasAtrasadas = parcelas.filter(p => {
            if (p.status === 'Pago') return false;
            return new Date(p.data_vencimento) < hoje;
        });

        const proximosEventos = eventos
            .filter(e => new Date(e.data) >= hoje)
            .sort((a, b) => new Date(a.data) - new Date(b.data))
            .slice(0, 5);

        // Enriquecer proximosEventos com nome do artista
        const proximosEventosRicos = proximosEventos.map(e => ({
            ...e,
            artistaNome: artMap[e.artista_id] || null
        }));

        const data = {
            totais,
            eventosDoMes: eventosDoMes.length,
            parcelasAtrasadas: parcelasAtrasadas.length,
            proximosEventos: proximosEventosRicos,
            mes,
            ano
        };

        this.cache.dashboardData = data;
        this.cache.dashboardTime = Date.now();

        this.renderDashboardHTML(data);
    },

    renderDashboardHTML(data) {
        const html = `
            <div class="dashboard-container fade-in">
                <div class="page-header mb-3">
                    <h2>Dashboard Executivo</h2>
                    <p class="text-muted">${Utils.getMonthName(data.mes)} ${data.ano}</p>
                </div>

                <div class="grid grid-4 mb-3">
                    <div class="stat-card">
                        <div class="stat-icon red">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${data.eventosDoMes}</h3>
                            <p>Shows do Mês</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon green">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${Utils.formatCurrency(data.totais.receita)}</h3>
                            <p>Receita Total</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon yellow">
                            <i class="fas fa-money-bill-wave"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${Utils.formatCurrency(data.totais.despesas)}</h3>
                            <p>Total de Despesas</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon ${data.totais.lucro >= 0 ? 'green' : 'red'}">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="stat-content">
                            <h3 class="${data.totais.lucro >= 0 ? 'text-success' : 'text-danger'}">
                                ${Utils.formatCurrency(data.totais.lucro)}
                            </h3>
                            <p>Lucro Líquido (${data.totais.margem}%)</p>
                        </div>
                    </div>
                </div>

                <div class="grid grid-2">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Receita Mensal</h3>
                        </div>
                        <div class="card-body">
                            <canvas id="revenueChart" style="height: 300px;"></canvas>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Próximos Eventos</h3>
                        </div>
                        <div class="card-body" style="padding:8px 0;">
                            ${data.proximosEventos.length > 0 ?
                                data.proximosEventos.map(e => {
                                    const dataEvento = new Date(e.data + 'T00:00:00');
                                    const hoje2 = new Date(); hoje2.setHours(0,0,0,0);
                                    const diffMs = dataEvento - hoje2;
                                    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                                    const diaNum = dataEvento.getDate();
                                    const mesNomes = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
                                    const mesAbrev = mesNomes[dataEvento.getMonth()];
                                    const ano2 = dataEvento.getFullYear();
                                    const countdown = diffDias === 0 ? 'hoje!' : diffDias === 1 ? 'amanhã' : `em ${diffDias} dias`;
                                    const cidade = [e.cidade, e.estado].filter(Boolean).join('/');
                                    return `
                                    <div class="agenda-card-item">
                                        <div class="agenda-day-badge">
                                            <span class="agenda-day-num">${diaNum}</span>
                                            <span class="agenda-day-mes">${mesAbrev}</span>
                                        </div>
                                        <div class="agenda-card-info">
                                            <div class="agenda-card-meta">${Utils.formatDate(e.data)} <span class="agenda-countdown">(${countdown})</span></div>
                                            <div class="agenda-card-local">${e.local || '—'}</div>
                                            <div class="agenda-card-sub">
                                                ${e.artistaNome ? `<span><i class="fas fa-microphone-alt"></i> ${e.artistaNome}</span>` : ''}
                                                ${cidade ? `<span><i class="fas fa-map-marker-alt"></i> ${cidade}</span>` : ''}
                                            </div>
                                        </div>
                                    </div>`;
                                }).join('')
                                : '<p class="text-muted" style="padding:16px;">Nenhum evento próximo</p>'
                            }
                        </div>
                    </div>
                </div>

                ${data.parcelasAtrasadas > 0 ? `
                    <div class="card mt-3" style="border-left: 4px solid var(--danger);">
                        <div class="card-header">
                            <h3 class="card-title">
                                <i class="fas fa-exclamation-triangle text-danger"></i>
                                Alertas Financeiros
                            </h3>
                        </div>
                        <div class="card-body">
                            <p class="text-danger"><strong>${data.parcelasAtrasadas} parcela(s) atrasada(s)</strong></p>
                            <button class="btn-primary btn-sm mt-2" onclick="Pages.changePage('financeiro')">
                                Ver Parcelas
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        document.getElementById('pageContent').innerHTML = html;
        setTimeout(() => this.renderRevenueChart(data.mes, data.ano), 100);
    },

    async renderRevenueChart(mes, ano) {
        const canvas = document.getElementById('revenueChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const meses = [];
        const receitas = [];
        const despesas = [];

        for (let i = 5; i >= 0; i--) {
            const m = mes - i;
            const a = m < 0 ? ano - 1 : ano;
            const mesAtual = m < 0 ? 12 + m : m;
            
            meses.push(Utils.getMonthName(mesAtual).substring(0, 3));
            
            const totais = await Utils.calcularTotaisMes(mesAtual, a);
            receitas.push(totais.receita);
            despesas.push(totais.despesas);
        }

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: meses,
                datasets: [
                    {
                        label: 'Receita',
                        data: receitas,
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Despesas',
                        data: despesas,
                        borderColor: '#EF4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#A0A0A0' } }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#A0A0A0',
                            callback: value => 'R$ ' + value.toLocaleString('pt-BR')
                        },
                        grid: { color: '#2A2A2A' }
                    },
                    x: {
                        ticks: { color: '#A0A0A0' },
                        grid: { color: '#2A2A2A' }
                    }
                }
            }
        });
    },

    // Renderizar Artistas (OTIMIZADO)
    async renderArtistas() {
        let artistas = await ArtistasDB.listar();
        artistas = await Auth.filterByPermissions(artistas, 'artistas');

        const html = `
            <div class="artistas-container fade-in">
                <div class="page-header flex-between mb-3">
                    <div>
                        <h2>Artistas</h2>
                        <p class="text-muted">${artistas.length} artista(s) cadastrado(s)</p>
                    </div>
                    ${Auth.isAdmin() ? `
                        <button class="btn-primary" onclick="Modals.showArtistaModal()">
                            <i class="fas fa-plus"></i> Novo Artista
                        </button>
                    ` : ''}
                </div>

                ${artistas.length > 0 ? `
                    <div class="grid grid-3">
                        ${artistas.map(artista => `
                            <div class="card artista-card" style="cursor: pointer; transition: all 0.2s;" onclick="Pages.renderArtistaProfile('${artista.id}')">
                                <div style="text-align: center;">
                                    <img src="${artista.foto}" alt="${artista.nome}" 
                                         style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid var(--red-primary); margin-bottom: 16px;" 
                                         loading="lazy">
                                    <h3 style="font-size: 20px; margin-bottom: 8px;">${artista.nome}</h3>
                                    <span class="badge badge-${artista.status === 'Ativo' ? 'success' : 'warning'}">
                                        ${artista.status}
                                    </span>
                                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
                                        <p style="color: var(--text-secondary); font-size: 14px; margin: 0;">
                                            Comissão: <strong style="color: var(--red-primary);">${Utils.formatCurrency(artista.comissao_padrao || 0)}</strong>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="card text-center" style="padding: 60px;">
                        <i class="fas fa-microphone" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
                        <h3 style="color: var(--text-secondary);">Nenhum artista cadastrado</h3>
                        ${Auth.isAdmin() ? `
                            <button class="btn-primary mt-2" onclick="Modals.showArtistaModal()">
                                <i class="fas fa-plus"></i> Cadastrar Primeiro Artista
                            </button>
                        ` : ''}
                    </div>
                `}
            </div>
        `;

        document.getElementById('pageContent').innerHTML = html;
    },

    // Renderizar perfil do artista (OTIMIZADO)
    async renderArtistaProfile(artistaId) {
        const [artista, eventos, equipe, contratos] = await Promise.all([
            ArtistasDB.buscarPorId(artistaId),
            EventosDB.buscarPorArtista(artistaId),
            EquipeDB.buscarPorArtista(artistaId),
            ContratosDB.listar().then(c => c.filter(ct => ct.artista_id === artistaId))
        ]);

        if (!artista) {
            Utils.showToast('Artista não encontrado', 'error');
            return;
        }

        let receitaTotal = 0;
        let despesasTotal = 0;
        
        for (const evento of eventos) {
            receitaTotal += evento.valor_liquido || 0;
            const despesas = await DespesasDB.calcularTotalEvento(evento.id);
            despesasTotal += despesas;
        }
        const lucroTotal = receitaTotal - despesasTotal;

        const html = `
            <div class="artista-profile fade-in">
                <div class="card mb-3">
                    <div style="display: flex; align-items: center; gap: 24px;">
                        <img src="${artista.foto}" alt="${artista.nome}" 
                             style="width: 120px; height: 120px; border-radius: 50%; border: 3px solid var(--red-primary);">
                        <div style="flex: 1;">
                            <h2 style="margin-bottom: 8px;">${artista.nome}</h2>
                            <span class="badge badge-${artista.status === 'Ativo' ? 'success' : 'warning'}">
                                ${artista.status}
                            </span>
                            <p style="color: var(--text-secondary); margin-top: 12px;">
                                Comissão: <strong style="color: var(--red-primary);">${Utils.formatCurrency(artista.comissao_padrao || 0)}</strong> | 
                                Cadastrado em: ${Utils.formatDate(artista.data_cadastro)}
                            </p>
                        </div>
                        ${Auth.canEdit('artistas', artistaId) ? `
                            <div>
                                <button class="btn-primary" onclick="Modals.showArtistaModal('${artistaId}')">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="grid grid-4 mb-3">
                    <div class="stat-card">
                        <div class="stat-icon red"><i class="fas fa-calendar"></i></div>
                        <div class="stat-content">
                            <h3>${eventos.length}</h3>
                            <p>Eventos</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon green"><i class="fas fa-dollar-sign"></i></div>
                        <div class="stat-content">
                            <h3>${Utils.formatCurrency(receitaTotal)}</h3>
                            <p>Receita</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon yellow"><i class="fas fa-money-bill"></i></div>
                        <div class="stat-content">
                            <h3>${Utils.formatCurrency(despesasTotal)}</h3>
                            <p>Despesas</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon ${lucroTotal >= 0 ? 'green' : 'red'}"><i class="fas fa-chart-line"></i></div>
                        <div class="stat-content">
                            <h3 class="${lucroTotal >= 0 ? 'text-success' : 'text-danger'}">
                                ${Utils.formatCurrency(lucroTotal)}
                            </h3>
                            <p>Lucro</p>
                        </div>
                    </div>
                </div>

                <div class="tabs">
                    <div class="tab-buttons">
                        <button class="tab-btn active" data-tab="eventos">
                            <i class="fas fa-calendar"></i> Eventos (${eventos.length})
                        </button>
                        <button class="tab-btn" data-tab="equipe">
                            <i class="fas fa-users"></i> Equipe (${equipe.length})
                        </button>
                        <button class="tab-btn" data-tab="contratos">
                            <i class="fas fa-file-contract"></i> Contratos (${contratos.length})
                        </button>
                        <button class="tab-btn" data-tab="modelo">
                            <i class="fas fa-file-alt"></i> Modelo de Contrato
                        </button>
                    </div>

                    <div class="tab-content">
                        <div class="tab-pane active" id="tab-eventos">
                            ${this.renderArtistaEventosTab(eventos)}
                        </div>
                        <div class="tab-pane" id="tab-equipe">
                            ${this.renderArtistaEquipeTab(artistaId, equipe)}
                        </div>
                        <div class="tab-pane" id="tab-contratos">
                            ${this.renderArtistaContratosTab(contratos)}
                        </div>
                        <div class="tab-pane" id="tab-modelo">
                            ${this.renderArtistaModeloTab(artista)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = html;

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
            });
        });
    },

    renderArtistaEventosTab(eventos) {
        if (eventos.length === 0) {
            return '<p class="text-muted">Nenhum evento cadastrado para este artista.</p>';
        }

        return `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Local</th>
                            <th>Cidade/UF</th>
                            <th>Cachê</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${eventos.map(e => `
                            <tr>
                                <td>${Utils.formatDate(e.data)}</td>
                                <td>${e.local}</td>
                                <td>${e.cidade}/${e.estado}</td>
                                <td>${Utils.formatCurrency(e.cache_bruto)}</td>
                                <td><span class="badge badge-${e.status === 'Confirmado' ? 'success' : 'warning'}">${e.status}</span></td>
                                <td>
                                    <button class="btn-secondary btn-sm" onclick="Modals.showEventoMultiStepModal('${e.id}')">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderArtistaEquipeTab(artistaId, equipe) {
        return `
            <div>
                ${Auth.canEdit('equipe', artistaId) ? `
                    <button class="btn-primary mb-3" onclick="Modals.showEquipeModal(null, '${artistaId}')">
                        <i class="fas fa-plus"></i> Adicionar Membro
                    </button>
                ` : ''}
                
                ${equipe.length > 0 ? `
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Função</th>
                                    <th>Tipo</th>
                                    <th>Valor/Percentual</th>
                                    <th>Contato</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${equipe.map(m => `
                                    <tr>
                                        <td><strong>${m.nome}</strong></td>
                                        <td>${m.funcao}</td>
                                        <td><span class="badge badge-info">${m.tipo_vinculo}</span></td>
                                        <td>
                                            ${m.valor_fixo ? Utils.formatCurrency(m.valor_fixo) : ''}
                                            ${m.percentual ? `${m.percentual}%` : ''}
                                        </td>
                                        <td>${Utils.formatPhone(m.telefone)}</td>
                                        <td>
                                            ${Auth.canEdit('equipe', artistaId) ? `
                                                <button class="btn-secondary btn-sm" onclick="Modals.showEquipeModal('${m.id}')">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                            ` : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : '<p class="text-muted">Nenhum membro de equipe cadastrado.</p>'}
            </div>
        `;
    },

    renderArtistaContratosTab(contratos) {
        if (contratos.length === 0) {
            return '<p class="text-muted">Nenhum contrato gerado para este artista.</p>';
        }

        return `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Data de Geração</th>
                            <th>Status</th>
                            <th>Data de Assinatura</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${contratos.map(c => `
                            <tr>
                                <td>${Utils.formatDate(c.data_geracao)}</td>
                                <td><span class="badge badge-${c.status === 'Assinado' ? 'success' : 'warning'}">${c.status}</span></td>
                                <td>${c.data_assinatura ? Utils.formatDate(c.data_assinatura) : '-'}</td>
                                <td>
                                    <button class="btn-secondary btn-sm" onclick="Modals.showContratoPreview('${c.id}')">
                                        <i class="fas fa-eye"></i> Ver
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderArtistaModeloTab(artista) {
        return `
            <div class="card">
                <div class="card-body">
                    <p class="text-muted mb-3">
                        Configure o modelo de contrato padrão para ${artista.nome}. 
                        Use as variáveis abaixo para inserir dados dinâmicos:
                    </p>
                    <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                        <strong>Variáveis disponíveis:</strong><br>
                        <code style="color: var(--red-primary);">{{razao_social}}</code>,
                        <code style="color: var(--red-primary);">{{cnpj_cpf}}</code>,
                        <code style="color: var(--red-primary);">{{nome_artista}}</code>,
                        <code style="color: var(--red-primary);">{{data_evento}}</code>,
                        <code style="color: var(--red-primary);">{{local_evento}}</code>,
                        <code style="color: var(--red-primary);">{{cidade_evento}}</code>,
                        <code style="color: var(--red-primary);">{{valor_total}}</code>
                    </div>
                    
                    ${Auth.canEdit('artistas', artista.id) ? `
                        <form id="modeloContratoForm" onsubmit="Pages.saveModeloContrato(event, '${artista.id}')">
                            <div class="form-group">
                                <label>Modelo de Contrato</label>
                                <textarea name="modelo_contrato" rows="15" style="font-family: monospace;">${artista.modelo_contrato || ''}</textarea>
                            </div>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-save"></i> Salvar Modelo
                            </button>
                        </form>
                    ` : `
                        <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; white-space: pre-wrap; font-family: monospace;">
                            ${artista.modelo_contrato || 'Nenhum modelo configurado.'}
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    async saveModeloContrato(event, artistaId) {
        event.preventDefault();
        const form = event.target;
        const modelo = form.modelo_contrato.value;

        const result = await ArtistasDB.atualizar(artistaId, { modelo_contrato: modelo });

        if (result) {
            Utils.showToast('Modelo de contrato salvo com sucesso!', 'success');
        } else {
            Utils.showToast('Erro ao salvar modelo', 'error');
        }
    },

    // Função para trocar de página (OTIMIZADO)
    changePage(page) {
        this.currentPage = page;

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });

        const titles = {
            dashboard: 'Dashboard',
            escritorio: 'Dashboard Escritório',
            artistas: 'Artistas',
            eventos: 'Eventos',
            contratos: 'Contratos',
            financeiro: 'Financeiro',
            equipe: 'Equipe',
            alertas: 'Alertas',
            usuarios: 'Usuários',
            configuracoes: 'Configurações'
        };
        document.getElementById('pageTitle').textContent = titles[page] || 'Gibson Manager Pro';

        document.getElementById('pageContent').innerHTML = '<div style="text-align: center; padding: 60px;"><i class="fas fa-spinner fa-spin" style="font-size: 48px; color: var(--red-primary);"></i></div>';

        setTimeout(() => {
            switch(page) {
                case 'dashboard':
                    this.renderDashboard();
                    break;
                case 'escritorio':
                    this.renderEscritorioDashboard();
                    break;
                case 'artistas':
                    this.renderArtistas();
                    break;
                case 'eventos':
                    this.renderEventos();
                    break;
                case 'contratos':
                    this.renderContratos();
                    break;
                case 'financeiro':
                    this.renderFinanceiro();
                    break;
                case 'equipe':
                    this.renderEquipe();
                    break;
                case 'alertas':
                    this.renderAlertas();
                    break;
                case 'usuarios':
                    this.renderUsuarios();
                    break;
                case 'configuracoes':
                    this.renderConfiguracoes();
                    break;
            }
        }, 50);
    }
};