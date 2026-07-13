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

    // Atualiza APENAS o header visível do seletor, sem re-renderizar o dropdown inteiro
    _atualizarHeaderSeletor(id, lista) {
        const isTodos = id === 'todos';
        const artista = isTodos ? null : (lista || Auth.artistasPermitidos || []).find(a => String(a.id) === String(id));
        const nome = isTodos ? 'Todos os Artistas' : (artista?.nome || 'Selecionar Artista');

        // Atualizar texto
        const nomeEl = document.querySelector('.selected-name');
        if (nomeEl) nomeEl.textContent = nome;

        // Atualizar thumb (ícone ou foto)
        const thumbContainer = document.querySelector('.artista-selected');
        if (thumbContainer) {
            const oldThumb = thumbContainer.querySelector('.artista-thumb, .todos-thumb');
            if (oldThumb) oldThumb.remove();
            const thumbHTML = isTodos
                ? `<div class="artista-thumb todos-thumb" style="flex-shrink:0;"><i class="fas fa-layer-group"></i></div>`
                : `<img src="${artista?.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(nome.slice(0,2))}&background=E10600&color=fff&size=56&bold=true`}" class="artista-thumb">`;
            thumbContainer.insertAdjacentHTML('afterbegin', thumbHTML);
        }

        // Atualizar item ativo no dropdown (se estiver aberto)
        document.querySelectorAll('.artista-option').forEach(opt => {
            const isActive = isTodos
                ? opt.classList.contains('artista-option-todos')
                : opt.getAttribute('onclick')?.includes(String(id));
            opt.classList.toggle('active', !!isActive);
            const check = opt.querySelector('i.fas.fa-check');
            if (isActive && !check) {
                opt.insertAdjacentHTML('beforeend', '<i class="fas fa-check" style="color:#D4AF37;font-size:11px;flex-shrink:0;margin-left:auto;"></i>');
            } else if (!isActive && check) {
                check.remove();
            }
        });
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
                const d = new Date(e.data + 'T12:00:00');
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

        // Cálculo para barra de distribuição
        const topArtistas = dadosArtistas.filter(a => a.faturamento > 0);
        const coresRanking = ['var(--brand-primary)','#8b8b93','#4a86d8','#4ec98a','#f0776a','#c3aef0'];
        const barraSegmentos = topArtistas.map((a, i) => {
            const pct = faturamentoTotal > 0 ? ((a.faturamento / faturamentoTotal) * 100).toFixed(1) : 0;
            return { nome: a.nome, faturamento: a.faturamento, pct, cor: coresRanking[i % coresRanking.length] };
        });

        // Próximos eventos (até 3)
        const proximosEventos3 = todosEventos
            .filter(e => new Date(e.data) >= hoje)
            .sort((a, b) => new Date(a.data) - new Date(b.data))
            .slice(0, 3);

        const html = `
            <div class="fade-in" style="padding:0;">

                <!-- Cabeçalho -->
                <div class="esc-header">
                    <div>
                        <div style="font-size:11px;letter-spacing:2.5px;font-weight:700;color:var(--brand-primary);margin-bottom:8px">DASHBOARD DO ESCRITÓRIO</div>
                        <h1 style="font-size:26px;font-weight:800;letter-spacing:-.5px;margin:0">Visão consolidada</h1>
                        <p style="font-size:13px;color:var(--text-muted);margin-top:5px;font-weight:500">${artistas.length} artistas ativos · ${proximosShows} shows agendados · ${Utils.getMonthName(mesAtual)} ${anoAtual}</p>
                    </div>
                    <div style="display:flex;gap:9px">
                        <button class="btn-secondary" onclick="Pages.changePage('vendas')"><i class="fas fa-plus"></i> Novo evento</button>
                    </div>
                </div>

                <!-- KPI Row -->
                <div class="esc-kpi-grid">

                    <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:15px;padding:17px 18px">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start">
                            <span style="font-size:12px;color:var(--text-muted);font-weight:600">Faturamento geral</span>
                            <span style="width:30px;height:30px;border-radius:8px;background:rgba(212,175,55,0.12);color:var(--brand-primary);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0"><i class="fas fa-dollar-sign"></i></span>
                        </div>
                        <div style="font-size:22px;font-weight:800;letter-spacing:-.5px;margin-top:12px">${Utils.formatCurrency(faturamentoTotal)}</div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:8px">acumulado no ano</div>
                    </div>

                    <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:15px;padding:17px 18px">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start">
                            <span style="font-size:12px;color:var(--text-muted);font-weight:600">Artistas ativos</span>
                            <span style="width:30px;height:30px;border-radius:8px;background:var(--bg-secondary);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0"><i class="fas fa-microphone"></i></span>
                        </div>
                        <div style="font-size:22px;font-weight:800;letter-spacing:-.5px;margin-top:12px">${artistas.length}</div>
                        <div style="margin-top:10px;height:5px;border-radius:3px;background:var(--border-color);overflow:hidden">
                            <div style="width:${artistas.length > 0 ? Math.min(100, (dadosArtistas.filter(a=>a.showsMes>0).length/artistas.length*100).toFixed(0)) : 0}%;height:100%;background:var(--brand-primary);border-radius:3px"></div>
                        </div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:6px">${dadosArtistas.filter(a=>a.showsMes>0).length} com shows este mês</div>
                    </div>

                    <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:15px;padding:17px 18px">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start">
                            <span style="font-size:12px;color:var(--text-muted);font-weight:600">Shows este mês</span>
                            <span style="width:30px;height:30px;border-radius:8px;background:var(--bg-secondary);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0"><i class="fas fa-calendar-check"></i></span>
                        </div>
                        <div style="font-size:22px;font-weight:800;letter-spacing:-.5px;margin-top:12px;color:${showsMes > 0 ? 'var(--success)' : 'inherit'}">${showsMes}</div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:8px">${Utils.getMonthName(mesAtual)} ${anoAtual}</div>
                    </div>

                    <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:15px;padding:17px 18px">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start">
                            <span style="font-size:12px;color:var(--text-muted);font-weight:600">Próximos shows</span>
                            <span style="width:30px;height:30px;border-radius:8px;background:var(--bg-secondary);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0"><i class="fas fa-clock"></i></span>
                        </div>
                        <div style="font-size:22px;font-weight:800;letter-spacing:-.5px;margin-top:12px">${proximosShows}</div>
                        ${proximosEventos3[0] ? `<div style="display:flex;align-items:center;gap:7px;margin-top:9px"><span style="width:7px;height:7px;border-radius:50%;background:var(--brand-primary);flex-shrink:0"></span><span style="font-size:11px;color:var(--text-muted)">Próximo: <strong>${Utils.formatDate(proximosEventos3[0].data)}</strong></span></div>` : ''}
                    </div>
                </div>

                <!-- Main grid: Ranking + Distribuição -->
                <div class="esc-main-grid">

                    <!-- Ranking artistas -->
                    <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:15px;padding:20px 22px">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                            <div>
                                <h2 style="font-size:15px;font-weight:700;margin:0">Ranking de artistas</h2>
                                <p style="font-size:11.5px;color:var(--text-muted);margin-top:2px">Faturamento acumulado no ano</p>
                            </div>
                            <span style="font-size:12px;color:var(--brand-primary);font-weight:600;cursor:pointer" onclick="Pages.changePage('artistas')">Ver todos →</span>
                        </div>

                        <div style="display:flex;flex-direction:column">
                            ${dadosArtistas.map((art, idx) => {
                                const maxFat = dadosArtistas[0]?.faturamento || 1;
                                const pct = maxFat > 0 ? ((art.faturamento / maxFat) * 100).toFixed(0) : 0;
                                const iniciais = art.nome.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
                                const cor = coresRanking[idx % coresRanking.length];
                                const pctTotal = faturamentoTotal > 0 ? ((art.faturamento / faturamentoTotal) * 100).toFixed(0) : 0;
                                return `
                                <div style="display:flex;align-items:center;gap:13px;padding:13px 0;border-top:1px solid var(--border-color)">
                                    <span style="font-size:13px;font-weight:600;color:${idx===0?'var(--brand-primary)':'var(--text-muted)'};width:22px;flex-shrink:0">${String(idx+1).padStart(2,'0')}</span>
                                    <div style="width:38px;height:38px;border-radius:10px;background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0">${iniciais}</div>
                                    <div style="flex:1;min-width:0">
                                        <div style="display:flex;justify-content:space-between;align-items:baseline">
                                            <span style="font-size:14px;font-weight:700">${art.nome}</span>
                                            <span style="font-size:13.5px;font-weight:600">${Utils.formatCurrency(art.faturamento)}</span>
                                        </div>
                                        <div style="height:5px;border-radius:3px;background:var(--border-color);margin-top:8px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${cor};border-radius:3px"></div></div>
                                        <div style="display:flex;justify-content:space-between;margin-top:5px">
                                            <span style="font-size:11px;color:${art.showsMes>0?'var(--success)':'var(--text-muted)'}">${art.showsMes} show(s) este mês</span>
                                            <span style="font-size:11px;color:var(--text-muted)">${pctTotal}% do total</span>
                                        </div>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Coluna direita -->
                    <div style="display:flex;flex-direction:column;gap:16px">

                        <!-- Distribuição de faturamento -->
                        <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:15px;padding:20px 22px">
                            <h2 style="font-size:15px;font-weight:700;margin:0">Distribuição de faturamento</h2>
                            <p style="font-size:11.5px;color:var(--text-muted);margin-top:2px;margin-bottom:16px">Participação de cada artista</p>

                            ${barraSegmentos.length > 0 ? `
                            <div style="display:flex;height:10px;border-radius:5px;overflow:hidden;gap:2px;margin-bottom:16px">
                                ${barraSegmentos.map(s => `<div style="width:${s.pct}%;background:${s.cor};min-width:2px"></div>`).join('')}
                            </div>
                            <div style="display:flex;flex-direction:column;gap:10px">
                                ${barraSegmentos.map(s => `
                                <div style="display:flex;align-items:center;gap:9px">
                                    <span style="width:9px;height:9px;border-radius:3px;background:${s.cor};flex-shrink:0"></span>
                                    <span style="font-size:13px;font-weight:600;flex:1">${s.nome}</span>
                                    <span style="font-size:12px;color:var(--text-muted)">${Utils.formatCurrency(s.faturamento)}</span>
                                    <span style="font-size:12px;font-weight:700;color:${s.cor};width:38px;text-align:right">${s.pct}%</span>
                                </div>`).join('')}
                            </div>
                            ${barraSegmentos.length === 1 && parseFloat(barraSegmentos[0].pct) >= 80 ? `
                            <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border-color);display:flex;align-items:center;gap:8px">
                                <span style="font-size:11.5px;color:var(--danger);background:rgba(239,68,68,0.1);padding:3px 8px;border-radius:6px;font-weight:600">⚠ Concentração alta</span>
                                <span style="font-size:11px;color:var(--text-muted)">${barraSegmentos[0].pct}% em um único artista</span>
                            </div>` : ''}
                            ` : `<div style="text-align:center;padding:30px 0;color:var(--text-muted);font-size:13px"><i class="fas fa-chart-bar" style="font-size:32px;opacity:.3;display:block;margin-bottom:10px"></i>Nenhum faturamento registrado</div>`}
                        </div>

                        <!-- Alerta de ação necessária -->
                        ${todasParcelas.filter(p => p.status !== 'Pago' && new Date(String(p.data_vencimento).slice(0,10)+'T12:00:00') < hoje).length > 0 ? `
                        <div style="background:linear-gradient(135deg,rgba(244,196,48,0.08),var(--card-bg));border:1px solid rgba(244,196,48,0.3);border-radius:15px;padding:18px 20px">
                            <div style="display:flex;align-items:center;justify-content:space-between">
                                <span style="font-size:11px;letter-spacing:1.5px;font-weight:700;color:var(--brand-primary)">AÇÃO NECESSÁRIA</span>
                                <span style="background:var(--brand-primary);color:#141416;font-size:11px;font-weight:800;padding:2px 8px;border-radius:6px">${todasParcelas.filter(p => p.status !== 'Pago' && new Date(String(p.data_vencimento).slice(0,10)+'T12:00:00') < hoje).length}</span>
                            </div>
                            <div style="font-size:14px;font-weight:700;margin-top:10px">Cobranças pendentes</div>
                            <p style="font-size:12px;color:var(--text-muted);margin-top:4px;line-height:1.5">Parcelas vencidas aguardando regularização</p>
                            <button class="btn-primary" onclick="Pages.changePage('financeiro')" style="margin-top:13px;width:100%;border-radius:9px">Revisar cobranças</button>
                        </div>` : ''}
                    </div>
                </div>

                <!-- Próximos eventos -->
                ${proximosEventos3.length > 0 ? `
                <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:15px;padding:20px 22px">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
                        <div>
                            <h2 style="font-size:15px;font-weight:700;margin:0">Próximos eventos</h2>
                            <p style="font-size:11.5px;color:var(--text-muted);margin-top:2px">Agenda dos próximos 30 dias</p>
                        </div>
                        <span style="font-size:12px;color:var(--brand-primary);font-weight:600;cursor:pointer" onclick="Pages.changePage('turnes')">Central de turnê →</span>
                    </div>
                    <div class="esc-events-grid">
                        ${proximosEventos3.map(e => {
                            const artEv = dadosArtistas.find(a => a.id === e.artista_id) || artistas.find(a => a.id === e.artista_id);
                            const dData = new Date(e.data + 'T12:00:00');
                            const mes3 = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'][dData.getMonth()];
                            const dia = String(dData.getDate()).padStart(2,'0');
                            const statusCor = e.status === 'Confirmado' ? 'var(--success)' : e.status === 'Reserva' ? 'var(--brand-primary)' : 'var(--text-muted)';
                            const statusIcon = e.status === 'Confirmado' ? '✓' : '◷';
                            return `
                            <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:12px;padding:15px 16px;display:flex;gap:13px">
                                <div style="text-align:center;flex-shrink:0">
                                    <div style="font-size:10px;color:var(--brand-primary);font-weight:700;letter-spacing:1px">${mes3}</div>
                                    <div style="font-size:22px;font-weight:800;line-height:1;margin-top:2px">${dia}</div>
                                </div>
                                <div style="border-left:1px solid var(--border-color);padding-left:13px">
                                    <div style="font-size:13.5px;font-weight:700">${artEv?.nome || '—'}</div>
                                    <div style="font-size:11.5px;color:var(--text-muted);margin-top:3px">${e.local || '—'} · ${e.cidade || ''}</div>
                                    <div style="font-size:11px;color:${statusCor};margin-top:7px;font-weight:600">${statusIcon} ${e.status}</div>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>` : ''}
            </div>
        `;

        document.getElementById('pageContent').innerHTML = html;

    } catch (err) {
        console.error('Erro ao carregar Dashboard do Escritório:', err);
        document.getElementById('pageContent').innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted)"><i class="fas fa-exclamation-triangle" style="font-size:40px;margin-bottom:16px;color:var(--danger)"></i><p>Erro ao carregar o dashboard. Tente novamente.</p></div>`;
    }
};