/* ========================================
   KSHOW MANAGER - PAGES OTIMIZADO
   Performance máxima + Lazy Loading
======================================== */

const Pages = {
    currentPage: null,
    isChanging: false,
    _chartInstance: null, // Referência do Chart.js para destruir antes de recriar

    // Trocar página com loading instantâneo
    async changePage(page) {
        if (this.isChanging) return;
        
        this.isChanging = true;
        this.currentPage = page;

        // Atualizar navegação
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });
        
        // Se for artista, forçar portal do artista se tentar ir para página não permitida
        const isArtista = Auth.currentUser && Auth.currentUser.nivel === 'Artista';
        if (isArtista && !['dashboard', 'eventos', 'financeiro', 'alertas'].includes(page)) {
            page = 'dashboard';
        }

        // Atualizar título
        const titles = {
            dashboard:          'Dashboard',
            artistas:           'Artistas',
            eventos:            'Eventos',
            contratos:          'Contratos',
            vendas:             'Vendas',
            turnes:             'Central de Turnê',
            borderos:           'Borderôs',
            financeiro:         'Financeiro',
            'gestao-financeira':'Gestão Financeira',
            prestacao:          'Prestação de Contas',
            veiculos:           'Gestão de Veículos',
            equipe:             'Equipe',
            alertas:            'Alertas',
            usuarios:           'Usuários',
            configuracoes:      'Configurações'
        };
        
        document.getElementById('pageTitle').textContent = titles[page] || (isArtista ? 'Portal do Artista' : 'Gibson Manager');
        
        // Esconder sidebar e top-bar para o Artista (Layout limpo)
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const topbar = document.querySelector('.top-bar');
        
        if (isArtista) {
            if (sidebar) sidebar.classList.add('hide');
            if (topbar) topbar.classList.add('hide');
            if (mainContent) {
                mainContent.style.marginLeft = '0';
                mainContent.style.padding = '0';
                mainContent.style.width = '100%';
            }
            document.body.classList.add('is-portal');
        } else {
            if (sidebar) sidebar.classList.remove('hide');
            if (topbar) topbar.classList.remove('hide');
            if (mainContent) {
                mainContent.style.marginLeft = '';
                mainContent.style.padding = '';
                mainContent.style.width = '';
            }
            document.body.classList.remove('is-portal');
        }

        // Loading rápido
        const pageContent = document.getElementById('pageContent');
        pageContent.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';

        // Renderizar página (sem timeout)
        try {
            switch(page) {
                case 'dashboard':
                    if (isArtista) {
                        await this.renderArtistaPortal();
                    } else {
                        await this.renderDashboard();
                    }
                    break;
                case 'artistas':
                    await this.renderArtistas();
                    break;
                case 'eventos':
                    await this.renderEventos();
                    break;
                case 'contratos':
                    await this.renderContratos();
                    break;
                case 'vendas':
                    await this.renderVendas();
                    break;
                case 'propostas':
                    if (typeof this.renderPropostas === 'function') await this.renderPropostas();
                    break;
                case 'turnes':
                    if (typeof this.renderTurnes === 'function') await this.renderTurnes();
                    break;
                case 'relatorios':
                    if (typeof this.renderRelatoriosConsolidados === 'function') await this.renderRelatoriosConsolidados();
                    break;
                case 'borderos':
                    if (typeof this.renderBorderos === 'function') await this.renderBorderos();
                    break;
                case 'financeiro':
                    await this.renderFinanceiro();
                    break;
                case 'prestacao':
                    if (typeof this.renderPrestacao === 'function') await this.renderPrestacao();
                    break;
                case 'veiculos':
                    if (typeof this.renderVeiculos === 'function') await this.renderVeiculos();
                    break;
                case 'comissao':
                    await this.renderComissaoVendedor();
                    break;
                case 'gestao-financeira':
                    await this.renderGestaoFinanceira();
                    break;
                case 'equipe':
                    await this.renderEquipe();
                    break;
                case 'cobrancas':
                    if (typeof this.renderCobrancas === 'function') await this.renderCobrancas();
                    break;
                case 'alertas':
                    await this.renderAlertas();
                    break;
                case 'usuarios':
                    await this.renderUsuarios();
                    break;
                case 'configuracoes':
                    await this.renderConfiguracoes();
                    break;
            }
        } catch (error) {
            console.error('Erro ao carregar página:', error);
            pageContent.innerHTML = '<div class="error-message">Erro ao carregar página. Tente novamente.</div>';
        }

        this.isChanging = false;

        // Garantir que o seletor de artista sempre reflita o estado atual
        if (window.MultiArtista) MultiArtista.renderSelector();

        // Limpar busca ao trocar de página
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) searchInput.value = '';
        this.currentSearchTerm = '';
    },

    // Manipular busca global
    handleSearch(term) {
        this.currentSearchTerm = term.toLowerCase();
        
        switch(this.currentPage) {
            case 'artistas':
                this.renderArtistas(true);
                break;
            case 'eventos':
                this.renderEventos(true);
                break;
            case 'financeiro':
                this.renderFinanceiro(true);
                break;
            case 'contratos':
                this.renderContratos(true);
                break;
            case 'usuarios':
                this.renderUsuarios(true);
                break;
            case 'equipe':
                this.renderEquipe(true);
                break;
        }
    },

    // DASHBOARD - Ultra otimizado
    async renderDashboard() {
        if (Auth.isProdutor()) {
            if (typeof this.renderProdutorDashboard === 'function') {
                return this.renderProdutorDashboard();
            }
        }

        // Se "Todos os Artistas" selecionado → Dashboard Consolidado
        const selectedArtistaId = Auth.getSelectedArtistaId();
        if (selectedArtistaId === 'todos') {
            if (typeof Pages.renderEscritorioDashboard === 'function') {
                return Pages.renderEscritorioDashboard();
            }
        }

        const hoje = new Date();
        const mes = hoje.getMonth();
        const ano = hoje.getFullYear();

        // Mostrar skeleton primeiro
        document.getElementById('pageContent').innerHTML = this.getDashboardSkeleton();

        // Determinar artista de contexto (Manager fixo no vínculo; Admin usa seleção)
        const isManager = Auth.isManager();
        const artistaVinculadoId = isManager
            ? Auth.getArtistaVinculado()
            : (selectedArtistaId !== 'todos' ? selectedArtistaId : null);
        let artistaVinculado = null;
        if (artistaVinculadoId) {
            artistaVinculado = await ArtistasDB.buscarPorId(artistaVinculadoId);
        }

        // Carregar dados em paralelo (somente necessários) — UMA única chamada de despesas
        const [todosEventos, parcelas, todasDespesas] = await Promise.all([
            EventosDB.listar(),
            ParcelasDB.listar(),
            DespesasDB.listar()
        ]);

        // Filtrar por artista selecionado
        const eventos = artistaVinculadoId
            ? todosEventos.filter(e => e.artista_id === artistaVinculadoId)
            : todosEventos;

        // Filtrar eventos do mês
        const eventosDoMes = eventos.filter(e => {
            const d = new Date(e.data + 'T12:00:00');
            return d.getMonth() === mes && d.getFullYear() === ano;
        });

        // Calcular totais do mês — apenas eventos com contrato assinado
        const _STATUS_OK = ['Confirmado', 'Realizado', 'Concluído', 'Encerrado', 'Finalizado'];
        const eventosDoMesIds = new Set(eventosDoMes.map(e => e.id));
        let receita = 0;
        let despesas = 0;
        for (const e of eventosDoMes) {
            if (_STATUS_OK.includes(e.status)) receita += e.valor_liquido || 0;
        }
        for (const d of todasDespesas) {
            if (eventosDoMesIds.has(d.evento_id)) despesas += d.valor || 0;
        }

        const lucro = receita - despesas;
        const margem = receita > 0 ? ((lucro / receita) * 100).toFixed(1) : 0;

        // Parcelas atrasadas — filtrar pelo mesmo conjunto de eventos
        const eventosIds = artistaVinculadoId ? new Set(eventos.map(e => e.id)) : null;
        const parcelasAtrasadas = parcelas.filter(p => {
            if (p.status === 'Pago') return false;
            if (new Date(p.data_vencimento) >= hoje) return false;
            if (eventosIds && !eventosIds.has(p.evento_id)) return false;
            return true;
        });

        // Próximos eventos (máximo 5) — sem queries extras, artistas resolvidos em paralelo
        const proximos5 = eventos
            .filter(e => new Date(e.data) >= hoje)
            .sort((a, b) => new Date(a.data) - new Date(b.data))
            .slice(0, 5);
        const proximosEventos = await Promise.all(
            proximos5.map(async e => {
                // Se filtrando por artista, já temos; senão buscar
                const artista = artistaVinculado || await ArtistasDB.buscarPorId(e.artista_id);
                return { ...e, _artistaNome: artista?.nome || '' };
            })
        );

        // Banner do artista selecionado (Manager ou Admin com artista específico)
        const bannerArtista = artistaVinculado ? `
            <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(139, 92, 246, 0.05));
                        border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px;
                        padding: 14px 20px; margin-bottom: 20px;
                        display: flex; align-items: center; gap: 14px;">
                <img src="${artistaVinculado.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(artistaVinculado.nome)}&background=8B5CF6&color=fff`}"
                     style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid var(--brand-primary);">
                <div>
                    <div style="font-weight: 700; font-size: 15px;">${artistaVinculado.nome}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">
                        <i class="fas fa-user-tie"></i> Você está visualizando dados deste artista
                    </div>
                </div>
                <span class="badge badge-success" style="margin-left: auto;">${artistaVinculado.status}</span>
            </div>
        ` : '';

        // Título contextual
        const tituloDash = isManager && artistaVinculado
            ? `Dashboard — ${artistaVinculado.nome}`
            : 'Dashboard Executivo';

        // Renderizar HTML final
        const html = `
            <div class="dashboard-container fade-in">
                <div class="page-header mb-3">
                    <h2>${tituloDash}</h2>
                    <p class="text-muted">${Utils.getMonthName(mes)} ${ano}</p>
                </div>

                ${bannerArtista}

                <div class="grid grid-4 mb-3">
                    <div class="stat-card">
                        <div class="stat-icon brand">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${eventosDoMes.length}</h3>
                            <p>Shows do Mês</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon green">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${Utils.formatCurrency(receita)}</h3>
                            <p>Receita Total</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon yellow">
                            <i class="fas fa-money-bill-wave"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${Utils.formatCurrency(despesas)}</h3>
                            <p>Total de Despesas</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon ${lucro >= 0 ? 'green' : 'brand'}">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="stat-content">
                            <h3 class="${lucro >= 0 ? 'text-success' : 'text-danger'}">
                                ${Utils.formatCurrency(lucro)}
                            </h3>
                            <p>Lucro Líquido (${margem}%)</p>
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
                        <div class="card-body">
                            ${proximosEventos.length > 0 ? 
                                proximosEventos.map(e => `
                                    <div style="padding: 12px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <strong>${e.local}</strong>
                                            <p style="margin: 4px 0 0; font-size: 13px; color: var(--text-secondary);">
                                                ${e._artistaNome ? `<i class="fas fa-microphone" style="color:var(--brand-primary);font-size:10px;"></i> ${e._artistaNome} · ` : ''}${Utils.formatDate(e.data)} — ${e.cidade}/${e.estado}
                                            </p>
                                        </div>
                                        <span class="badge badge-${e.status === 'Confirmado' ? 'success' : 'warning'}">
                                            ${e.status}
                                        </span>
                                    </div>
                                `).join('') 
                                : '<p class="text-muted">Nenhum evento próximo</p>'
                            }
                        </div>
                    </div>
                </div>

                ${parcelasAtrasadas.length > 0 ? `
                    <div class="card mt-3" style="border-left: 4px solid var(--danger);">
                        <div class="card-header">
                            <h3 class="card-title">
                                <i class="fas fa-exclamation-triangle text-danger"></i>
                                Alertas Financeiros
                            </h3>
                        </div>
                        <div class="card-body">
                            <p class="text-danger"><strong>${parcelasAtrasadas.length} parcela(s) atrasada(s)</strong></p>
                            <button class="btn-primary btn-sm mt-2" onclick="Pages.changePage('financeiro')">
                                Ver Parcelas
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        document.getElementById('pageContent').innerHTML = html;
        
        // Renderizar gráfico após DOM estar pronto — passa dados já carregados para evitar re-fetch
        setTimeout(() => this.renderRevenueChart(mes, ano, artistaVinculadoId, todosEventos, todasDespesas), 50);
    },

    getDashboardSkeleton() {
        return `
            <div class="dashboard-container">
                <div class="page-header mb-3">
                    <div class="skeleton" style="height: 32px; width: 200px;"></div>
                    <div class="skeleton" style="height: 20px; width: 120px; margin-top: 8px;"></div>
                </div>
                <div class="grid grid-4 mb-3">
                    ${[1,2,3,4].map(() => `
                        <div class="card">
                            <div class="skeleton" style="height: 80px;"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    async renderRevenueChart(mes, ano, artistaId = null, eventosAll = null, todasDespesasAll = null) {
        const canvas = document.getElementById('revenueChart');
        if (!canvas) return;

        // Destruir instância anterior para evitar memory leak
        if (this._chartInstance) {
            this._chartInstance.destroy();
            this._chartInstance = null;
        }

        const ctx = canvas.getContext('2d');
        const meses = [];
        const receitas = [];
        const despesas = [];

        // Usar dados já carregados se disponíveis — evita re-fetch desnecessário
        if (!eventosAll) eventosAll = await EventosDB.listar();
        if (!todasDespesasAll) todasDespesasAll = await DespesasDB.listar();
        
        for (let i = 5; i >= 0; i--) {
            const m = mes - i;
            const a = m < 0 ? ano - 1 : ano;
            const mesAtual = m < 0 ? 12 + m : m;
            
            meses.push(Utils.getMonthName(mesAtual).substring(0, 3));
            
            // Filtrar eventos do mês (e por artista se Manager) — tudo em memória
            const eventosMes = eventosAll.filter(e => {
                const d = new Date(e.data + 'T12:00:00');
                const mesOk = d.getMonth() === mesAtual && d.getFullYear() === a;
                if (!mesOk) return false;
                if (artistaId) return e.artista_id === artistaId;
                return true;
            });

            let receitaMes = 0;
            let despesasMes = 0;

            const _stOk = ['Confirmado','Realizado','Concluído','Encerrado','Finalizado'];
            const eventosMesIds = new Set(eventosMes.map(e => e.id));
            for (const e of eventosMes) {
                if (_stOk.includes(e.status)) receitaMes += e.valor_liquido || 0;
            }
            for (const d of todasDespesasAll) {
                if (eventosMesIds.has(d.evento_id)) despesasMes += d.valor || 0;
            }

            receitas.push(receitaMes);
            despesas.push(despesasMes);
        }

        this._chartInstance = new Chart(ctx, {
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

    // ARTISTAS - Otimizado
    async renderArtistas(isSearch = false) {
        let artistas = await ArtistasDB.listar();
        artistas = await Auth.filterByPermissions(artistas, 'artistas');

        // Filtrar por termo de busca
        if (this.currentSearchTerm) {
            artistas = artistas.filter(a => 
                a.nome.toLowerCase().includes(this.currentSearchTerm)
            );
        }

        const html = `
            <div class="artistas-container fade-in">
                <div class="page-header flex-between mb-3">
                    <div>
                        <h2>Artistas</h2>
                        <p class="text-muted">${artistas.length} artista(s) cadastrado(s)</p>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button class="btn-secondary" onclick="Utils.exportToExcel(artistas, 'lista_artistas')">
                            <i class="fas fa-file-excel"></i> Exportar
                        </button>
                        ${Auth.isAdmin() ? `
                            <button class="btn-primary" onclick="Modals.showArtistaModal()">
                                <i class="fas fa-plus"></i> Novo Artista
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div class="search-info mb-3 ${this.currentSearchTerm ? '' : 'hide'}" style="margin-bottom: 20px;">
                    <p class="text-muted">Resultados para: <strong>"${this.currentSearchTerm}"</strong></p>
                </div>

                ${artistas.length > 0 ? `
                    <div class="grid grid-3">
                        ${artistas.map(artista => `
                            <div class="card artista-card hover-lift" onclick="Pages.renderArtistaProfile('${artista.id}')">
                                <div style="text-align: center;">
                                    <img src="${artista.foto}" alt="${artista.nome}" 
                                         style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid var(--brand-primary); margin-bottom: 16px;" 
                                         loading="lazy">
                                    <h3 style="font-size: 20px; margin-bottom: 8px;">${artista.nome}</h3>
                                    <span class="badge badge-${artista.status === 'Ativo' ? 'success' : 'warning'}">
                                        ${artista.status}
                                    </span>
                                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
                                        <p style="color: var(--text-secondary); font-size: 14px; margin: 0;">
                                            Comissão: <strong style="color: var(--brand-primary);">${Utils.formatCurrency(artista.comissao_padrao || 0)}</strong>
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

    // Perfil do artista (continua igual, mas carrega on-demand)
    async renderArtistaProfile(artistaId) {
        // Mostrar loading
        document.getElementById('pageContent').innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';

        const [artista, eventos, equipe, contratos, todosUsuarios] = await Promise.all([
            ArtistasDB.buscarPorId(artistaId),
            EventosDB.buscarPorArtista(artistaId),
            EquipeDB.buscarPorArtista(artistaId),
            ContratosDB.listar().then(c => c.filter(ct => ct.artista_id === artistaId)),
            UsuariosDB.listar()
        ]);
        const usuarioArtista = todosUsuarios.find(u => u.nivel === 'Artista' && u.artista_vinculado === artistaId) || null;
        const appLink = window.location.origin + '/artista.html?id=' + artistaId;

        if (!artista) {
            Utils.showToast('Artista não encontrado', 'error');
            this.renderArtistas();
            return;
        }

        let receitaTotal = 0;
        let despesasTotal = 0;
        
        // PARALELO: busca todas as despesas de todos os eventos de uma vez
        const [todasDespesasArtista] = await Promise.all([
            DespesasDB.listar()
        ]);
        const _stConfirmados = ['Confirmado','Realizado','Concluído','Encerrado','Finalizado'];
        const eventosIds = new Set(eventos.map(e => e.id));
        for (const evento of eventos) {
            if (_stConfirmados.includes(evento.status)) receitaTotal += evento.valor_liquido || 0;
        }
        for (const d of todasDespesasArtista) {
            if (eventosIds.has(d.evento_id)) despesasTotal += d.valor || 0;
        }
        const lucroTotal = receitaTotal - despesasTotal;

        const html = `
            <div class="artista-profile fade-in">
                <div class="card mb-3">
                    <div style="display: flex; align-items: center; gap: 24px; flex-wrap: wrap;">
                        <img src="${artista.foto}" alt="${artista.nome}" 
                             style="width: 120px; height: 120px; border-radius: 50%; border: 3px solid var(--brand-primary);">
                        <div style="flex: 1; min-width: 200px;">
                            <h2 style="margin-bottom: 8px;">${artista.nome}</h2>
                            <span class="badge badge-${artista.status === 'Ativo' ? 'success' : 'warning'}">
                                ${artista.status}
                            </span>
                            <p style="color: var(--text-secondary); margin-top: 12px; margin-bottom: 12px;">
                                Comissão: <strong style="color: var(--brand-primary);">${Utils.formatCurrency(artista.comissao_padrao || 0)}</strong> | 
                                Cadastrado em: ${Utils.formatDate(artista.data_cadastro)}
                            </p>
                            <div style="display: flex; gap: 8px;">
                                ${artista.midia_kit_url ? `
                                    <a href="${artista.midia_kit_url}" target="_blank" class="btn-secondary btn-sm" style="background: rgba(139, 92, 246, 0.1); border-color: transparent;">
                                        <i class="fas fa-file-pdf" style="color: var(--brand-primary);"></i> Mídia Kit
                                    </a>
                                ` : ''}
                                ${artista.rider_tecnico_url ? `
                                    <a href="${artista.rider_tecnico_url}" target="_blank" class="btn-secondary btn-sm" style="background: rgba(139, 92, 246, 0.1); border-color: transparent;">
                                        <i class="fas fa-file-pdf" style="color: var(--brand-primary);"></i> Rider Técnico
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                        ${Auth.canEdit('artistas', artistaId) ? `
                            <div>
                                <button class="btn-primary" onclick="Modals.showArtistaModal('${artistaId}')">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn-secondary mt-2" onclick="Pages.renderArtistas()">
                                    <i class="fas fa-arrow-left"></i> Voltar
                                </button>
                            </div>
                        ` : `
                            <button class="btn-secondary" onclick="Pages.renderArtistas()">
                                <i class="fas fa-arrow-left"></i> Voltar
                            </button>
                        `}
                    </div>
                </div>

                <!-- Acesso do Artista (PWA) -->
                <div class="card mb-3" style="border-left: 4px solid var(--brand-primary); background: linear-gradient(90deg, rgba(139,92,246,0.06) 0%, transparent 100%);">
                    <div style="display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:20px;">
                        <div style="display:flex; align-items:flex-start; gap:16px;">
                            <div style="background:white; padding:6px; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.1); flex-shrink:0;">
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(appLink)}" 
                                     alt="QR Code" style="width:84px; height:84px; display:block; border-radius:4px;">
                            </div>
                            <div>
                                <h3 style="margin:0 0 6px; font-size:16px;">
                                    <i class="fas fa-mobile-alt" style="color:var(--brand-primary);"></i> App do Artista
                                </h3>

                                ${usuarioArtista ? `
                                    <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); color:#10B981; border-radius:20px; padding:3px 10px; font-size:12px; font-weight:600; margin-bottom:8px;">
                                        <i class="fas fa-check-circle"></i> Acesso ativado · @${usuarioArtista.username}
                                    </div>
                                    <p style="margin:0; font-size:12px; color:var(--text-secondary);">Envie o link para o artista acessar e instalar o app.</p>
                                ` : `
                                    <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); color:#EF4444; border-radius:20px; padding:3px 10px; font-size:12px; font-weight:600; margin-bottom:8px;">
                                        <i class="fas fa-exclamation-circle"></i> Acesso não ativado
                                    </div>
                                    <p style="margin:0 0 10px; font-size:12px; color:var(--text-secondary);">Clique em <strong>Ativar Acesso</strong> para liberar o app para este artista.</p>
                                    <button class="btn-primary btn-sm" onclick="ativarAcessoArtista('${artista.id}', '${artista.nome}')">
                                        <i class="fas fa-user-plus"></i> Ativar Acesso do App
                                    </button>
                                `}
                            </div>
                        </div>
                        <div style="display:flex; gap:8px; flex-wrap:wrap; align-self:flex-end;">
                            <button class="btn-secondary btn-sm" onclick="Utils.copyToClipboard('${appLink}')">
                                <i class="fas fa-copy"></i> Copiar Link
                            </button>
                            <button class="btn-primary btn-sm" style="background:#25D366; border-color:#25D366;"
                                    onclick="window.open('https://wa.me/?text=${encodeURIComponent(`Olá ${artista.nome.split(' ')[0]}! Acesse sua agenda de shows pelo app da Gibson. Link: ${appLink}`)}')">
                                <i class="fab fa-whatsapp"></i> Enviar Link
                            </button>
                        </div>
                    </div>
                </div>

                <div class="grid grid-4 mb-3">
                    <div class="stat-card">
                        <div class="stat-icon brand"><i class="fas fa-calendar"></i></div>
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
                        <div class="stat-icon ${lucroTotal >= 0 ? 'green' : 'brand'}"><i class="fas fa-chart-line"></i></div>
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
                                        <td>
                                            ${Utils.formatPhone(m.telefone)}
                                            <a href="${Utils.generateWhatsAppLink(m.telefone, `Olá ${m.nome}, tudo bem?`)}" 
                                               target="_blank" class="text-success ml-2" title="Enviar WhatsApp">
                                                <i class="fab fa-whatsapp"></i>
                                            </a>
                                        </td>
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

    // CONTRATOS - Otimizado
    async renderContratos() {
        // Mostrar loading
        document.getElementById('pageContent').innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';

        let contratos = await ContratosDB.listar();

        // Filtrar por busca
        if (this.currentSearchTerm) {
            contratos = contratos.filter(c => 
                c.status.toLowerCase().includes(this.currentSearchTerm)
            );
        }
        
        // Buscar eventos e artistas em paralelo
        const contratosComDados = await Promise.all(
            contratos.map(async (contrato) => {
                const evento = await EventosDB.buscarPorId(contrato.evento_id);
                const artista = evento ? await ArtistasDB.buscarPorId(evento.artista_id) : null;
                return {
                    ...contrato,
                    evento,
                    artista
                };
            })
        );

        const html = `
            <div class="contratos-container fade-in">
                <div class="page-header flex-between mb-3">
                    <div>
                        <h2>Contratos</h2>
                        <p class="text-muted">${contratos.length} contrato(s) gerado(s)</p>
                    </div>
                    <button class="btn-secondary" onclick="Utils.exportToExcel(contratos, 'lista_contratos')">
                        <i class="fas fa-file-excel"></i> Exportar
                    </button>
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
                                            <td><strong>${c.artista ? c.artista.nome : '-'}</strong></td>
                                            <td>${c.evento ? c.evento.local : '-'}</td>
                                            <td>${c.evento ? Utils.formatDate(c.evento.data) : '-'}</td>
                                            <td>${Utils.formatDate(c.data_geracao)}</td>
                                            <td>
                                                <span class="badge badge-${c.status === 'Assinado' ? 'success' : c.status === 'Pendente' ? 'warning' : 'danger'}">
                                                    ${c.status}
                                                </span>
                                            </td>
                                            <td>
                                                <button class="btn-secondary btn-sm" disabled title="Visualização do contrato em breve" style="opacity:0.45;cursor:not-allowed;">
                                                    <i class="fas fa-lock"></i> Ver
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
    },

    async assinarContrato(contratoId) {
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
    },

    // EVENTOS - Otimizado
    async renderEventos() {
        // Mostrar loading
        document.getElementById('pageContent').innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';

        let eventos = await EventosDB.listar();
        eventos = await Auth.filterByPermissions(eventos, 'eventos');

        const html = `
            <div class="eventos-container fade-in">
                <div class="page-header flex-between mb-3">
                    <div>
                        <h2>Eventos</h2>
                        <p class="text-muted">${eventos.length} evento(s) cadastrado(s)</p>
                    </div>
                    ${Auth.canEdit('eventos') ? `
                        <button class="btn-primary" onclick="Modals.showEventoMultiStepModal()">
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
                                        <th>Status</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
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
                            <button class="btn-primary mt-2" onclick="Modals.showEventoMultiStepModal()">
                                <i class="fas fa-plus"></i> Cadastrar Primeiro Evento
                            </button>
                        ` : ''}
                    </div>
                `}
            </div>
        `;

        document.getElementById('pageContent').innerHTML = html;
    },

    async renderEventosTableRows(eventos) {
        const rows = await Promise.all(
            eventos.map(async (evento) => {
                const artista = await ArtistasDB.buscarPorId(evento.artista_id);
                
                return `
                    <tr style="border-left: 4px solid ${Auth.getArtistaColor(evento.artista_id)};">
                        <td>${Utils.formatDate(evento.data)}</td>
                        <td style="display: flex; align-items: center; gap: 8px;">
                            <img src="${artista?.foto || ''}" style="width: 24px; height: 24px; border-radius: 4px; object-fit: cover;">
                            <strong>${artista ? artista.nome : 'N/A'}</strong>
                        </td>
                        <td>${evento.local}</td>
                        <td>${evento.cidade}/${evento.estado}</td>
                        <td>${Utils.formatCurrency(evento.cache_bruto)}</td>
                        <td>${Utils.formatCurrency(evento.valor_liquido)}</td>
                        <td>
                            <span class="badge badge-${evento.status === 'Confirmado' ? 'success' : 'warning'}">
                                ${evento.status}
                            </span>
                        </td>
                        <td>
                            <button class="btn-secondary btn-sm" onclick="Modals.showEventoMultiStepModal('${evento.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${Auth.canEdit('eventos') ? `
                                <button class="btn-danger btn-sm" onclick="Pages.deleteEvento('${evento.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </td>
                    </tr>
                `;
            })
        );

        return rows.join('');
    },

    async deleteEvento(eventoId) {
        if (!confirm('Tem certeza que deseja deletar este evento? Esta ação não pode ser desfeita.')) {
            return;
        }

        Utils.showLoading();
        const result = await EventosDB.deletar(eventoId);
        Utils.hideLoading();

        if (result) {
            Utils.showToast('Evento deletado com sucesso!', 'success');
            this.renderEventos();
        } else {
            Utils.showToast('Erro ao deletar evento', 'error');
        }
    },

    // EQUIPE - Otimizado
    async renderEquipe() {
        document.getElementById('pageContent').innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';

        const equipe = await EquipeDB.listar();
        
        // Agrupar por artista
        const equipeMap = {};
        for (const membro of equipe) {
            if (!equipeMap[membro.artista_id]) {
                equipeMap[membro.artista_id] = [];
            }
            equipeMap[membro.artista_id].push(membro);
        }

        const artistas = await ArtistasDB.listar();

        const html = `
            <div class="equipe-container fade-in">
                <div class="page-header mb-3">
                    <h2>Equipe</h2>
                    <p class="text-muted">${equipe.length} membro(s) cadastrado(s)</p>
                </div>

                <div class="grid grid-4 mb-3">
                    <div class="stat-card">
                        <div class="stat-icon blue">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${equipe.length}</h3>
                            <p>Total de Membros</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon green">
                            <i class="fas fa-user-check"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${equipe.filter(e => e.tipo_vinculo === 'Fixo').length}</h3>
                            <p>Fixos</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon yellow">
                            <i class="fas fa-user-clock"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${equipe.filter(e => e.tipo_vinculo === 'Por Show').length}</h3>
                            <p>Por Show</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon red">
                            <i class="fas fa-microphone"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${Object.keys(equipeMap).length}</h3>
                            <p>Artistas com Equipe</p>
                        </div>
                    </div>
                </div>

                ${artistas.length > 0 ? `
                    ${artistas.map(artista => {
                        const membros = equipeMap[artista.id] || [];
                        return `
                            <div class="card mb-3">
                                <div class="card-header">
                                    <h3 class="card-title">
                                        <i class="fas fa-microphone"></i> ${artista.nome}
                                    </h3>
                                    ${Auth.canEdit('equipe', artista.id) ? `
                                        <button class="btn-primary btn-sm" onclick="Modals.showEquipeModal(null, '${artista.id}')">
                                            <i class="fas fa-plus"></i> Adicionar Membro
                                        </button>
                                    ` : ''}
                                </div>
                                <div class="card-body">
                                    ${membros.length > 0 ? `
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
                                                    ${membros.map(m => `
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
                                                                ${Auth.canEdit('equipe', artista.id) ? `
                                                                    <button class="btn-secondary btn-sm" onclick="Modals.showEquipeModal('${m.id}')">
                                                                        <i class="fas fa-edit"></i>
                                                                    </button>
                                                                    <button class="btn-secondary btn-sm" onclick="Pages.deletarMembroEquipe('${m.id}', '${artista.id}')" style="color:var(--danger);">
                                                                        <i class="fas fa-trash"></i>
                                                                    </button>
                                                                ` : ''}
                                                            </td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    ` : `
                                        <p class="text-muted">Nenhum membro de equipe cadastrado para este artista.</p>
                                    `}
                                </div>
                            </div>
                        `;
                    }).join('')}
                ` : `
                    <div class="card text-center" style="padding: 60px;">
                        <i class="fas fa-users" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
                        <h3 style="color: var(--text-secondary);">Nenhum artista cadastrado</h3>
                        <p class="text-muted">Cadastre artistas primeiro para adicionar membros de equipe.</p>
                    </div>
                `}
            </div>
        `;

        document.getElementById('pageContent').innerHTML = html;
    },

    // ALERTAS - Otimizado
    async renderAlertas() {
        document.getElementById('pageContent').innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';

        const [parcelas, eventos, contratos, despesas] = await Promise.all([
            ParcelasDB.listar(),
            EventosDB.listar(),
            ContratosDB.listar(),
            DespesasDB.listar()
        ]);

        const hoje = new Date();
        const em7Dias = new Date();
        em7Dias.setDate(hoje.getDate() + 7);

        const parcelasAtrasadas = parcelas.filter(p => {
            if (p.status === 'Pago') return false;
            return new Date(p.data_vencimento) < hoje;
        });

        const eventosProximos = eventos.filter(e => {
            const dataEvento = new Date(e.data);
            return dataEvento >= hoje && dataEvento <= em7Dias;
        });

        const contratosPendentes = contratos.filter(c => c.status === 'Pendente');
        const despesasPendentes = despesas.filter(d => d.status === 'Pendente');

        const totalAlertas = parcelasAtrasadas.length + eventosProximos.length + 
                            contratosPendentes.length + despesasPendentes.length;

        const html = `
            <div class="alertas-container fade-in">
                <div class="page-header mb-3">
                    <h2>Alertas e Notificações</h2>
                    <p class="text-muted">${totalAlertas} alerta(s) ativo(s)</p>
                </div>

                <div class="grid grid-4 mb-3">
                    <div class="stat-card">
                        <div class="stat-icon red">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${parcelasAtrasadas.length}</h3>
                            <p>Parcelas Atrasadas</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon yellow">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${eventosProximos.length}</h3>
                            <p>Eventos Próximos</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon blue">
                            <i class="fas fa-file-signature"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${contratosPendentes.length}</h3>
                            <p>Contratos Pendentes</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon yellow">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${despesasPendentes.length}</h3>
                            <p>Despesas Pendentes</p>
                        </div>
                    </div>
                </div>

                ${totalAlertas > 0 ? `
                    ${parcelasAtrasadas.length > 0 ? `
                        <div class="card mb-3" style="border-left: 4px solid var(--danger);">
                            <div class="card-header">
                                <h3 class="card-title text-danger">
                                    <i class="fas fa-exclamation-triangle"></i> Parcelas Atrasadas
                                </h3>
                            </div>
                            <div class="card-body">
                                <p class="text-muted mb-3">Estas parcelas já passaram do vencimento e precisam ser pagas.</p>
                                <button class="btn-primary" onclick="Pages.changePage('financeiro')">
                                    <i class="fas fa-arrow-right"></i> Ir para Financeiro
                                </button>
                            </div>
                        </div>
                    ` : ''}

                    ${eventosProximos.length > 0 ? `
                        <div class="card mb-3" style="border-left: 4px solid var(--warning);">
                            <div class="card-header">
                                <h3 class="card-title text-warning">
                                    <i class="fas fa-calendar-alt"></i> Eventos nos Próximos 7 Dias
                                </h3>
                            </div>
                            <div class="card-body">
                                <p class="text-muted mb-3">Prepare-se! Estes eventos acontecerão em breve.</p>
                                <button class="btn-primary" onclick="Pages.changePage('eventos')">
                                    <i class="fas fa-arrow-right"></i> Ver Eventos
                                </button>
                            </div>
                        </div>
                    ` : ''}

                    ${contratosPendentes.length > 0 ? `
                        <div class="card mb-3" style="border-left: 4px solid var(--info);">
                            <div class="card-header">
                                <h3 class="card-title text-info">
                                    <i class="fas fa-file-signature"></i> Contratos Aguardando Assinatura
                                </h3>
                            </div>
                            <div class="card-body">
                                <p class="text-muted mb-3">${contratosPendentes.length} contrato(s) precisam ser assinados.</p>
                                <button class="btn-primary" onclick="Pages.changePage('contratos')">
                                    <i class="fas fa-arrow-right"></i> Ver Contratos
                                </button>
                            </div>
                        </div>
                    ` : ''}

                    ${despesasPendentes.length > 0 ? `
                        <div class="card mb-3" style="border-left: 4px solid var(--warning);">
                            <div class="card-header">
                                <h3 class="card-title text-warning">
                                    <i class="fas fa-dollar-sign"></i> Despesas Pendentes
                                </h3>
                            </div>
                            <div class="card-body">
                                <p class="text-muted mb-3">${despesasPendentes.length} despesa(s) ainda não foram pagas.</p>
                                <button class="btn-primary" onclick="Pages.changePage('eventos')">
                                    <i class="fas fa-arrow-right"></i> Ver Eventos e Despesas
                                </button>
                            </div>
                        </div>
                    ` : ''}
                ` : `
                    <div class="card text-center" style="padding: 60px;">
                        <i class="fas fa-check-circle" style="font-size: 48px; color: var(--success); margin-bottom: 16px;"></i>
                        <h3 style="color: var(--success);">Tudo em Dia!</h3>
                        <p class="text-muted">Não há alertas ou notificações pendentes no momento.</p>
                    </div>
                `}
            </div>
        `;

        document.getElementById('pageContent').innerHTML = html;
    },

    // USUÁRIOS - Otimizado
    async renderUsuarios() {
        if (!Auth.isAdmin()) {
            document.getElementById('pageContent').innerHTML = `
                <div class="card text-center" style="padding: 60px;">
                    <i class="fas fa-lock" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--text-secondary);">Acesso Restrito</h3>
                    <p class="text-muted">Apenas administradores podem acessar esta página.</p>
                </div>
            `;
            return;
        }

        // renderUsuarios é definido e sobrescrito por pages-usuarios.js
    },

    // CONFIGURAÇÕES - Otimizado
    async renderConfiguracoes() {
        // Implementação básica - pode ser expandida
        document.getElementById('pageContent').innerHTML = `
            <div class="config-container fade-in">
                <div class="page-header mb-3">
                    <h2>Configurações</h2>
                    <p class="text-muted">Configure o sistema conforme suas necessidades</p>
                </div>

                <div class="card">
                    <div class="card-body">
                        <h3>Configurações do Sistema</h3>
                        <p class="text-muted">Esta funcionalidade será implementada em breve.</p>
                    </div>
                </div>
            </div>
        `;
    },

    // FINANCEIRO - Usa implementação original
    async renderFinanceiro() {
        // A implementação completa está em pages-financeiro.js
        // Esta função será chamada de lá
    }
};
