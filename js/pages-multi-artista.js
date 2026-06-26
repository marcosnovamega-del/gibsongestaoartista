/* ========================================
   GIBSON MANAGER PRO - MULTI-ARTISTA UI
   Interface para troca de contexto e consolidado
   ======================================== */

const MultiArtista = {
    // Renderiza o seletor de artista no cabeçalho ou sidebar
    renderSelector() {
        const container = document.getElementById('artistaSelectorContainer');
        if (!container) return;

        const artistas = Auth.artistasPermitidos || [];
        const selectedId = Auth.getSelectedArtistaId();
        const selectedArtista = Auth.getSelectedArtista();

        if (artistas.length <= 1 && !Auth.isAdmin()) {
            container.style.display = 'none';
            return;
        }

        const isTodos = selectedId === 'todos';

        // Cabeçalho do seletor: ícone de grupo se "Todos", foto do artista se específico
        const thumbHTML = isTodos
            ? `<div class="artista-thumb todos-thumb"><i class="fas fa-layer-group"></i></div>`
            : `<img src="${selectedArtista?.foto || 'https://ui-avatars.com/api/?name=Artista&background=D4AF37&color=000'}" class="artista-thumb">`;
        const nomeAtual = isTodos ? 'Todos os Artistas' : (selectedArtista?.nome || 'Selecionar Artista');

        container.style.display = 'block';
        container.innerHTML = `
            <div class="artista-selector-wrapper">
                <div class="artista-selected" onclick="MultiArtista.toggleDropdown()">
                    ${thumbHTML}
                    <div class="artista-name-info">
                        <span class="selected-name">${nomeAtual}</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
                <div class="artista-dropdown" id="artistaDropdown">
                    <div class="dropdown-search">
                        <input type="text" placeholder="Filtrar artista..." oninput="MultiArtista.filterArtistas(this.value)">
                    </div>
                    <div class="artistas-list" id="artistasList">
                        <!-- Opção "Todos os Artistas" (Dashboard consolidado) -->
                        <div class="artista-option artista-option-todos ${isTodos ? 'active' : ''}" onclick="Auth.setSelectedArtista('todos')">
                            <div class="artista-thumb-sm todos-thumb-sm"><i class="fas fa-layer-group"></i></div>
                            <span>Todos os Artistas</span>
                            ${isTodos ? '<i class="fas fa-check"></i>' : ''}
                        </div>
                        <div class="dropdown-divider"></div>
                        ${artistas.map(a => {
                            const initials = a.nome.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
                            const colors = ['E10600','D4AF37','7C3AED','059669','DC2626','2563EB'];
                            const colorIdx = a.nome.charCodeAt(0) % colors.length;
                            const bgColor = colors[colorIdx];
                            const avatarUrl = a.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bgColor}&color=fff&size=56&bold=true`;
                            return `
                            <div class="artista-option ${a.id === selectedId ? 'active' : ''}" onclick="Auth.setSelectedArtista('${a.id}')">
                                <img src="${avatarUrl}" class="artista-thumb-sm" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bgColor}&color=fff&size=56&bold=true'">
                                <span>${a.nome}</span>
                                ${a.id === selectedId ? '<i class="fas fa-check" style="color:#D4AF37;font-size:11px;flex-shrink:0;"></i>' : ''}
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    toggleDropdown() {
        const dropdown = document.getElementById('artistaDropdown');
        dropdown.classList.toggle('show');
        
        // Fechar ao clicar fora
        const closeDropdown = (e) => {
            if (!e.target.closest('.artista-selector-wrapper')) {
                dropdown.classList.remove('show');
                document.removeEventListener('click', closeDropdown);
            }
        };
        document.addEventListener('click', closeDropdown);
    },

    filterArtistas(term) {
        const list = document.getElementById('artistasList');
        const options = list.querySelectorAll('.artista-option');
        const lowTerm = term.toLowerCase();

        options.forEach(opt => {
            const name = opt.querySelector('span').textContent.toLowerCase();
            opt.style.display = name.includes(lowTerm) ? 'flex' : 'none';
        });
    }
};

// CSS dinâmico para o seletor
const multiArtistaStyles = `
    .artista-selector-wrapper {
        position: relative;
        margin: 10px 15px;
        z-index: 1000;
    }
    .artista-selected {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(212, 175, 55, 0.2);
        border-radius: 12px;
        padding: 8px 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        transition: all 0.2s;
    }
    .artista-selected:hover {
        background: rgba(255,255,255,0.1);
        border-color: var(--gold-primary);
    }
    .artista-thumb {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        object-fit: cover;
        border: 1px solid var(--gold-primary);
    }
    .artista-name-info {
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .selected-name {
        font-size: 13px;
        font-weight: 700;
        color: #fff;
    }
    .artista-dropdown {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        width: 100%;
        background: #1c1c1c;
        border: 1px solid rgba(212,175,55,0.25);
        border-radius: 12px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.6);
        display: none;
        overflow: hidden;
        z-index: 2000;
    }
    .artista-dropdown.show {
        display: block;
        animation: fadeInDown 0.18s ease-out;
    }
    .dropdown-search {
        padding: 10px 10px 8px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .dropdown-search input {
        width: 100%;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(212,175,55,0.2);
        border-radius: 7px;
        padding: 7px 10px;
        color: #fff;
        font-size: 12px;
        box-sizing: border-box;
        outline: none;
    }
    .dropdown-search input::placeholder { color: rgba(255,255,255,0.35); }
    .dropdown-search input:focus { border-color: rgba(212,175,55,0.5); }
    .artistas-list {
        max-height: 240px;
        overflow-y: auto;
        padding: 4px 0;
    }
    .artistas-list::-webkit-scrollbar { width: 4px; }
    .artistas-list::-webkit-scrollbar-track { background: transparent; }
    .artistas-list::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.3); border-radius: 4px; }
    .artista-option {
        padding: 9px 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        transition: background 0.15s;
    }
    .artista-option span {
        color: #e8e8e8 !important;
        font-size: 13px;
        font-weight: 500;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .artista-option:hover {
        background: rgba(255,255,255,0.08);
    }
    .artista-option:hover span { color: #fff !important; }
    .artista-option.active {
        background: rgba(212, 175, 55, 0.12);
    }
    .artista-option.active span {
        color: #D4AF37 !important;
        font-weight: 700;
    }
    .artista-thumb-sm {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        object-fit: cover;
        flex-shrink: 0;
    }
    .artista-option-todos {
        background: rgba(212, 175, 55, 0.05);
        border-bottom: none;
    }
    .artista-option-todos:hover {
        background: rgba(212, 175, 55, 0.12);
    }
    .artista-option-todos.active {
        background: rgba(212, 175, 55, 0.15);
    }
    .todos-thumb {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: linear-gradient(135deg, #D4AF37, #b8942e);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #D4AF37;
        flex-shrink: 0;
    }
    .todos-thumb i { color: #000; font-size: 14px; margin-left: 0 !important; }
    .todos-thumb-sm {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        background: linear-gradient(135deg, #D4AF37, #b8942e);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .todos-thumb-sm i { color: #000; font-size: 11px; margin-left: 0 !important; }
    .dropdown-divider {
        height: 1px;
        background: rgba(255,255,255,0.07);
        margin: 4px 0;
    }
    .artista-option i {
        margin-left: auto;
        color: var(--gold-primary);
        font-size: 10px;
    }
    @keyframes fadeInDown {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = multiArtistaStyles;
document.head.appendChild(styleSheet);

// DASHBOARD CONSOLIDADO DO ESCRITÓRIO
Pages.renderEscritorioDashboard = async function() {
    document.getElementById('pageContent').innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';

    try {
        const [artistas, todosEventos, todasParcelas] = await Promise.all([
            ArtistasDB.listar(true),
            EventosDB.listar(true),
            ParcelasDB.listar(true)
        ]);

        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();

        // 1. Calcular Totais Consolidados
        let faturamentoTotal = 0;
        let showsMes = 0;
        
        const dadosArtistas = artistas.map(art => {
            const eventosArt = todosEventos.filter(e => e.artista_id === art.id);
            const parcelasArt = todasParcelas.filter(p => {
                const ev = todosEventos.find(e => e.id === p.evento_id);
                return ev && ev.artista_id === art.id;
            });

            const _stok = ['Confirmado','Realizado','Concluído','Encerrado','Finalizado'];
            const faturamentoArt = eventosArt.reduce((acc, e) => acc + (_stok.includes(e.status) ? (e.valor_liquido || 0) : 0), 0);
            const showsMesArt = eventosArt.filter(e => {
                const d = new Date(e.data);
                return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
            }).length;

            faturamentoTotal += faturamentoArt;
            showsMes += showsMesArt;

            return {
                ...art,
                faturamento: faturamentoArt,
                showsMes: showsMesArt,
                lucroEstimado: faturamentoArt * 0.3 // Exemplo de margem
            };
        }).sort((a, b) => b.faturamento - a.faturamento);

        // Próximos shows (todos os artistas)
        const proximosShows = todosEventos.filter(e => new Date(e.data) >= hoje).length;

        const html = `
            <div class="dashboard-container fade-in">
                <div class="page-header mb-4">
                    <h2 style="font-size: 28px; font-weight: 800; color: #fff;">
                        <i class="fas fa-building" style="color: var(--gold-primary);"></i> Dashboard do Escritório
                    </h2>
                    <p class="text-muted">Visão consolidada — ${Utils.getMonthName(mesAtual)} ${anoAtual}</p>
                </div>

                <div class="grid grid-4 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon red"><i class="fas fa-dollar-sign"></i></div>
                        <div class="stat-content">
                            <div class="stat-value">${Utils.formatCurrency(faturamentoTotal)}</div>
                            <div class="stat-label">Faturamento Geral</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon blue"><i class="fas fa-microphone"></i></div>
                        <div class="stat-content">
                            <div class="stat-value">${artistas.length}</div>
                            <div class="stat-label">Artistas Ativos</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon yellow"><i class="fas fa-calendar-check"></i></div>
                        <div class="stat-content">
                            <div class="stat-value">${showsMes}</div>
                            <div class="stat-label">Shows este Mês</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon green"><i class="fas fa-calendar-check"></i></div>
                        <div class="stat-content">
                            <div class="stat-value">${proximosShows}</div>
                            <div class="stat-label">Próximos Shows</div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-2 mb-4">
                    <div class="turne-section">
                        <div class="section-title"><i class="fas fa-trophy"></i> Ranking de Artistas</div>
                        <div class="ranking-list">
                            ${dadosArtistas.map((art, index) => `
                                <div style="display: flex; align-items: center; gap: 15px; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                    <div style="font-weight: 800; color: var(--gold-primary); font-size: 18px; width: 25px;">#${index + 1}</div>
                                    <img src="${art.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(art.nome)}" style="width: 40px; height: 40px; border-radius: 8px; border: 1px solid var(--gold-primary);">
                                    <div style="flex: 1;">
                                        <div style="font-weight: 700; color: #fff;">${art.nome}</div>
                                        <div style="font-size: 11px; color: var(--text-muted);">${art.showsMes} shows este mês</div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-weight: 700; color: var(--success);">${Utils.formatCurrency(art.faturamento)}</div>
                                        <div style="font-size: 10px; color: var(--text-muted);">Acumulado</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="turne-section">
                        <div class="section-title"><i class="fas fa-chart-pie"></i> Distribuição Operacional</div>
                        <div id="officeChartPlaceholder" style="height: 300px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.2); border-radius: 12px;">
                            <div style="text-align: center;">
                                <i class="fas fa-chart-bar" style="font-size: 48px; opacity: 0.1; margin-bottom: 15px;"></i>
                                <p style="color: var(--text-muted); font-size: 13px;">Gráficos estatísticos consolidados<br>em processamento...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = html;

    } catch (err) {
        console.error('Erro ao carregar Dashboard do Escritório:', err);
        document.getElementById('pageContent').innerHTML = '<div class="error-message">Erro ao carregar consolidado.</div>';
    }
};

// RELATÓRIOS CONSOLIDADOS POR PERÍODO
Pages.renderRelatoriosConsolidados = async function() {
    document.getElementById('pageContent').innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';

    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];

    const html = `
        <div class="relatorios-container fade-in">
            <div class="page-header mb-4">
                <h2 style="font-size: 28px; font-weight: 800; color: #fff;">
                    <i class="fas fa-chart-line" style="color: var(--gold-primary);"></i> Gestão Executiva e DRE
                </h2>
                <p class="text-muted">Acompanhamento de faturamento, comissões e saúde financeira do escritório</p>
            </div>

            <div class="card mb-4" style="background: var(--op-card); border: 1px solid var(--op-border);">
                <div style="display: flex; gap: 20px; align-items: flex-end; flex-wrap: wrap; padding: 20px;">
                    <div class="form-group" style="flex: 1; min-width: 150px;">
                        <label>Data Início</label>
                        <input type="date" id="rel_inicio" value="${primeiroDia}">
                    </div>
                    <div class="form-group" style="flex: 1; min-width: 150px;">
                        <label>Data Fim</label>
                        <input type="date" id="rel_fim" value="${ultimoDia}">
                    </div>
                    <div class="form-group" style="flex: 1; min-width: 200px;">
                        <label>Filtro de Visão</label>
                        <select id="rel_artista">
                            <option value="todos">Visão Geral (DRE Escritório)</option>
                            ${Auth.artistasPermitidos.map(a => `<option value="${a.id}">${a.nome}</option>`).join('')}
                        </select>
                    </div>
                    <button class="btn-primary" onclick="Pages._gerarRelatorioConsolidado()" style="height: 42px; padding: 0 30px;">
                        <i class="fas fa-sync"></i> Gerar Fechamento
                    </button>
                </div>
            </div>

            <div id="relatorioResult">
                <div class="card text-center" style="padding: 40px; opacity: 0.5;">
                    <i class="fas fa-search-dollar" style="font-size: 40px; margin-bottom: 15px;"></i>
                    <p>Selecione o período para visualizar o fluxo de caixa do escritório.</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
};

Pages._gerarRelatorioConsolidado = async function() {
    const inicio = document.getElementById('rel_inicio').value;
    const fim = document.getElementById('rel_fim').value;
    const artistaId = document.getElementById('rel_artista').value;
    const resultContainer = document.getElementById('relatorioResult');

    resultContainer.innerHTML = '<div style="text-align:center; padding: 40px;"><div class="loading-spinner"></div><p style="margin-top:15px;">Processando dados financeiros...</p></div>';

    try {
        // Carregar dados brutos
        let [eventos, parcelas, despesas] = await Promise.all([
            EventosDB.listar(true),
            ParcelasDB.listar(true),
            DespesasDB.listar(true)
        ]);

        // Filtrar por período
        eventos = eventos.filter(e => e.data >= inicio && e.data <= fim);
        if (artistaId !== 'todos') {
            eventos = eventos.filter(e => e.artista_id === artistaId);
        }

        // Agrupar Totais
        let faturamentoBruto = 0;
        let receitaEscritorio = 0; // Soma das comissões
        let custosOperacionais = 0; // Despesas de shows
        let custosFixos = 0; // Despesas administrativas do escritório

        const consolidadoPorArtista = {};

        // 1. Processar Eventos e Comissões
        for (const ev of eventos) {
            const art = Auth.artistasPermitidos.find(a => a.id === ev.artista_id);
            if (!art) continue;

            const cacheBruto = ev.cache_bruto || 0;
            const comissao = (cacheBruto * (art.comissao_padrao || 0)) / 100;
            const despesasEv = despesas.filter(d => d.evento_id === ev.id).reduce((acc, d) => acc + (d.valor || 0), 0);

            faturamentoBruto += cacheBruto;
            receitaEscritorio += comissao;
            custosOperacionais += despesasEv;

            if (!consolidadoPorArtista[art.id]) {
                consolidadoPorArtista[art.id] = { nome: art.nome, receita: 0, despesas: 0, comissao: 0, shows: 0 };
            }
            consolidadoPorArtista[art.id].receita += cacheBruto;
            consolidadoPorArtista[art.id].despesas += despesasEv;
            consolidadoPorArtista[art.id].comissao += comissao;
            consolidadoPorArtista[art.id].shows++;
        }

        // 2. Processar Despesas Fixas (Escritório)
        const despesasEscritorio = despesas.filter(d => 
            !d.evento_id && (!d.artista_id || artistaId === 'todos') &&
            d.data >= inicio && d.data <= fim
        );
        custosFixos = despesasEscritorio.reduce((acc, d) => acc + (d.valor || 0), 0);

        const lucroLiquidoEscritorio = receitaEscritorio - custosFixos;

        resultContainer.innerHTML = `
            <div class="grid grid-4 mb-4">
                <div class="stat-card" style="border-bottom: 4px solid var(--blue-primary);">
                    <div class="stat-value">${Utils.formatCurrency(faturamentoBruto)}</div>
                    <div class="stat-label">Volume de Vendas (Geral)</div>
                </div>
                <div class="stat-card" style="border-bottom: 4px solid var(--success);">
                    <div class="stat-value">${Utils.formatCurrency(receitaEscritorio)}</div>
                    <div class="stat-label">Faturamento (Comissões)</div>
                </div>
                <div class="stat-card" style="border-bottom: 4px solid var(--red-primary);">
                    <div class="stat-value">${Utils.formatCurrency(custosFixos)}</div>
                    <div class="stat-label">Custos Fixos/Adm</div>
                </div>
                <div class="stat-card" style="border-bottom: 4px solid var(--gold-primary);">
                    <div class="stat-value ${lucroLiquidoEscritorio >= 0 ? 'text-success' : 'text-danger'}">
                        ${Utils.formatCurrency(lucroLiquidoEscritorio)}
                    </div>
                    <div class="stat-label">Lucro Real do Escritório</div>
                </div>
            </div>

            <div class="grid grid-2">
                <div class="turne-section">
                    <div class="section-title"><i class="fas fa-user-friends"></i> Faturamento por Artista</div>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Artista</th>
                                    <th>Shows</th>
                                    <th>Comissão</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.values(consolidadoPorArtista).map(art => `
                                    <tr>
                                        <td><strong>${art.nome}</strong></td>
                                        <td>${art.shows}</td>
                                        <td class="text-success">${Utils.formatCurrency(art.comissao)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="turne-section">
                    <div class="section-title"><i class="fas fa-building"></i> Despesas Fixas do Escritório</div>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Descrição</th>
                                    <th>Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${despesasEscritorio.length > 0 ? despesasEscritorio.map(d => `
                                    <tr>
                                        <td>${Utils.formatDate(d.data)}</td>
                                        <td>${d.descricao}</td>
                                        <td class="text-danger">-${Utils.formatCurrency(d.valor)}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="3" class="text-center">Nenhuma despesa fixa lançada no período.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Cache para exportação
        MultiArtista._cacheRelatorio = {
            faturamento: faturamentoBruto,
            receita: receitaEscritorio,
            custos: custosFixos,
            lucro: lucroLiquidoEscritorio,
            artistas: consolidadoPorArtista,
            despesas_fixas: despesasEscritorio
        };

    } catch (err) {
        console.error('Erro ao gerar relatório:', err);
        resultContainer.innerHTML = '<div class="error-message">Erro ao processar o relatório.</div>';
    }
};

