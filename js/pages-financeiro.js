/* ========================================
   GIBSON MANAGER PRO - PAGES (FINANCEIRO, EQUIPE, ALERTAS)
   Páginas de Financeiro, Equipe e Alertas
======================================== */

Pages.renderFinanceiro = async function() {
    const hoje = new Date();
    const mes = hoje.getMonth();
    const ano = hoje.getFullYear();

    const totais = await Utils.calcularTotaisMes(mes, ano);
    const parcelas = await ParcelasDB.listar();
    const parcelasAtrasadas = await ParcelasDB.verificarAtrasadas();
    const modelos = Auth.isAdmin() ? await ModelosDespesaDB.listar() : [];
    let parcelasPendentes = parcelas.filter(p => p.status === 'Pendente');

    // Filtrar por termo de busca
    if (Pages.currentSearchTerm) {
        // Precisamos buscar dados dos eventos para filtrar por nome do artista/local
        const searchResults = [];
        for (const p of parcelas) {
            const ev = await EventosDB.buscarPorId(p.evento_id);
            const art = ev ? await ArtistasDB.buscarPorId(ev.artista_id) : null;
            const match = 
                ev?.local.toLowerCase().includes(Pages.currentSearchTerm) ||
                art?.nome.toLowerCase().includes(Pages.currentSearchTerm) ||
                p.status.toLowerCase().includes(Pages.currentSearchTerm);
            
            if (match) searchResults.push(p);
        }
        return this.renderFinanceiroSearch(searchResults);
    }

    // Separar creditado (parcelas pagas) e a receber (pendentes de contratos assinados)
    const parcelasPagas = parcelas.filter(p => p.status === 'Pago');
    const totalCreditado = parcelasPagas.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
    const totalAReceber = parcelasPendentes.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
    const totalAtrasado = parcelasAtrasadas.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);

    const html = `
        <div class="financeiro-container">
            <div class="page-header flex-between mb-3">
                <div>
                    <h2>Financeiro</h2>
                    <p class="text-muted">${Utils.getMonthName(mes)} ${ano}</p>
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <button class="btn-primary" onclick="Pages.renderGestaoFinanceira()">
                        <i class="fas fa-wallet"></i> Gestão
                    </button>
                    <button class="btn-secondary" onclick="Pages.renderRecebimentos()">
                        <i class="fas fa-bell"></i> Recebimentos
                    </button>
                    <button class="btn-secondary" onclick="Pages.renderBalancoMensal()">
                        <i class="fas fa-chart-bar"></i> Balanço
                    </button>
                    <button class="btn-secondary" onclick="Pages.renderComissoesVendedores()">
                        <i class="fas fa-user-tie"></i> Comissões
                    </button>
                    <button class="btn-secondary" onclick="Utils.exportToExcel(parcelas, 'financeiro_geral')">
                        <i class="fas fa-file-excel"></i> Exportar
                    </button>
                </div>
            </div>

            <!-- KPIs -->
            <div class="grid grid-4 mb-3">
                <div class="stat-card">
                    <div class="stat-icon green">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="stat-content">
                        <h3 class="text-success">${Utils.formatCurrency(totalCreditado)}</h3>
                        <p>Creditado</p>
                        <small class="text-muted">${parcelasPagas.length} parcela(s) recebida(s)</small>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon blue">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${Utils.formatCurrency(totalAReceber)}</h3>
                        <p>A Receber</p>
                        <small class="text-muted">${parcelasPendentes.length} parcela(s) pendente(s)</small>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon red">
                        <i class="fas fa-arrow-down"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${Utils.formatCurrency(totais.despesas)}</h3>
                        <p>Total de Despesas</p>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon ${(totalCreditado - totais.despesas) >= 0 ? 'green' : 'red'}">
                        <i class="fas fa-wallet"></i>
                    </div>
                    <div class="stat-content">
                        <h3 class="${(totalCreditado - totais.despesas) >= 0 ? 'text-success' : 'text-danger'}">
                            ${Utils.formatCurrency(totalCreditado - totais.despesas)}
                        </h3>
                        <p>Saldo Real</p>
                        <small class="text-muted">Creditado − Despesas</small>
                    </div>
                </div>
            </div>

            ${totalAtrasado > 0 ? `
                <div class="card mb-3" style="border-left: 4px solid var(--danger);">
                    <div class="card-body">
                        <h3 style="color: var(--danger); margin-bottom: 8px;">
                            <i class="fas fa-exclamation-triangle"></i> Atenção: ${parcelasAtrasadas.length} parcela(s) atrasada(s)
                        </h3>
                        <p style="color: var(--text-secondary); margin: 0;">
                            Total atrasado: <strong style="color: var(--danger);">${Utils.formatCurrency(totalAtrasado)}</strong>
                        </p>
                    </div>
                </div>
            ` : ''}

            <!-- RECEBIMENTOS A CONFIRMAR -->
            <div class="card mb-3" id="recebimentos-confirmar-card">
                <div class="card-header flex-between">
                    <h3 class="card-title">
                        <i class="fas fa-hand-holding-usd" style="color:var(--red-primary)"></i>
                        Recebimentos a Confirmar
                    </h3>
                    <small class="text-muted">Parcelas do cronograma aguardando lançamento manual</small>
                </div>
                <div class="card-body" id="recebimentos-confirmar-body">
                    <div class="loading-container"><div class="loading-spinner"></div></div>
                </div>
            </div>

            ${Auth.isAdmin() ? `
            <!-- COMISSÕES DE VENDEDORES -->
            <div class="card mb-3" id="comissoes-vendedor-card">
                <div class="card-header flex-between">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <i class="fas fa-user-tie" style="color:var(--brand-primary);font-size:18px;"></i>
                        <div>
                            <h3 class="card-title" style="margin:0;">Comissões de Vendedores</h3>
                            <small class="text-muted">Controle de pagamento por vendedor</small>
                        </div>
                    </div>
                </div>
                <div class="card-body" id="comissoes-vendedor-body">
                    <div class="loading-container"><div class="loading-spinner"></div></div>
                </div>
            </div>
            ` : ''}

            ${Auth.isAdmin() ? `
            <!-- Modelos de Despesa Recorrente -->
            <div class="card mb-3">
                <div class="card-header flex-between">
                    <h3 class="card-title">
                        <i class="fas fa-clone" style="color:var(--red-primary)"></i>
                        Modelos de Despesa Recorrente
                    </h3>
                    <div style="display:flex;gap:8px;">
                        <button class="btn-primary btn-sm" onclick="Modals.showModeloModal()">
                            <i class="fas fa-plus"></i> Novo Modelo
                        </button>
                    </div>
                </div>
                <div class="card-body" id="modelosListContainer">
                    ${modelos.length > 0 ? `
                    <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:8px;padding:8px 12px;">
                        <i class="fas fa-info-circle" style="color:#F59E0B;"></i>
                        <strong>Modelos não lançam despesas automaticamente.</strong> Clique em <strong>Gerar Mês Atual</strong> para criar a despesa do mês com 1 clique.
                    </p>
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">
                        ${modelos.map(m => {
                            const catsDespesa = [
                                { id: 'aluguel', nome: 'Aluguel', icon: 'fa-home' },
                                { id: 'energia', nome: 'Energia Elétrica', icon: 'fa-bolt' },
                                { id: 'agua', nome: 'Água', icon: 'fa-tint' },
                                { id: 'internet', nome: 'Internet/Telefone', icon: 'fa-wifi' },
                                { id: 'folha', nome: 'Folha de Pagamento', icon: 'fa-users' },
                                { id: 'marketing', nome: 'Marketing/Mídia', icon: 'fa-bullhorn' },
                                { id: 'equipamentos', nome: 'Equipamentos', icon: 'fa-tools' },
                                { id: 'transporte', nome: 'Transporte', icon: 'fa-car' },
                                { id: 'alimentacao', nome: 'Alimentação', icon: 'fa-utensils' },
                                { id: 'impostos', nome: 'Impostos/Taxas', icon: 'fa-file-invoice' },
                                { id: 'manutencao', nome: 'Manutenção', icon: 'fa-wrench' },
                                { id: 'comissoes', nome: 'Comissões', icon: 'fa-hand-holding-usd' },
                                { id: 'extras', nome: 'Despesas Extras', icon: 'fa-plus-circle' },
                            ];
                            const cat = catsDespesa.find(c => c.id === m.categoria);
                            return `
                            <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:10px;">
                                <div style="display:flex;align-items:center;gap:10px;">
                                    <div style="width:36px;height:36px;border-radius:8px;background:rgba(225,6,0,0.12);display:flex;align-items:center;justify-content:center;color:var(--red-primary);flex-shrink:0;">
                                        <i class="fas ${cat?.icon || 'fa-clone'}"></i>
                                    </div>
                                    <div style="flex:1;min-width:0;">
                                        <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.nome}</div>
                                        <div style="font-size:11px;color:var(--text-muted);">${cat?.nome || m.categoria} · Todo dia ${m.dia_vencimento || '?'}</div>
                                    </div>
                                    <strong style="color:#EF4444;font-size:13px;flex-shrink:0;">${Utils.formatCurrency(m.valor || 0)}</strong>
                                </div>
                                <div style="display:flex;gap:6px;">
                                    <button class="btn-primary btn-sm" style="flex:1;" onclick="Pages.gerarDespesaModeloFinanceiro('${m.id}')">
                                        <i class="fas fa-magic"></i> Gerar Mês Atual
                                    </button>
                                    <button class="btn-secondary btn-sm" onclick="Pages.deletarModeloFinanceiro('${m.id}')" style="color:var(--danger);">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                    ` : `
                    <div style="text-align:center;padding:32px;color:var(--text-muted);">
                        <i class="fas fa-clone" style="font-size:40px;opacity:0.25;display:block;margin-bottom:12px;"></i>
                        <p style="font-size:14px;margin-bottom:16px;">
                            Nenhum modelo cadastrado.<br>
                            <small>Modelos facilitam o lançamento mensal de despesas fixas como aluguel, energia e folha.</small>
                        </p>
                        <button class="btn-primary" onclick="Modals.showModeloModal()">
                            <i class="fas fa-plus"></i> Criar Primeiro Modelo
                        </button>
                    </div>`}
                </div>
            </div>
            ` : ''}

            <!-- Parcelas -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Parcelas e Pagamentos</h3>
                </div>
                <div class="card-body">
                    ${await this.renderParcelasTable(parcelas)}
                </div>
            </div>

            <!-- Gráfico de Fluxo de Caixa -->
            <div class="card mt-3">
                <div class="card-header">
                    <h3 class="card-title">Fluxo de Caixa (Últimos 6 Meses)</h3>
                </div>
                <div class="card-body">
                    <canvas id="fluxoCaixaChart" style="height: 300px;"></canvas>
                </div>
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;

    // Renderizar gráfico
    await this.renderFluxoCaixaChart(mes, ano);

    // Carregar recebimentos a confirmar (async, não bloqueia o render)
    Pages.carregarRecebimentosAConfirmar();

    // Carregar comissões de vendedores
    if (Auth.isAdmin()) Pages.carregarComissoesVendedores();
};

// ── Seção "Recebimentos a Confirmar" ─────────────────────────────────────────
Pages.carregarRecebimentosAConfirmar = async function() {
    const el = document.getElementById('recebimentos-confirmar-body');
    if (!el) return;

    const estilos = `
    <style>
        .rec-table-wrap {
            overflow-x:auto; margin-bottom:28px;
            border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,.15);
            border:1px solid var(--border-color);
        }
        /* Cabeçalho do show */
        .rec-show-header {
            display:grid;
            grid-template-columns: 2fr 1.2fr 1.5fr 1.5fr 1.5fr 2fr;
            background: linear-gradient(135deg, #D4AF37 0%, #b8962e 100%);
            border-radius:11px 11px 0 0;
        }
        .rec-show-header .rsh-cell {
            padding:0; text-align:center;
            border-right:1px solid rgba(255,255,255,.2);
        }
        .rec-show-header .rsh-cell:last-child { border-right:none; }
        .rec-show-header .rsh-label {
            display:block; font-size:10px; font-weight:700;
            text-transform:uppercase; letter-spacing:.6px;
            color:rgba(0,0,0,.55); padding:6px 10px 2px;
        }
        .rec-show-header .rsh-value {
            display:block; font-size:14px; font-weight:800;
            color:#000; padding:0 10px 8px;
        }
        /* Tabela de parcelas */
        .rec-body-table { width:100%; border-collapse:collapse; }
        .rec-body-table thead tr {
            background:var(--bg-secondary);
            border-top:1px solid var(--border-color);
        }
        .rec-body-table th {
            padding:9px 10px; font-size:10px; font-weight:700;
            text-transform:uppercase; letter-spacing:.5px;
            color:var(--text-secondary);
            border-bottom:2px solid var(--border-color);
            border-right:1px solid var(--border-color);
            text-align:center; white-space:nowrap;
        }
        .rec-body-table th:last-child { border-right:none; }
        .rec-body-table td {
            padding:8px 10px; border-bottom:1px solid var(--border-color);
            border-right:1px solid var(--border-color);
            background:var(--bg-card); vertical-align:middle;
        }
        .rec-body-table td:last-child { border-right:none; }
        .rec-body-table tbody tr:hover td { background:var(--bg-secondary); }
        .rec-body-table td.locked {
            background:var(--bg-secondary); color:var(--text-primary);
            font-weight:700; text-align:center; font-size:13px;
        }
        .rec-body-table td.locked-green { color:var(--success) !important; }
        .rec-input {
            width:100%; border:1px solid var(--border-color); border-radius:6px;
            padding:6px 9px; font-size:12px; background:var(--bg-primary);
            color:var(--text-primary); box-sizing:border-box; transition:border .15s;
        }
        .rec-input:focus { border-color:#D4AF37; outline:none; box-shadow:0 0 0 2px rgba(212,175,55,.15); }
        /* Rodapé totais */
        .rec-body-table tfoot tr { background:var(--bg-secondary); }
        .rec-body-table tfoot td {
            padding:9px 12px; font-weight:700; font-size:13px;
            border-top:2px solid var(--border-color);
            border-bottom:1px solid var(--border-color);
            border-right:1px solid var(--border-color);
        }
        .rec-body-table tfoot td:last-child { border-right:none; }
        .rec-total-label { text-align:right; color:var(--text-secondary); font-size:11px; text-transform:uppercase; letter-spacing:.5px; }
        .rec-total-val   { text-align:center; color:#D4AF37; font-size:14px; }
        .rec-total-receb { color:var(--success) !important; }
        .rec-total-falta { color:var(--danger)  !important; }
        /* Botão confirmar */
        .btn-confirmar-parc {
            background: linear-gradient(135deg, #D4AF37, #b8962e);
            color:#000; border:none; border-radius:7px;
            padding:6px 12px; font-size:11px; font-weight:800;
            cursor:pointer; white-space:nowrap; transition:all .2s;
            display:inline-flex; align-items:center; gap:5px;
        }
        .btn-confirmar-parc:hover { transform:scale(1.04); box-shadow:0 3px 10px rgba(212,175,55,.4); }
        .parc-confirmada td { opacity:.65; }
        .tag-lançado {
            display:inline-flex; align-items:center; gap:4px;
            color:var(--success); font-size:12px; font-weight:700;
        }
    </style>`;

    try {
        const [contratos, eventos, artistas, todasParcelas] = await Promise.all([
            ContratosDB.listar(),
            EventosDB.listar(),
            ArtistasDB.listar(),
            ParcelasDB.listar()
        ]);

        const contratosAssinados = contratos.filter(c => c.status === 'Assinado');

        // Montar lista de eventos válidos com dados
        const itens = [];
        for (const contrato of contratosAssinados) {
            const evento = eventos.find(e => e.id === contrato.evento_id);
            if (!evento || !evento.proposta_id) continue;
            const proposta = await PropostasDB.buscarPorId(evento.proposta_id);
            if (!proposta?.condicoes_pagamento) continue;
            let cronograma = [];
            try {
                const cond = typeof proposta.condicoes_pagamento === 'string'
                    ? JSON.parse(proposta.condicoes_pagamento)
                    : proposta.condicoes_pagamento;
                cronograma = cond.cronograma || [];
            } catch(e) { continue; }
            if (!cronograma.length) continue;
            itens.push({ contrato, evento, proposta, cronograma });
        }

        if (!itens.length) {
            el.innerHTML = `<p class="text-muted" style="text-align:center;padding:20px;font-size:13px;">
                <i class="fas fa-check-circle" style="color:var(--success);margin-right:6px;"></i>
                Nenhum recebimento pendente de confirmação.
            </p>`;
            return;
        }

        // Cidades únicas
        const cidades = [...new Set(
            itens.map(it => it.evento.cidade || it.evento.estado || '—').filter(c => c && c !== '—')
        )].sort();

        // Guardar dados no window para filtro/PDF
        window._recebimentosData = { itens, artistas, todasParcelas };

        function buildBlocos(filtroCity) {
            const itensFiltrados = filtroCity
                ? itens.filter(it => (it.evento.cidade || it.evento.estado || '') === filtroCity)
                : itens;

            return itensFiltrados.map(({ evento, proposta, cronograma }) => {
                const artista    = artistas.find(a => a.id === evento.artista_id);
                const parcelasEv = todasParcelas.filter(p => p.evento_id === evento.id);
                const cacheBruto = proposta.cache_bruto || 0;
                const totalAReceber = cronograma.reduce((s, item) => {
                    const v = item.valor !== undefined ? item.valor : parseFloat((cacheBruto * (item.pct || 100) / 100).toFixed(2));
                    return s + v;
                }, 0);
                const totalRecebido = parcelasEv.filter(p => p.status === 'Pago').reduce((s, p) => s + (parseFloat(p.valor_recebido || p.valor) || 0), 0);
                const faltam = totalAReceber - totalRecebido;
                const cidade = evento.cidade || evento.estado || '—';

                const linhas = cronograma.map((item, idx) => {
                    const numero   = item.numero || (idx + 1);
                    const valor    = item.valor !== undefined ? item.valor : parseFloat((cacheBruto * (item.pct || 100) / 100).toFixed(2));
                    let dataVenc   = item.data_vencimento;
                    if (!dataVenc && item.dias_antes_show !== undefined && evento.data) {
                        const d = new Date(evento.data + 'T12:00:00');
                        d.setDate(d.getDate() + (item.dias_antes_show || 0));
                        dataVenc = d.toISOString().split('T')[0];
                    }
                    const descricao = item.descricao || `Parcela ${numero}`;
                    const parc      = parcelasEv.find(p => p.numero_parcela === numero);
                    const confirmada = !!parc;
                    const uid = `rec_${evento.id}_${numero}`;

                    return `
                    <tr class="${confirmada ? 'parc-confirmada' : ''}">
                        <td class="locked">${Utils.formatCurrency(valor)}</td>
                        <td class="locked">${dataVenc ? Utils.formatDate(dataVenc) : '—'}</td>
                        <td><input type="date" class="rec-input" id="${uid}_dtreceb" value="${parc?.data_recebimento || ''}" ${confirmada ? 'disabled' : ''}></td>
                        <td><input type="number" step="0.01" class="rec-input" id="${uid}_vlrreceb" value="${confirmada ? (parc?.valor_recebido || valor) : (parc?.valor_recebido || '')}" placeholder="${Utils.formatCurrency(valor)}" ${confirmada ? 'disabled' : ''}></td>
                        <td>
                            <select class="rec-input" id="${uid}_forma" ${confirmada ? 'disabled' : ''}>
                                <option value="">—</option>
                                <option value="PIX" ${parc?.forma_pagamento==='PIX'?'selected':''}>PIX</option>
                                <option value="TED" ${parc?.forma_pagamento==='TED'?'selected':''}>TED</option>
                                <option value="DOC" ${parc?.forma_pagamento==='DOC'?'selected':''}>DOC</option>
                                <option value="Boleto" ${parc?.forma_pagamento==='Boleto'?'selected':''}>Boleto</option>
                                <option value="Cheque" ${parc?.forma_pagamento==='Cheque'?'selected':''}>Cheque</option>
                                <option value="Dinheiro" ${parc?.forma_pagamento==='Dinheiro'?'selected':''}>Dinheiro</option>
                                <option value="Cartão" ${parc?.forma_pagamento==='Cartão'?'selected':''}>Cartão</option>
                            </select>
                        </td>
                        <td><input type="text" class="rec-input" id="${uid}_origem" value="${parc?.origem || ''}" placeholder="Ex: Guiche Web" ${confirmada ? 'disabled' : ''}></td>
                        <td><input type="text" class="rec-input" id="${uid}_inst" value="${parc?.instituicao || ''}" placeholder="Ex: Banco Itaú" ${confirmada ? 'disabled' : ''}></td>
                        <td style="text-align:center;">
                            ${confirmada
                                ? `<span style="color:var(--success);font-weight:700;font-size:12px;"><i class="fas fa-check-circle"></i> Lançado</span>`
                                : `<button class="btn-confirmar-parc" onclick="Pages.confirmarLancamentoParcela('${evento.id}',${numero},'${descricao}',${valor},'${dataVenc||''}','${uid}')">
                                    <i class="fas fa-check"></i> Confirmar
                                   </button>`
                            }
                        </td>
                    </tr>`;
                }).join('');

                return `
                <div class="rec-table-wrap" data-cidade="${cidade}">
                    <div class="rec-show-header">
                        <div class="rsh-cell">
                            <span class="rsh-label">Show</span>
                            <span class="rsh-value">${artista?.nome || '—'}</span>
                        </div>
                        <div class="rsh-cell">
                            <span class="rsh-label">Data do Show</span>
                            <span class="rsh-value">${evento.data ? Utils.formatDate(evento.data) : '—'}</span>
                        </div>
                        <div class="rsh-cell">
                            <span class="rsh-label">Valor do Show</span>
                            <span class="rsh-value">${Utils.formatCurrency(cacheBruto)}</span>
                        </div>
                        <div class="rsh-cell">
                            <span class="rsh-label">Cidade</span>
                            <span class="rsh-value">${cidade}</span>
                        </div>
                        <div class="rsh-cell">
                            <span class="rsh-label">Responsável</span>
                            <span class="rsh-value">${proposta.contratante_nome || evento.contratante || '—'}</span>
                        </div>
                        <div class="rsh-cell">
                            <span class="rsh-label">Local do Show</span>
                            <span class="rsh-value">${evento.local || '—'}</span>
                        </div>
                    </div>
                    <table class="rec-body-table">
                        <thead>
                            <tr>
                                <th>Valor a Receber</th>
                                <th>Data a Receber</th>
                                <th>Data do Recebimento</th>
                                <th>Valor Recebido</th>
                                <th>Forma de Pagamento</th>
                                <th>Origem</th>
                                <th>Instituição</th>
                                <th>Ação</th>
                            </tr>
                        </thead>
                        <tbody>${linhas}</tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3" class="rec-total-label">TOTAL A RECEBER</td>
                                <td class="rec-total-val" colspan="4">${Utils.formatCurrency(totalAReceber)}</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td colspan="3" class="rec-total-label">TOTAL RECEBIDO</td>
                                <td class="rec-total-val rec-total-receb" colspan="4">${Utils.formatCurrency(totalRecebido)}</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td colspan="3" class="rec-total-label">FALTAM</td>
                                <td class="rec-total-val rec-total-falta" colspan="4">${Utils.formatCurrency(faltam)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>`;
            }).join('');
        }

        // Barra de controles: filtro de cidade + botão PDF
        const cidadeChips = `
        <div class="rec-controls" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:20px;">
            <div class="rec-city-filter" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-secondary);margin-right:4px;"><i class="fas fa-map-marker-alt"></i> Cidade:</span>
                <button class="rec-city-chip active" onclick="Pages._filtrarRecebimentos(null, this)" data-city="">Todas</button>
                ${cidades.map(c => `<button class="rec-city-chip" onclick="Pages._filtrarRecebimentos('${c}', this)" data-city="${c}">${c}</button>`).join('')}
            </div>
            <button onclick="Pages._exportarRecebimentosPDF()" style="background:linear-gradient(135deg,#c0392b,#e74c3c);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;">
                <i class="fas fa-file-pdf"></i> Exportar PDF
            </button>
        </div>
        <style>
            .rec-city-chip {
                padding:5px 14px; border-radius:20px; border:1px solid var(--border-color);
                background:var(--bg-secondary); color:var(--text-secondary);
                font-size:12px; font-weight:600; cursor:pointer; transition:all .15s;
            }
            .rec-city-chip:hover { border-color:#D4AF37; color:#D4AF37; }
            .rec-city-chip.active { background:#D4AF37; color:#000; border-color:#D4AF37; }
        </style>`;

        el.innerHTML = estilos + cidadeChips + `<div id="rec-blocos-container">${buildBlocos(null)}</div>`;

        // Guardar buildBlocos para reuso no filtro
        window._buildRecBlocos = buildBlocos;

    } catch(e) {
        console.error('Erro ao carregar recebimentos a confirmar:', e);
        if (el) el.innerHTML = '<p class="text-muted" style="padding:16px;">Erro ao carregar recebimentos.</p>';
    }
};

/* ══════════════════════════════════════════════════════════════════════════
   PÁGINA COMPLETA DE COMISSÕES DE VENDEDORES
══════════════════════════════════════════════════════════════════════════ */
Pages.renderComissoesVendedores = async function(filtroVendedor) {
    window._cmFiltroVendedor = filtroVendedor || '';
    document.getElementById('pageContent').innerHTML =
        '<div class="loading-container"><div class="loading-spinner"></div></div>';

    const escId = Auth.currentUser && Auth.currentUser.escritorio_id;

    // ── Carregar dados ────────────────────────────────────────────────────
    var qProp = sbClient.from('propostas').select('*').eq('status', 'Aceita');
    if (escId) qProp = qProp.eq('escritorio_id', escId);

    var qEvt  = sbClient.from('eventos').select('id,artista_id,proposta_id,data,local,cidade');
    if (escId) qEvt = qEvt.eq('escritorio_id', escId);

    var qArt  = sbClient.from('artistas').select('id,nome');
    if (escId) qArt = qArt.eq('escritorio_id', escId);

    var qDesp = sbClient.from('despesas').select('*').eq('categoria', 'Comissão');
    if (escId) qDesp = qDesp.eq('escritorio_id', escId);

    try {
        var [rProp, rEvt, rArt, rDesp] = await Promise.all([qProp, qEvt, qArt, qDesp]);

        var propostasAceitas = (rProp.data || []).filter(function(p) {
            return parseFloat(p.vendedor_comissao_valor) > 0 && (p.vendedor_nome || p.vendedor_nome_fin);
        });
        var eventos  = rEvt.data  || [];
        var artistas = rArt.data  || [];
        var despesas = rDesp.data || [];

        // ── Auto-sync ────────────────────────────────────────────────────
        var syncPromises = [];
        propostasAceitas.forEach(function(p) {
            var evento = eventos.find(function(e) { return e.proposta_id === p.id; });
            if (!evento) return;
            var jaExiste = despesas.find(function(d) {
                return d.evento_id === evento.id && d.categoria === 'Comissão';
            });
            if (!jaExiste) {
                var nomeVend = p.vendedor_nome || p.vendedor_nome_fin || 'N/A';
                syncPromises.push(
                    sbClient.from('despesas').insert({
                        escritorio_id:   escId,
                        evento_id:       evento.id,
                        descricao:       'Comissão Vendedor – ' + nomeVend,
                        categoria:       'Comissão',
                        valor:           parseFloat(p.vendedor_comissao_valor),
                        data_vencimento: p.data_evento || null,
                        status:          'Pendente',
                        observacoes:     'Sincronizado automaticamente da proposta aceita.',
                    }).then(function(r) { if (r.data && r.data[0]) despesas.push(r.data[0]); })
                      .catch(function(){})
                );
            }
        });
        if (syncPromises.length > 0) {
            await Promise.all(syncPromises);
            var { data: dAtual } = await (escId
                ? sbClient.from('despesas').select('*').eq('categoria','Comissão').eq('escritorio_id', escId)
                : sbClient.from('despesas').select('*').eq('categoria','Comissão'));
            despesas = dAtual || [];
        }

        // ── Montar itens ────────────────────────────────────────────────
        var items = propostasAceitas.map(function(p) {
            var evento  = eventos.find(function(e) { return e.proposta_id === p.id; });
            var artista = evento ? artistas.find(function(a) { return a.id === evento.artista_id; }) : null;
            var despesa = evento ? despesas.find(function(d) {
                return d.evento_id === evento.id && d.categoria === 'Comissão';
            }) : null;
            return {
                proposta:       p,
                evento:         evento,
                artista:        artista,
                despesa:        despesa,
                vendedor:       p.vendedor_nome || p.vendedor_nome_fin || 'N/A',
                artistaNome:    artista ? artista.nome : '—',
                valor:          parseFloat(p.vendedor_comissao_valor) || 0,
                status:         despesa ? (despesa.status || 'Pendente') : 'Pendente',
                dataPagamento:  despesa ? despesa.data_pagamento : null,
                dataVencimento: despesa ? despesa.data_vencimento : (p.data_evento || null),
                despesaId:      despesa ? despesa.id : null,
                eventoId:       evento ? evento.id : null,
                dataShow:       p.data_evento || (evento ? evento.data : null),
                local:          evento ? (evento.local || evento.cidade || '') : '',
            };
        });

        // ── Filtro ─────────────────────────────────────────────────────
        var todosVendedores = [];
        items.forEach(function(i) { if (todosVendedores.indexOf(i.vendedor) === -1) todosVendedores.push(i.vendedor); });
        todosVendedores.sort();

        var filtroAtual = window._cmFiltroVendedor || '';
        var itemsFiltrados = filtroAtual ? items.filter(function(i) { return i.vendedor === filtroAtual; }) : items;

        // ── Agrupar por vendedor ────────────────────────────────────────
        var vendMap = {};
        itemsFiltrados.forEach(function(item) {
            if (!vendMap[item.vendedor]) {
                vendMap[item.vendedor] = { nome: item.vendedor, items: [], pendente: 0, pago: 0, total: 0, artistas: {} };
            }
            var v = vendMap[item.vendedor];
            v.items.push(item);
            v.total += item.valor;
            if (item.status === 'Pago') v.pago += item.valor;
            else v.pendente += item.valor;
            if (!v.artistas[item.artistaNome]) v.artistas[item.artistaNome] = { shows: 0, valor: 0 };
            v.artistas[item.artistaNome].shows++;
            v.artistas[item.artistaNome].valor += item.valor;
        });

        var lista = Object.values(vendMap).sort(function(a, b) { return b.total - a.total; });

        // ── KPIs globais ───────────────────────────────────────────────
        var gtTotal    = items.reduce(function(s,i){ return s + i.valor; }, 0);
        var gtPago     = items.reduce(function(s,i){ return s + (i.status==='Pago'?i.valor:0); }, 0);
        var gtPendente = gtTotal - gtPago;

        // ── Ranking geral de artistas (todos os vendedores) ────────────
        var rankGeral = {};
        items.forEach(function(item) {
            if (!rankGeral[item.artistaNome]) rankGeral[item.artistaNome] = { shows: 0, valor: 0, vendedores: new Set() };
            rankGeral[item.artistaNome].shows++;
            rankGeral[item.artistaNome].valor += item.valor;
            rankGeral[item.artistaNome].vendedores.add(item.vendedor);
        });
        var rankArr = Object.entries(rankGeral).sort(function(a,b){ return b[1].shows - a[1].shows; }).slice(0, 8);
        var maxRank = rankArr.length > 0 ? rankArr[0][1].shows : 1;

        // ── HTML ────────────────────────────────────────────────────────
        var filtroOpts = '<option value="">Todos os Vendedores</option>' +
            todosVendedores.map(function(n) {
                return '<option value="' + n + '"' + (filtroAtual === n ? ' selected' : '') + '>' + n + '</option>';
            }).join('');

        // Ranking geral HTML
        var rankGeralHtml = rankArr.length > 0 ? `
            <div class="card mb-3">
                <div class="card-header">
                    <h3 class="card-title"><i class="fas fa-trophy" style="color:#D4AF37"></i> Ranking Geral — Artistas mais Vendidos</h3>
                </div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;">
                        ${rankArr.map(function(entry, idx) {
                            var nome = entry[0]; var d = entry[1];
                            var pctBar = Math.round((d.shows / maxRank) * 100);
                            var medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx+1) + 'º';
                            return '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:10px;padding:12px 14px;">' +
                                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
                                    '<span style="font-size:18px;flex-shrink:0;">' + medal + '</span>' +
                                    '<div style="flex:1;min-width:0;">' +
                                        '<div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + nome + '</div>' +
                                        '<div style="font-size:11px;color:var(--text-muted);">' + d.shows + ' show' + (d.shows>1?'s':'') + ' · ' + d.vendedores.size + ' vendedor' + (d.vendedores.size>1?'es':'') + '</div>' +
                                    '</div>' +
                                    '<strong style="color:var(--brand-primary);font-size:13px;flex-shrink:0;">' + Utils.formatCurrency(d.valor) + '</strong>' +
                                '</div>' +
                                '<div style="height:8px;background:var(--border-color);border-radius:4px;overflow:hidden;">' +
                                    '<div style="height:100%;width:' + pctBar + '%;background:linear-gradient(90deg,#D4AF37,rgba(212,175,55,0.4));border-radius:4px;"></div>' +
                                '</div>' +
                            '</div>';
                        }).join('')}
                    </div>
                </div>
            </div>` : '';

        // Cards por vendedor
        var cardsHtml = lista.map(function(v) {
            var pct = v.total > 0 ? Math.round(v.pago / v.total * 100) : 0;
            var cor = v.pendente === 0 ? 'var(--success)' : 'var(--warning)';
            var artsArr = Object.entries(v.artistas).sort(function(a,b){ return b[1].shows - a[1].shows; });
            var maxShows = artsArr.length > 0 ? artsArr[0][1].shows : 1;

            var rankingHtml = '<div style="margin-bottom:14px;padding:12px;background:var(--bg-primary);border-radius:10px;border:1px solid var(--border-color);">' +
                '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:8px;">' +
                '<i class="fas fa-chart-bar" style="margin-right:4px;color:var(--brand-primary)"></i>Artistas que mais vende</div>' +
                artsArr.map(function(entry) {
                    var nome = entry[0]; var d = entry[1];
                    var pctBar = Math.round((d.shows / maxShows) * 100);
                    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
                        '<div style="width:100px;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0;">' + nome + '</div>' +
                        '<div style="flex:1;height:16px;background:var(--border-color);border-radius:8px;overflow:hidden;">' +
                            '<div style="height:100%;width:' + pctBar + '%;background:linear-gradient(90deg,#D4AF37,rgba(212,175,55,0.35));border-radius:8px;"></div>' +
                        '</div>' +
                        '<div style="font-size:11px;color:var(--text-muted);flex-shrink:0;min-width:80px;text-align:right;">' +
                            d.shows + 'x · ' + Utils.formatCurrency(d.valor) +
                        '</div>' +
                    '</div>';
                }).join('') +
            '</div>';

            var linhas = v.items.map(function(item) {
                var dtShow  = item.dataShow ? Utils.formatDate(item.dataShow) : '—';
                var stBadge = item.status === 'Pago'
                    ? '<span style="padding:2px 8px;border-radius:12px;background:rgba(34,197,94,.15);color:var(--success);font-size:11px;font-weight:600;">Pago</span>'
                    : '<span style="padding:2px 8px;border-radius:12px;background:rgba(245,158,11,.15);color:var(--warning);font-size:11px;font-weight:600;">Pendente</span>';
                var acoes;
                if (item.status === 'Pago') {
                    acoes = '<span style="color:var(--success);font-size:11px;"><i class="fas fa-check-circle"></i> ' + (item.dataPagamento ? Utils.formatDate(item.dataPagamento) : '') + '</span>';
                } else if (item.despesaId) {
                    acoes = '<div style="display:flex;gap:4px;flex-wrap:wrap;">' +
                        '<button onclick="Pages._pagarComissao(\'' + item.despesaId + '\',\'renderComissoesVendedores\')" style="padding:3px 9px;font-size:11px;border-radius:6px;border:1px solid var(--success);background:transparent;color:var(--success);cursor:pointer;white-space:nowrap;"><i class="fas fa-check"></i> Pagar</button>' +
                        '<button onclick="Pages._agendarComissao(\'' + item.despesaId + '\',\'renderComissoesVendedores\')" style="padding:3px 9px;font-size:11px;border-radius:6px;border:1px solid var(--brand-primary);background:transparent;color:var(--brand-primary);cursor:pointer;white-space:nowrap;"><i class="fas fa-calendar"></i> Agendar</button>' +
                        '</div>';
                } else {
                    acoes = '<span style="font-size:11px;color:var(--text-muted);">Sincronizando...</span>';
                }
                return '<tr style="font-size:13px;border-bottom:1px solid var(--border-color);">' +
                    '<td style="padding:8px 10px;white-space:nowrap;">' + dtShow + '</td>' +
                    '<td style="padding:8px 10px;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + item.artistaNome + (item.local ? ' <span style="font-size:11px;color:var(--text-muted);">· ' + item.local + '</span>' : '') + '</td>' +
                    '<td style="padding:8px 10px;font-weight:700;color:var(--brand-primary);white-space:nowrap;">' + Utils.formatCurrency(item.valor) + '</td>' +
                    '<td style="padding:8px 10px;">' + stBadge + '</td>' +
                    '<td style="padding:8px 10px;">' + acoes + '</td>' +
                    '</tr>';
            }).join('');

            return '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:14px;padding:18px 20px;margin-bottom:14px;">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:14px;">' +
                    '<div style="display:flex;align-items:center;gap:12px;">' +
                        '<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#D4AF37,rgba(212,175,55,.4));display:flex;align-items:center;justify-content:center;font-weight:800;color:#000;font-size:20px;flex-shrink:0;">' + v.nome.charAt(0).toUpperCase() + '</div>' +
                        '<div><div style="font-weight:700;font-size:16px;">' + v.nome + '</div>' +
                        '<div style="font-size:12px;color:var(--text-muted);">' + v.items.length + ' show(s) · ' + artsArr.length + ' artista(s)</div></div>' +
                    '</div>' +
                    '<div style="display:flex;gap:20px;flex-wrap:wrap;">' +
                        '<div style="text-align:center;"><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;margin-bottom:2px;">A Pagar</div><div style="font-size:18px;font-weight:800;color:' + cor + ';">' + Utils.formatCurrency(v.pendente) + '</div></div>' +
                        '<div style="text-align:center;"><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;margin-bottom:2px;">Pago</div><div style="font-size:18px;font-weight:800;color:var(--success);">' + Utils.formatCurrency(v.pago) + '</div></div>' +
                        '<div style="text-align:center;"><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;margin-bottom:2px;">Total</div><div style="font-size:18px;font-weight:800;">' + Utils.formatCurrency(v.total) + '</div></div>' +
                    '</div>' +
                '</div>' +
                '<div style="height:6px;background:var(--border-color);border-radius:3px;margin-bottom:14px;overflow:hidden;">' +
                    '<div style="height:100%;width:' + pct + '%;background:var(--success);border-radius:3px;transition:width .6s;"></div>' +
                '</div>' +
                rankingHtml +
                '<details style="cursor:pointer;">' +
                '<summary style="font-size:13px;font-weight:600;color:var(--text-muted);margin-bottom:8px;list-style:none;display:flex;align-items:center;gap:6px;">' +
                    '<i class="fas fa-chevron-right" style="font-size:10px;transition:transform .2s;"></i> Ver detalhes dos shows (' + v.items.length + ')' +
                '</summary>' +
                '<div style="overflow-x:auto;margin-top:10px;">' +
                '<table style="width:100%;border-collapse:collapse;">' +
                    '<thead><tr style="border-bottom:2px solid var(--border-color);">' +
                        '<th style="padding:6px 10px;text-align:left;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;white-space:nowrap;">Data Show</th>' +
                        '<th style="padding:6px 10px;text-align:left;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Artista / Local</th>' +
                        '<th style="padding:6px 10px;text-align:left;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;white-space:nowrap;">Comissão</th>' +
                        '<th style="padding:6px 10px;text-align:left;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Status</th>' +
                        '<th style="padding:6px 10px;text-align:left;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Ação</th>' +
                    '</tr></thead>' +
                    '<tbody>' + linhas + '</tbody>' +
                '</table></div>' +
                '</details>' +
            '</div>';
        }).join('');

        // Totais filtrados
        var ftPendente = itemsFiltrados.reduce(function(s,i){ return s+(i.status!=='Pago'?i.valor:0); }, 0);
        var ftPago     = itemsFiltrados.reduce(function(s,i){ return s+(i.status==='Pago'?i.valor:0); }, 0);
        var ftTotal    = itemsFiltrados.reduce(function(s,i){ return s+i.valor; }, 0);

        var html = `
        <div class="financeiro-container">
            <div class="page-header flex-between mb-3">
                <div>
                    <h2><i class="fas fa-user-tie" style="color:var(--brand-primary);margin-right:8px;"></i>Comissões de Vendedores</h2>
                    <p class="text-muted">${items.length} proposta(s) aceita(s) com comissão</p>
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <button class="btn-secondary" onclick="Pages.renderFinanceiro()">
                        <i class="fas fa-arrow-left"></i> Financeiro
                    </button>
                    <button class="btn-primary" onclick="Pages._registrarComissaoManual()">
                        <i class="fas fa-plus"></i> Registrar Manual
                    </button>
                </div>
            </div>

            <!-- KPIs -->
            <div class="grid grid-4 mb-3">
                <div class="stat-card">
                    <div class="stat-icon blue"><i class="fas fa-users"></i></div>
                    <div class="stat-content">
                        <h3>${todosVendedores.length}</h3>
                        <p>Vendedores Ativos</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon red"><i class="fas fa-clock"></i></div>
                    <div class="stat-content">
                        <h3 style="color:var(--warning);">${Utils.formatCurrency(gtPendente)}</h3>
                        <p>Total a Pagar</p>
                        <small class="text-muted">${items.filter(function(i){return i.status!=='Pago';}).length} pendente(s)</small>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
                    <div class="stat-content">
                        <h3 class="text-success">${Utils.formatCurrency(gtPago)}</h3>
                        <p>Total Pago</p>
                        <small class="text-muted">${items.filter(function(i){return i.status==='Pago';}).length} pago(s)</small>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:rgba(212,175,55,0.15);"><i class="fas fa-dollar-sign" style="color:var(--brand-primary);"></i></div>
                    <div class="stat-content">
                        <h3 style="color:var(--brand-primary);">${Utils.formatCurrency(gtTotal)}</h3>
                        <p>Total Geral</p>
                        <small class="text-muted">${items.length} comissão(ões)</small>
                    </div>
                </div>
            </div>

            <!-- Ranking geral -->
            ${rankGeralHtml}

            <!-- Filtro + Cards -->
            <div class="card">
                <div class="card-header flex-between">
                    <h3 class="card-title"><i class="fas fa-filter"></i> Por Vendedor</h3>
                    <select onchange="Pages.renderComissoesVendedores(this.value)"
                        style="padding:7px 12px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-secondary);color:var(--text-primary);font-size:13px;cursor:pointer;">
                        ${filtroOpts}
                    </select>
                </div>
                <div class="card-body">
                    ${lista.length > 0 ? cardsHtml + `
                    <div style="display:flex;gap:16px;flex-wrap:wrap;padding:14px 0 2px;border-top:1px solid var(--border-color);margin-top:4px;">
                        <div style="flex:1;min-width:110px;text-align:center;padding:10px 0;">
                            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">A Pagar</div>
                            <div style="font-size:20px;font-weight:800;color:var(--warning);">${Utils.formatCurrency(ftPendente)}</div>
                        </div>
                        <div style="flex:1;min-width:110px;text-align:center;padding:10px 0;">
                            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Pago</div>
                            <div style="font-size:20px;font-weight:800;color:var(--success);">${Utils.formatCurrency(ftPago)}</div>
                        </div>
                        <div style="flex:1;min-width:110px;text-align:center;padding:10px 0;">
                            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Total</div>
                            <div style="font-size:20px;font-weight:800;color:var(--brand-primary);">${Utils.formatCurrency(ftTotal)}</div>
                        </div>
                    </div>` : '<p class="text-muted" style="padding:20px;text-align:center;">Nenhum resultado para o filtro selecionado.</p>'}
                </div>
            </div>
        </div>`;

        document.getElementById('pageContent').innerHTML = html;

    } catch(e) {
        console.error('Erro renderComissoesVendedores:', e);
        document.getElementById('pageContent').innerHTML =
            '<div style="padding:40px;text-align:center;color:var(--danger);">Erro ao carregar comissões: ' + (e.message || e) + '</div>';
    }
};

/* ── Comissões de Vendedores (card inline no Financeiro) ─────────────────── */
Pages.carregarComissoesVendedores = async function(filtroVendedor) {
    const el = document.getElementById('comissoes-vendedor-body');
    if (!el) return;

    try {
        const escId = Auth.currentUser && Auth.currentUser.escritorio_id;

        // ── 1. Carregar dados em paralelo ─────────────────────────────────────
        var qProp = sbClient.from('propostas').select('*').eq('status', 'Aceita');
        if (escId) qProp = qProp.eq('escritorio_id', escId);

        var qEvt  = sbClient.from('eventos').select('id,artista_id,proposta_id,data,local,cidade');
        if (escId) qEvt = qEvt.eq('escritorio_id', escId);

        var qArt  = sbClient.from('artistas').select('id,nome');
        if (escId) qArt = qArt.eq('escritorio_id', escId);

        var qDesp = sbClient.from('despesas').select('*').eq('categoria', 'Comissão');
        if (escId) qDesp = qDesp.eq('escritorio_id', escId);

        var [rProp, rEvt, rArt, rDesp] = await Promise.all([qProp, qEvt, qArt, qDesp]);

        var propostasAceitas = (rProp.data || []).filter(function(p) {
            return parseFloat(p.vendedor_comissao_valor) > 0 &&
                   (p.vendedor_nome || p.vendedor_nome_fin);
        });
        var eventos  = rEvt.data  || [];
        var artistas = rArt.data  || [];
        var despesas = rDesp.data || [];

        // ── 2. Auto-sync: criar despesa para propostas sem despesa correspondente ──
        var syncPromises = [];
        propostasAceitas.forEach(function(p) {
            var evento = eventos.find(function(e) { return e.proposta_id === p.id; });
            if (!evento) return;
            var jaExiste = despesas.find(function(d) {
                return d.evento_id === evento.id && d.categoria === 'Comissão';
            });
            if (!jaExiste) {
                var nomeVend = p.vendedor_nome || p.vendedor_nome_fin || 'N/A';
                syncPromises.push(
                    sbClient.from('despesas').insert({
                        escritorio_id:   escId,
                        evento_id:       evento.id,
                        descricao:       'Comissão Vendedor – ' + nomeVend,
                        categoria:       'Comissão',
                        valor:           parseFloat(p.vendedor_comissao_valor),
                        data_vencimento: p.data_evento || null,
                        status:          'Pendente',
                        observacoes:     'Sincronizado automaticamente da proposta aceita.',
                    }).then(function(r) {
                        if (r.data && r.data[0]) despesas.push(r.data[0]);
                    }).catch(function(e2) { console.warn('sync comissão:', e2.message); })
                );
            }
        });
        if (syncPromises.length > 0) await Promise.all(syncPromises);

        // Recarregar despesas se houve sync
        if (syncPromises.length > 0) {
            var qDesp2 = sbClient.from('despesas').select('*').eq('categoria', 'Comissão');
            if (escId) qDesp2 = qDesp2.eq('escritorio_id', escId);
            var { data: dAtual } = await qDesp2;
            despesas = dAtual || [];
        }

        // ── 3. Montar itens unificados (proposta + evento + artista + despesa) ──
        var items = propostasAceitas.map(function(p) {
            var evento  = eventos.find(function(e) { return e.proposta_id === p.id; });
            var artista = evento ? artistas.find(function(a) { return a.id === evento.artista_id; }) : null;
            var despesa = evento ? despesas.find(function(d) {
                return d.evento_id === evento.id && d.categoria === 'Comissão';
            }) : null;
            return {
                proposta:       p,
                evento:         evento,
                artista:        artista,
                despesa:        despesa,
                vendedor:       p.vendedor_nome || p.vendedor_nome_fin || 'N/A',
                artistaNome:    artista ? artista.nome : '—',
                valor:          parseFloat(p.vendedor_comissao_valor) || 0,
                status:         despesa ? (despesa.status || 'Pendente') : 'Pendente',
                dataPagamento:  despesa ? despesa.data_pagamento : null,
                dataVencimento: despesa ? despesa.data_vencimento : (p.data_evento || null),
                despesaId:      despesa ? despesa.id : null,
                eventoId:       evento ? evento.id : null,
                dataShow:       p.data_evento || (evento ? evento.data : null),
                local:          evento ? (evento.local || evento.cidade || '') : '',
            };
        });

        // ── 4. Lista de vendedores únicos para filtro ────────────────────────
        var todosVendedores = [];
        items.forEach(function(i) { if (todosVendedores.indexOf(i.vendedor) === -1) todosVendedores.push(i.vendedor); });
        todosVendedores.sort();

        var filtroAtual = filtroVendedor || window._cmFiltroVendedor || '';
        window._cmFiltroVendedor = filtroAtual;

        var itemsFiltrados = filtroAtual ? items.filter(function(i) { return i.vendedor === filtroAtual; }) : items;

        // ── 5. Agrupar por vendedor ──────────────────────────────────────────
        var vendMap = {};
        itemsFiltrados.forEach(function(item) {
            if (!vendMap[item.vendedor]) {
                vendMap[item.vendedor] = {
                    nome: item.vendedor, items: [], pendente: 0, pago: 0, total: 0,
                    artistas: {}  // artistaNome → { shows: N, valor: R$ }
                };
            }
            var v = vendMap[item.vendedor];
            v.items.push(item);
            v.total += item.valor;
            if (item.status === 'Pago') v.pago += item.valor;
            else v.pendente += item.valor;
            // Ranking de artistas
            if (!v.artistas[item.artistaNome]) v.artistas[item.artistaNome] = { shows: 0, valor: 0 };
            v.artistas[item.artistaNome].shows++;
            v.artistas[item.artistaNome].valor += item.valor;
        });

        var lista = Object.values(vendMap).sort(function(a, b) { return b.pendente - a.pendente; });

        if (items.length === 0 && syncPromises.length === 0) {
            el.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0 16px;flex-wrap:wrap;gap:10px;">' +
                '<p class="text-muted" style="margin:0;">Nenhuma comissão encontrada. Propostas aceitas com comissão de vendedor aparecerão aqui automaticamente.</p>' +
                '<button onclick="Pages._registrarComissaoManual()" style="padding:7px 16px;font-size:12px;border:none;border-radius:8px;background:var(--brand-primary);color:#000;font-weight:600;cursor:pointer;">' +
                '<i class="fas fa-plus"></i> Registrar Manual</button></div>';
            return;
        }

        // ── 6. Filtro HTML ───────────────────────────────────────────────────
        var filtroOpts = '<option value="">Todos os Vendedores</option>' +
            todosVendedores.map(function(n) {
                return '<option value="' + n + '"' + (filtroAtual === n ? ' selected' : '') + '>' + n + '</option>';
            }).join('');

        var barraFiltro = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;">' +
            '<select onchange="Pages.carregarComissoesVendedores(this.value)" style="padding:7px 12px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-secondary);color:var(--text-primary);font-size:13px;cursor:pointer;">' +
            filtroOpts + '</select>' +
            '<span style="font-size:12px;color:var(--text-muted);">' + itemsFiltrados.length + ' comissão(ões)</span>' +
            '<div style="margin-left:auto;">' +
            '<button onclick="Pages._registrarComissaoManual()" style="padding:7px 14px;font-size:12px;border:none;border-radius:8px;background:var(--brand-primary);color:#000;font-weight:600;cursor:pointer;">' +
            '<i class="fas fa-plus"></i> Registrar Manual</button></div>' +
            '</div>';

        // ── 7. Cards por vendedor ────────────────────────────────────────────
        var cardsHtml = lista.map(function(v) {
            var pct = v.total > 0 ? Math.round(v.pago / v.total * 100) : 0;
            var cor = v.pendente === 0 ? 'var(--success)' : 'var(--warning)';

            // Ranking de artistas (mini barras inline)
            var artsArr = Object.entries(v.artistas).sort(function(a, b) { return b[1].shows - a[1].shows; });
            var maxShows = artsArr.length > 0 ? artsArr[0][1].shows : 1;
            var rankingHtml = '<div style="margin-bottom:14px;">' +
                '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:8px;">' +
                '<i class="fas fa-chart-bar" style="margin-right:4px;color:var(--brand-primary)"></i>Artistas mais vendidos</div>' +
                artsArr.map(function(entry) {
                    var nome = entry[0]; var d = entry[1];
                    var pctBar = Math.round((d.shows / maxShows) * 100);
                    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">' +
                        '<div style="width:90px;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0;">' + nome + '</div>' +
                        '<div style="flex:1;height:14px;background:var(--border-color);border-radius:7px;overflow:hidden;">' +
                            '<div style="height:100%;width:' + pctBar + '%;background:linear-gradient(90deg,var(--brand-primary),rgba(212,175,55,0.5));border-radius:7px;transition:width .4s;"></div>' +
                        '</div>' +
                        '<div style="font-size:11px;color:var(--text-muted);flex-shrink:0;min-width:60px;text-align:right;">' + d.shows + ' show' + (d.shows > 1 ? 's' : '') + ' · ' + Utils.formatCurrency(d.valor) + '</div>' +
                    '</div>';
                }).join('') +
                '</div>';

            // Linhas da tabela
            var linhas = v.items.map(function(item) {
                var dtShow   = item.dataShow ? Utils.formatDate(item.dataShow) : '—';
                var stBadge  = item.status === 'Pago'
                    ? '<span style="display:inline-block;padding:2px 8px;border-radius:12px;background:rgba(34,197,94,.15);color:var(--success);font-size:11px;font-weight:600;">Pago</span>'
                    : '<span style="display:inline-block;padding:2px 8px;border-radius:12px;background:rgba(245,158,11,.15);color:var(--warning);font-size:11px;font-weight:600;">Pendente</span>';
                var acoes;
                if (item.status === 'Pago') {
                    acoes = '<span style="color:var(--success);font-size:11px;"><i class="fas fa-check-circle"></i> ' + (item.dataPagamento ? Utils.formatDate(item.dataPagamento) : '') + '</span>';
                } else if (item.despesaId) {
                    acoes = '<div style="display:flex;gap:4px;flex-wrap:wrap;">' +
                        '<button onclick="Pages._pagarComissao(\'' + item.despesaId + '\')" style="padding:3px 9px;font-size:11px;border-radius:6px;border:1px solid var(--success);background:transparent;color:var(--success);cursor:pointer;white-space:nowrap;"><i class="fas fa-check"></i> Pagar</button>' +
                        '<button onclick="Pages._agendarComissao(\'' + item.despesaId + '\')" style="padding:3px 9px;font-size:11px;border-radius:6px;border:1px solid var(--brand-primary);background:transparent;color:var(--brand-primary);cursor:pointer;white-space:nowrap;"><i class="fas fa-calendar"></i> Agendar</button>' +
                        '</div>';
                } else {
                    acoes = '<span style="font-size:11px;color:var(--text-muted);">Aguardando sincronização...</span>';
                }
                return '<tr style="font-size:13px;border-bottom:1px solid var(--border-color);">' +
                    '<td style="padding:8px 10px;white-space:nowrap;">' + dtShow + '</td>' +
                    '<td style="padding:8px 10px;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + item.artistaNome + (item.local ? ' <span style="font-size:11px;color:var(--text-muted);">· ' + item.local + '</span>' : '') + '</td>' +
                    '<td style="padding:8px 10px;font-weight:700;color:var(--brand-primary);white-space:nowrap;">' + Utils.formatCurrency(item.valor) + '</td>' +
                    '<td style="padding:8px 10px;">' + stBadge + '</td>' +
                    '<td style="padding:8px 10px;">' + acoes + '</td>' +
                    '</tr>';
            }).join('');

            return '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:14px;padding:18px 20px;margin-bottom:14px;">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:14px;">' +
                    '<div style="display:flex;align-items:center;gap:12px;">' +
                        '<div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#D4AF37,rgba(212,175,55,0.45));display:flex;align-items:center;justify-content:center;font-weight:800;color:#000;font-size:18px;flex-shrink:0;">' + v.nome.charAt(0).toUpperCase() + '</div>' +
                        '<div>' +
                            '<div style="font-weight:700;font-size:15px;">' + v.nome + '</div>' +
                            '<div style="font-size:12px;color:var(--text-muted);">' + v.items.length + ' show(s) · ' + artsArr.length + ' artista(s)</div>' +
                        '</div>' +
                    '</div>' +
                    '<div style="display:flex;gap:20px;flex-wrap:wrap;">' +
                        '<div style="text-align:center;">' +
                            '<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">A Pagar</div>' +
                            '<div style="font-size:18px;font-weight:800;color:' + cor + ';">' + Utils.formatCurrency(v.pendente) + '</div>' +
                        '</div>' +
                        '<div style="text-align:center;">' +
                            '<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">Pago</div>' +
                            '<div style="font-size:18px;font-weight:800;color:var(--success);">' + Utils.formatCurrency(v.pago) + '</div>' +
                        '</div>' +
                        '<div style="text-align:center;">' +
                            '<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">Total</div>' +
                            '<div style="font-size:18px;font-weight:800;">' + Utils.formatCurrency(v.total) + '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div style="height:6px;background:var(--border-color);border-radius:3px;margin-bottom:14px;overflow:hidden;">' +
                    '<div style="height:100%;width:' + pct + '%;background:var(--success);border-radius:3px;transition:width .6s;"></div>' +
                '</div>' +
                rankingHtml +
                '<div style="overflow-x:auto;">' +
                '<table style="width:100%;border-collapse:collapse;">' +
                    '<thead><tr style="border-bottom:2px solid var(--border-color);">' +
                        '<th style="padding:6px 10px;text-align:left;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;white-space:nowrap;">Data Show</th>' +
                        '<th style="padding:6px 10px;text-align:left;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Artista / Local</th>' +
                        '<th style="padding:6px 10px;text-align:left;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;white-space:nowrap;">Comissão</th>' +
                        '<th style="padding:6px 10px;text-align:left;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Status</th>' +
                        '<th style="padding:6px 10px;text-align:left;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Ação</th>' +
                    '</tr></thead>' +
                    '<tbody>' + linhas + '</tbody>' +
                '</table></div>' +
            '</div>';
        }).join('');

        // ── 8. Rodapé de totais gerais ───────────────────────────────────────
        var gtPendente = itemsFiltrados.reduce(function(s,i){ return s + (i.status !== 'Pago' ? i.valor : 0); }, 0);
        var gtPago     = itemsFiltrados.reduce(function(s,i){ return s + (i.status === 'Pago' ? i.valor : 0); }, 0);
        var gtTotal    = itemsFiltrados.reduce(function(s,i){ return s + i.valor; }, 0);

        var footerHtml = '<div style="display:flex;gap:16px;flex-wrap:wrap;padding:14px 0 2px;border-top:1px solid var(--border-color);margin-top:4px;">' +
            '<div style="flex:1;min-width:110px;text-align:center;padding:10px 0;">' +
                '<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Total a Pagar</div>' +
                '<div style="font-size:20px;font-weight:800;color:var(--warning);">' + Utils.formatCurrency(gtPendente) + '</div>' +
            '</div>' +
            '<div style="flex:1;min-width:110px;text-align:center;padding:10px 0;">' +
                '<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Total Pago</div>' +
                '<div style="font-size:20px;font-weight:800;color:var(--success);">' + Utils.formatCurrency(gtPago) + '</div>' +
            '</div>' +
            '<div style="flex:1;min-width:110px;text-align:center;padding:10px 0;">' +
                '<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Total Geral</div>' +
                '<div style="font-size:20px;font-weight:800;color:var(--brand-primary);">' + Utils.formatCurrency(gtTotal) + '</div>' +
            '</div>' +
        '</div>';

        el.innerHTML = barraFiltro + (lista.length > 0 ? cardsHtml + footerHtml
            : '<p class="text-muted" style="padding:20px 0;text-align:center;">Nenhum resultado para o filtro selecionado.</p>');

    } catch(e) {
        console.error('Erro comissões vendedores:', e);
        el.innerHTML = '<p class="text-muted" style="padding:8px 0;">Erro ao carregar comissões: ' + (e.message || e) + '</p>';
    }
};

Pages._pagarComissao = function(despesaId, paginaCallback) {
    var hoje = new Date().toISOString().split('T')[0];
    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);z-index:10000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = '<div style="background:var(--bg-primary);border-radius:16px;padding:24px;width:320px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,.5);">' +
        '<h3 style="margin:0 0 16px;font-size:16px;"><i class="fas fa-check-circle" style="color:var(--success)"></i> Confirmar Pagamento</h3>' +
        '<div style="margin-bottom:16px;">' +
            '<label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;">Data do Pagamento</label>' +
            '<input type="date" id="_pagarDataInput" value="' + hoje + '" style="width:100%;padding:10px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-secondary);color:var(--text-primary);font-size:14px;box-sizing:border-box;">' +
        '</div>' +
        '<div style="display:flex;gap:8px;">' +
            '<button id="_pagarCancelar" style="flex:1;padding:10px;border:1px solid var(--border-color);border-radius:8px;background:transparent;color:var(--text-secondary);cursor:pointer;font-size:13px;">Cancelar</button>' +
            '<button id="_pagarConfirmar" style="flex:1;padding:10px;border:none;border-radius:8px;background:var(--success);color:#fff;font-weight:600;cursor:pointer;font-size:13px;"><i class="fas fa-check"></i> Confirmar</button>' +
        '</div>' +
    '</div>';
    document.body.appendChild(modal);

    modal.querySelector('#_pagarCancelar').onclick = function() { document.body.removeChild(modal); };
    modal.querySelector('#_pagarConfirmar').onclick = async function() {
        var data = modal.querySelector('#_pagarDataInput').value;
        document.body.removeChild(modal);
        if (!data) return;
        Utils.showLoading();
        try {
            var res = await sbClient.from('despesas').update({ status: 'Pago', data_pagamento: data }).eq('id', despesaId);
            if (res.error) throw res.error;
            Utils.hideLoading();
            Utils.showToast('Comissão marcada como paga!', 'success');
            // Recarrega a página correta
            if (paginaCallback && typeof Pages[paginaCallback] === 'function') Pages[paginaCallback]();
            else Pages.carregarComissoesVendedores();
        } catch(e) {
            Utils.hideLoading();
            Utils.showToast('Erro: ' + (e.message || e), 'error');
        }
    };
};

Pages._agendarComissao = function(despesaId, paginaCallback) {
    var proxSemana = new Date();
    proxSemana.setDate(proxSemana.getDate() + 7);
    var defaultDate = proxSemana.toISOString().split('T')[0];

    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);z-index:10000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = '<div style="background:var(--bg-primary);border-radius:16px;padding:24px;width:320px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,.5);">' +
        '<h3 style="margin:0 0 8px;font-size:16px;"><i class="fas fa-calendar-alt" style="color:var(--brand-primary)"></i> Programar Pagamento</h3>' +
        '<p style="font-size:12px;color:var(--text-muted);margin:0 0 16px;">Define uma data prevista para pagar esta comissão. O status continua Pendente.</p>' +
        '<div style="margin-bottom:16px;">' +
            '<label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;">Data Prevista</label>' +
            '<input type="date" id="_agendarDataInput" value="' + defaultDate + '" style="width:100%;padding:10px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-secondary);color:var(--text-primary);font-size:14px;box-sizing:border-box;">' +
        '</div>' +
        '<div style="display:flex;gap:8px;">' +
            '<button id="_agendarCancelar" style="flex:1;padding:10px;border:1px solid var(--border-color);border-radius:8px;background:transparent;color:var(--text-secondary);cursor:pointer;font-size:13px;">Cancelar</button>' +
            '<button id="_agendarConfirmar" style="flex:1;padding:10px;border:none;border-radius:8px;background:var(--brand-primary);color:#000;font-weight:600;cursor:pointer;font-size:13px;"><i class="fas fa-calendar-check"></i> Programar</button>' +
        '</div>' +
    '</div>';
    document.body.appendChild(modal);

    modal.querySelector('#_agendarCancelar').onclick = function() { document.body.removeChild(modal); };
    modal.querySelector('#_agendarConfirmar').onclick = async function() {
        var data = modal.querySelector('#_agendarDataInput').value;
        document.body.removeChild(modal);
        if (!data) return;
        Utils.showLoading();
        try {
            var res = await sbClient.from('despesas').update({ data_vencimento: data }).eq('id', despesaId);
            if (res.error) throw res.error;
            Utils.hideLoading();
            Utils.showToast('Pagamento programado para ' + Utils.formatDate(data), 'success');
            if (paginaCallback && typeof Pages[paginaCallback] === 'function') Pages[paginaCallback]();
            else Pages.carregarComissoesVendedores();
        } catch(e) {
            Utils.hideLoading();
            Utils.showToast('Erro: ' + (e.message || e), 'error');
        }
    };
};

Pages._registrarComissaoManual = async function() {
    var escId = Auth.currentUser && Auth.currentUser.escritorio_id;
    var vendedores = [];
    try {
        var q = sbClient.from('usuarios').select('id,nome').eq('nivel', 'Vendedor');
        if (escId) q = q.eq('escritorio_id', escId);
        var { data: vData } = await q;
        vendedores = vData || [];
    } catch(e) {}

    var vendOptions = vendedores.map(function(v) {
        return '<option value="' + v.nome + '">' + v.nome + '</option>';
    }).join('');

    var hoje = new Date().toISOString().split('T')[0];
    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);z-index:10000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = '<div style="background:var(--bg-primary);border-radius:16px;padding:24px;width:400px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,.5);">' +
        '<h3 style="margin:0 0 16px;font-size:16px;"><i class="fas fa-user-tie" style="color:var(--brand-primary)"></i> Registrar Comissão de Vendedor</h3>' +
        '<div style="margin-bottom:12px;">' +
            '<label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px;">Vendedor *</label>' +
            (vendedores.length > 0
                ? '<select id="_cmVendedorSel" style="width:100%;padding:10px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-secondary);color:var(--text-primary);font-size:14px;box-sizing:border-box;">' +
                  '<option value="">Selecionar...</option>' + vendOptions + '<option value="__outro__">Outro (digitar)</option>' +
                  '</select>'
                : '<input type="text" id="_cmVendedorText" placeholder="Nome do vendedor" style="width:100%;padding:10px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-secondary);color:var(--text-primary);font-size:14px;box-sizing:border-box;">') +
        '</div>' +
        '<div id="_cmOutroDiv" style="display:none;margin-bottom:12px;">' +
            '<label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px;">Nome do Vendedor</label>' +
            '<input type="text" id="_cmVendedorCustom" placeholder="Digite o nome" style="width:100%;padding:10px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-secondary);color:var(--text-primary);font-size:14px;box-sizing:border-box;">' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">' +
            '<div>' +
                '<label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px;">Valor (R$) *</label>' +
                '<input type="number" id="_cmValor" min="0" step="0.01" placeholder="0,00" style="width:100%;padding:10px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-secondary);color:var(--text-primary);font-size:14px;box-sizing:border-box;">' +
            '</div>' +
            '<div>' +
                '<label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px;">Data Vencimento</label>' +
                '<input type="date" id="_cmVencimento" value="' + hoje + '" style="width:100%;padding:10px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-secondary);color:var(--text-primary);font-size:14px;box-sizing:border-box;">' +
            '</div>' +
        '</div>' +
        '<div style="margin-bottom:16px;">' +
            '<label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px;">Show / Evento (opcional)</label>' +
            '<input type="text" id="_cmDescricao" placeholder="Ex: Show em São Paulo – 15/07/2026" style="width:100%;padding:10px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-secondary);color:var(--text-primary);font-size:14px;box-sizing:border-box;">' +
        '</div>' +
        '<div style="display:flex;gap:8px;">' +
            '<button id="_cmCancelar" style="flex:1;padding:10px;border:1px solid var(--border-color);border-radius:8px;background:transparent;color:var(--text-secondary);cursor:pointer;font-size:13px;">Cancelar</button>' +
            '<button id="_cmSalvar" style="flex:1;padding:10px;border:none;border-radius:8px;background:var(--brand-primary);color:#000;font-weight:600;cursor:pointer;font-size:13px;"><i class="fas fa-save"></i> Salvar</button>' +
        '</div>' +
    '</div>';
    document.body.appendChild(modal);

    var sel = modal.querySelector('#_cmVendedorSel');
    if (sel) {
        sel.onchange = function() {
            modal.querySelector('#_cmOutroDiv').style.display = (this.value === '__outro__') ? 'block' : 'none';
        };
    }

    modal.querySelector('#_cmCancelar').onclick = function() { document.body.removeChild(modal); };
    modal.querySelector('#_cmSalvar').onclick = async function() {
        var nomeVendedor = '';
        var selEl = modal.querySelector('#_cmVendedorSel');
        var textEl = modal.querySelector('#_cmVendedorText');
        if (selEl) {
            nomeVendedor = selEl.value === '__outro__'
                ? (modal.querySelector('#_cmVendedorCustom')?.value?.trim() || '')
                : selEl.value;
        } else if (textEl) {
            nomeVendedor = textEl.value.trim();
        }
        var valor     = parseFloat(modal.querySelector('#_cmValor')?.value) || 0;
        var vencimento = modal.querySelector('#_cmVencimento')?.value || null;
        var descBase  = modal.querySelector('#_cmDescricao')?.value?.trim() || '';

        if (!nomeVendedor || valor <= 0) {
            Utils.showToast('Informe o vendedor e o valor.', 'error');
            return;
        }
        var descricao = 'Comissão Vendedor – ' + nomeVendedor + (descBase ? ' (' + descBase + ')' : '');
        document.body.removeChild(modal);
        Utils.showLoading();
        try {
            await DespesasDB.criar({
                descricao:        descricao,
                categoria:        'Comissão',
                valor:            valor,
                data_vencimento:  vencimento || null,
                status:           'Pendente',
            });
            Utils.hideLoading();
            Utils.showToast('Comissão registrada com sucesso!', 'success');
            Pages.carregarComissoesVendedores();
        } catch(e) {
            Utils.hideLoading();
            Utils.showToast('Erro ao salvar: ' + (e.message || e), 'error');
        }
    };
};

Pages.confirmarLancamentoParcela = async function(eventoId, numero, descricao, valor, dataVenc, uid) {
    const dtReceb  = document.getElementById(`${uid}_dtreceb`)?.value  || null;
    const vlrReceb = parseFloat(document.getElementById(`${uid}_vlrreceb`)?.value) || parseFloat(valor);
    const forma    = document.getElementById(`${uid}_forma`)?.value    || null;
    const origem   = document.getElementById(`${uid}_origem`)?.value   || null;
    const inst     = document.getElementById(`${uid}_inst`)?.value     || null;

    const ok = await Utils.confirm(`Confirmar recebimento de ${Utils.formatCurrency(vlrReceb)} para "${descricao}"?`);
    if (!ok) return;

    Utils.showLoading();
    try {
        await ParcelasDB.criar({
            evento_id:        eventoId,
            numero_parcela:   numero,
            valor:            parseFloat(valor),
            valor_recebido:   vlrReceb,
            data_vencimento:  dataVenc || null,
            data_recebimento: dtReceb  || null,
            forma_pagamento:  forma,
            origem:           origem,
            instituicao:      inst,
            status:           'Pago',
            descricao:        descricao,
        });
        Utils.hideLoading();
        Utils.showToast(`✅ "${descricao}" confirmada no Financeiro!`, 'success');
        Pages.carregarRecebimentosAConfirmar();
    } catch(e) {
        Utils.hideLoading();
        Utils.showToast('Erro ao confirmar: ' + e.message, 'error');
    }
};

Pages._filtrarRecebimentos = function(cidade, btnEl) {
    // Atualizar chip ativo
    document.querySelectorAll('.rec-city-chip').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    // Re-renderizar blocos
    const container = document.getElementById('rec-blocos-container');
    if (container && window._buildRecBlocos) {
        container.innerHTML = window._buildRecBlocos(cidade || null);
    }
};

Pages._exportarRecebimentosPDF = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Detectar filtro ativo
    const chipAtivo = document.querySelector('.rec-city-chip.active');
    const cidadeFiltro = chipAtivo?.dataset?.city || null;
    const { itens, artistas, todasParcelas } = window._recebimentosData || {};
    if (!itens) return;

    const itensFiltrados = cidadeFiltro
        ? itens.filter(it => (it.evento.cidade || it.evento.estado || '') === cidadeFiltro)
        : itens;

    const dataExport = new Date().toLocaleDateString('pt-BR');
    const titulo = cidadeFiltro ? `Recebimentos — ${cidadeFiltro}` : 'Recebimentos a Confirmar — Todas as Cidades';

    // Paleta Gibson
    const COR_OURO   = [212, 175, 55];
    const COR_PRETO  = [11,  10,  13];
    const COR_VERM   = [224, 32,  27];
    const COR_BRANCO = [255, 255, 255];
    const COR_VERDE  = [34,  197, 94];
    const COR_CINZA1 = [245, 245, 245];
    const COR_CINZA2 = [255, 255, 255];
    const COR_HDRFG  = [30,  30,  46];

    const addPageHeader = () => {
        // Faixa vermelha do cabeçalho principal
        doc.setFillColor(...COR_VERM);
        doc.rect(0, 0, 297, 20, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(...COR_BRANCO);
        doc.text('GIBSON MANAGER', 8, 9);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(titulo, 8, 16);
        doc.setFontSize(9);
        doc.setTextColor(255, 220, 220);
        doc.text(`Gerado em: ${dataExport}`, 289, 16, { align: 'right' });
    };

    addPageHeader();
    let startY = 25;
    let paginaAtual = 1;

    for (const { evento, proposta, cronograma } of itensFiltrados) {
        const artista     = artistas.find(a => a.id === evento.artista_id);
        const parcelasEv  = todasParcelas.filter(p => p.evento_id === evento.id);
        const cacheBruto  = proposta.cache_bruto || 0;
        const cidade      = evento.cidade || evento.estado || '—';
        const nomeArtista = artista?.nome || '—';
        const dataShow    = evento.data ? new Date(evento.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
        const responsavel = proposta.contratante_nome || evento.contratante || proposta.nome_contratante || '—';
        const local       = evento.local || '—';

        // Nova página se necessário (reserva 55mm para tabela + rodapé)
        if (startY > 160) {
            doc.addPage();
            paginaAtual++;
            addPageHeader();
            startY = 25;
        }

        // ── Faixa branca do show ──────────────────────────────────
        doc.setFillColor(255, 255, 255);
        doc.rect(0, startY, 297, 16, 'F');
        // Borda vermelha lateral esquerda
        doc.setFillColor(...COR_VERM);
        doc.rect(0, startY, 4, 16, 'F');

        // Linha 1: SHOW nome + data + valor
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...COR_VERM);
        doc.text(`SHOW: ${nomeArtista}`, 14, startY + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...COR_PRETO);
        doc.text(`Data: ${dataShow}`, 88, startY + 6);
        doc.text(`Cachê: ${Utils.formatCurrency(cacheBruto)}`, 130, startY + 6);
        doc.text(`Cidade: ${cidade}`, 178, startY + 6);
        doc.text(`Resp.: ${responsavel}`, 222, startY + 6);

        // Linha 2: local
        doc.setFontSize(8.5);
        doc.setTextColor(80, 80, 80);
        doc.text(`Local: ${local}`, 14, startY + 13);

        startY += 18;

        // ── Tabela de parcelas ──────────────────────────────────────
        const tableRows = cronograma.map((item, idx) => {
            const numero = item.numero || (idx + 1);
            const valor  = item.valor !== undefined ? item.valor : parseFloat((cacheBruto * (item.pct || 100) / 100).toFixed(2));
            let dataVenc = item.data_vencimento;
            if (!dataVenc && item.dias_antes_show !== undefined && evento.data) {
                const d = new Date(evento.data + 'T12:00:00');
                d.setDate(d.getDate() + (item.dias_antes_show || 0));
                dataVenc = d.toISOString().split('T')[0];
            }
            const parc = parcelasEv.find(p => p.numero_parcela === numero);
            const statusTxt = parc ? 'Lançado' : 'Pendente';
            return [
                Utils.formatCurrency(valor),
                dataVenc ? new Date(dataVenc + 'T12:00:00').toLocaleDateString('pt-BR') : '—',
                parc?.data_recebimento ? new Date(parc.data_recebimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—',
                parc?.valor_recebido   ? Utils.formatCurrency(parc.valor_recebido) : '—',
                parc?.forma_pagamento  || '—',
                parc?.origem           || '—',
                parc?.instituicao      || '—',
                statusTxt
            ];
        });

        const totalAReceber = cronograma.reduce((s, item) => {
            return s + (item.valor !== undefined ? item.valor : parseFloat((cacheBruto * (item.pct || 100) / 100).toFixed(2)));
        }, 0);
        const totalRecebido = parcelasEv.filter(p => p.status === 'Pago').reduce((s, p) => s + (parseFloat(p.valor_recebido || p.valor) || 0), 0);
        const faltam = totalAReceber - totalRecebido;

        doc.autoTable({
            startY,
            head: [['Valor a Receber','Data a Receber','Data Recebimento','Valor Recebido','Forma Pgto','Origem','Instituição','Status']],
            body: tableRows,
            foot: [
                [
                    { content: 'TOTAL A RECEBER', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', textColor: [60,60,60] } },
                    { content: Utils.formatCurrency(totalAReceber), colSpan: 4, styles: { halign: 'center', textColor: COR_VERM, fontStyle: 'bold', fontSize: 9 } },
                    { content: '' }
                ],
                [
                    { content: 'TOTAL RECEBIDO', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', textColor: [60,60,60] } },
                    { content: Utils.formatCurrency(totalRecebido), colSpan: 4, styles: { halign: 'center', textColor: COR_VERDE, fontStyle: 'bold', fontSize: 9 } },
                    { content: '' }
                ],
                [
                    { content: 'FALTAM', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', textColor: [60,60,60] } },
                    { content: Utils.formatCurrency(faltam), colSpan: 4, styles: { halign: 'center', textColor: faltam > 0 ? COR_VERM : COR_VERDE, fontStyle: 'bold', fontSize: 10 } },
                    { content: '' }
                ]
            ],
            theme: 'grid',
            headStyles: {
                fillColor: COR_HDRFG,
                textColor: COR_BRANCO,
                fontStyle: 'bold',
                fontSize: 8.5,
                cellPadding: 3,
                halign: 'center'
            },
            bodyStyles: {
                fontSize: 9,
                textColor: [40, 40, 40],
                cellPadding: 3
            },
            footStyles: {
                fillColor: [235, 235, 235],
                fontSize: 8.5,
                cellPadding: 3.5,
                fontStyle: 'bold'
            },
            alternateRowStyles: { fillColor: COR_CINZA1 },
            rowStyles: { fillColor: COR_CINZA2 },
            // Total colunas: 33+26+29+29+23+38+38+23 = 239mm
            // Margem left 8 + right 8 = 281mm disponíveis → autoTable distribui o restante
            columnStyles: {
                0: { cellWidth: 33, halign: 'right'  },  // Valor a Receber
                1: { cellWidth: 26, halign: 'center' },  // Data a Receber
                2: { cellWidth: 29, halign: 'center' },  // Data Recebimento
                3: { cellWidth: 29, halign: 'right'  },  // Valor Recebido
                4: { cellWidth: 23, halign: 'center' },  // Forma Pgto
                5: { cellWidth: 'auto', halign: 'left'   },  // Origem  (expansível)
                6: { cellWidth: 'auto', halign: 'left'   },  // Instituição (expansível)
                7: { cellWidth: 23, halign: 'center' }   // Status
            },
            tableWidth: 'auto',
            margin: { left: 8, right: 8 },
            didParseCell: (data) => {
                // Colorir status na tabela
                if (data.section === 'body' && data.column.index === 7) {
                    const v = data.cell.raw;
                    if (v === 'Lançado')  { data.cell.styles.textColor = COR_VERDE; data.cell.styles.fontStyle = 'bold'; }
                    if (v === 'Pendente') { data.cell.styles.textColor = [180, 120, 0]; }
                }
            },
            didDrawPage: () => { }
        });

        startY = doc.lastAutoTable.finalY + 14;
    }

    // Rodapé em todas as páginas
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.5);
        doc.line(8, 203, 289, 203);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.setFont('helvetica', 'normal');
        doc.text('Gibson Manager — Gestão Artística Profissional', 8, 207);
        doc.text(`Página ${i} de ${totalPages}`, 289, 207, { align: 'right' });
    }

    const fileName = cidadeFiltro
        ? `recebimentos-${cidadeFiltro.toLowerCase().replace(/\s+/g,'-')}-${dataExport.replace(/\//g,'-')}.pdf`
        : `recebimentos-todas-cidades-${dataExport.replace(/\//g,'-')}.pdf`;
    doc.save(fileName);
};

Pages.gerarDespesaModeloFinanceiro = async function(modeloId) {
    Utils.showLoading();
    const r = await ModelosDespesaDB.gerarDespesaDoMes(modeloId);
    Utils.hideLoading();
    if (r) {
        Utils.showToast('Despesa gerada com sucesso! Você pode editá-la em Gestão Financeira.', 'success');
    } else {
        Utils.showToast('Erro ao gerar despesa (talvez já exista para este mês).', 'error');
    }
};

Pages.deletarModeloFinanceiro = async function(id) {
    if (!await Utils.confirm('Remover este modelo de despesa recorrente?')) return;
    Utils.showLoading();
    await ModelosDespesaDB.deletar(id);
    Utils.hideLoading();
    Utils.showToast('Modelo removido.', 'success');
    Pages.renderFinanceiro();
};

Pages.renderFinanceiroSearch = async function(parcelas) {
    const html = `
        <div class="financeiro-container fade-in">
            <div class="page-header flex-between mb-3">
                <div>
                    <h2>Resultados da Busca</h2>
                    <p class="text-muted">${parcelas.length} parcela(s) encontrada(s)</p>
                </div>
                <button class="btn-secondary" onclick="Pages.renderFinanceiro()">
                    <i class="fas fa-arrow-left"></i> Voltar
                </button>
            </div>
            <div class="card">
                <div class="card-body">
                    ${await this.renderParcelasTable(parcelas)}
                </div>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = html;
};

Pages.renderParcelasTable = async function(parcelas) {
    if (parcelas.length === 0) {
        return '<p class="text-muted">Nenhuma parcela cadastrada.</p>';
    }

    // Buscar dados dos eventos
    const parcelasComDados = [];
    for (const parcela of parcelas) {
        const evento = await EventosDB.buscarPorId(parcela.evento_id);
        const artista = evento ? await ArtistasDB.buscarPorId(evento.artista_id) : null;
        parcelasComDados.push({
            ...parcela,
            evento,
            artista
        });
    }

    // Ordenar por data de vencimento
    parcelasComDados.sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));

    return `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Evento</th>
                        <th>Artista</th>
                        <th>Parcela</th>
                        <th>Valor</th>
                        <th>Vencimento</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${parcelasComDados.map(p => {
                        const isAtrasada = p.status === 'Pendente' && Utils.isOverdue(p.data_vencimento);
                        const statusClass = p.status === 'Pago' ? 'success' : isAtrasada ? 'danger' : 'warning';
                        const statusText = p.status === 'Pago' ? 'Pago' : isAtrasada ? 'Atrasado' : 'Pendente';
                        
                        return `
                            <tr>
                                <td>${p.evento ? p.evento.local : '-'}</td>
                                <td>${p.artista ? p.artista.nome : '-'}</td>
                                <td>${p.numero_parcela}ª parcela</td>
                                <td><strong>${Utils.formatCurrency(p.valor)}</strong></td>
                                <td>${Utils.formatDate(p.data_vencimento)}</td>
                                <td>
                                    <span class="badge badge-${statusClass}">${statusText}</span>
                                </td>
                                <td>
                                    ${p.status === 'Pendente' && Auth.canEdit('parcelas') ? `
                                        <button class="btn-primary btn-sm" onclick="Pages.marcarParcelaPaga('${p.id}')">
                                            <i class="fas fa-check"></i> Marcar Pago
                                        </button>
                                    ` : p.status === 'Pago' ? `
                                        <small class="text-muted">Pago em ${Utils.formatDate(p.data_pagamento)}</small>
                                    ` : ''}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
};

Pages.marcarParcelaPaga = async function(parcelaId) {
    const confirmed = await Utils.confirm('Confirmar pagamento desta parcela?');
    if (!confirmed) return;

    Utils.showLoading();
    const result = await ParcelasDB.marcarPaga(parcelaId);
    Utils.hideLoading();

    if (result) {
        Utils.showToast('Parcela marcada como paga!', 'success');
        this.renderFinanceiro();
    } else {
        Utils.showToast('Erro ao marcar parcela', 'error');
    }
};

Pages.renderFluxoCaixaChart = async function(mes, ano) {
    const canvas = document.getElementById('fluxoCaixaChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Dados dos últimos 6 meses
    const meses = [];
    const lucros = [];

    for (let i = 5; i >= 0; i--) {
        const m = mes - i;
        const a = m < 0 ? ano - 1 : ano;
        const mesAtual = m < 0 ? 12 + m : m;
        
        meses.push(Utils.getMonthName(mesAtual).substring(0, 3));
        
        const totais = await Utils.calcularTotaisMes(mesAtual, a);
        lucros.push(totais.lucro);
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [{
                label: 'Lucro Líquido',
                data: lucros,
                backgroundColor: lucros.map(l => l >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'),
                borderColor: lucros.map(l => l >= 0 ? '#10B981' : '#EF4444'),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#A0A0A0' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#A0A0A0',
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
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
};

Pages.renderEquipe = async function() {
    let equipe = await EquipeDB.listar();
    
    // Filtrar por termo de busca
    if (Pages.currentSearchTerm) {
        equipe = equipe.filter(m => 
            (m.nome || '').toLowerCase().includes(Pages.currentSearchTerm) ||
            (m.funcao || '').toLowerCase().includes(Pages.currentSearchTerm) ||
            (m.email || '').toLowerCase().includes(Pages.currentSearchTerm)
        );
    }

    // Agrupar por artista
    const equipePorArtista = {};
    for (const membro of equipe) {
        if (!equipePorArtista[membro.artista_id]) {
            equipePorArtista[membro.artista_id] = [];
        }
        equipePorArtista[membro.artista_id].push(membro);
    }

    const html = `
        <div class="equipe-container">
            <div class="page-header flex-between mb-3">
                <div>
                    <h2>Equipe</h2>
                    <p class="text-muted">${equipe.length} membro(s) cadastrado(s)</p>
                </div>
                <button class="btn-primary" onclick="Modals.showEquipeModal()">
                    <i class="fas fa-plus"></i> Novo Membro
                </button>
            </div>

            ${Object.keys(equipePorArtista).length > 0 ? `
                ${await Promise.all(Object.keys(equipePorArtista).map(async (artistaId) => {
                    const artista = await ArtistasDB.buscarPorId(artistaId);
                    const membros = equipePorArtista[artistaId];
                    
                    return `
                        <div class="card mb-3">
                            <div class="card-header flex-between">
                                <h3 class="card-title">
                                    <i class="fas fa-microphone"></i> ${artista ? artista.nome : 'Artista não encontrado'}
                                </h3>
                                ${Auth.canEdit('equipe', artistaId) ? `
                                    <button class="btn-primary btn-sm" onclick="Modals.showEquipeModal(null, '${artistaId}')">
                                        <i class="fas fa-plus"></i> Adicionar
                                    </button>
                                ` : ''}
                            </div>
                            <div class="card-body">
                                <div class="grid grid-2">
                                    ${membros.map(m => `
                                        <div style="padding: 16px; background: var(--bg-secondary); border-radius: 8px; border-left: 3px solid var(--red-primary);">
                                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                                                <div>
                                                    <h4 style="margin: 0 0 4px; font-size: 16px;">${m.nome}</h4>
                                                    <span class="badge badge-info">${m.funcao}</span>
                                                </div>
                                                ${Auth.canEdit('equipe', artistaId) ? `
                                                    <div style="display:flex;gap:4px;">
                                                        <button class="btn-secondary btn-sm" onclick="Modals.showEquipeModal('${m.id}')" title="Editar">
                                                            <i class="fas fa-edit"></i>
                                                        </button>
                                                        <button class="btn-secondary btn-sm" onclick="Pages.deletarMembroEquipe('${m.id}', '${artistaId}')" style="color:var(--danger);" title="Excluir">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                ` : ''}
                                            </div>
                                            <div style="font-size: 13px; color: var(--text-secondary);">
                                                <p style="margin: 4px 0;">
                                                    <i class="fas fa-id-card"></i> ${Utils.formatCPF(m.cpf)}
                                                </p>
                                                <p style="margin: 4px 0;">
                                                    <i class="fas fa-phone"></i> ${Utils.formatPhone(m.telefone)}
                                                    <a href="${Utils.generateWhatsAppLink(m.telefone, `Olá ${m.nome}, tudo bem?`)}" 
                                                       target="_blank" class="text-success ml-1">
                                                        <i class="fab fa-whatsapp"></i>
                                                    </a>
                                                </p>
                                                <p style="margin: 4px 0;">
                                                    <i class="fas fa-envelope"></i> ${m.email}
                                                </p>
                                                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);">
                                                    <strong>Vínculo:</strong> ${m.tipo_vinculo}<br>
                                                    ${m.valor_fixo ? `<strong>Valor:</strong> ${Utils.formatCurrency(m.valor_fixo)}` : ''}
                                                    ${m.percentual ? `<strong>Percentual:</strong> ${m.percentual}%` : ''}
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    `;
                })).then(results => results.join(''))}
            ` : `
                <div class="card text-center" style="padding: 60px;">
                    <i class="fas fa-users" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--text-secondary);">Nenhum membro de equipe cadastrado</h3>
                    <p class="text-muted">Adicione membros de equipe através do perfil de cada artista.</p>
                </div>
            `}
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
};

Pages.deletarMembroEquipe = async function(id, artistaId) {
    if (!await Utils.confirm('Tem certeza que deseja remover este membro da equipe?')) return;
    
    Utils.showLoading();
    const result = await EquipeDB.deletar(id);
    Utils.hideLoading();

    if (result) {
        Utils.showToast('Membro removido com sucesso!', 'success');
        Modals.close();
        Pages.renderEquipe();
    } else {
        Utils.showToast('Erro ao remover membro', 'error');
    }
};

Pages.renderAlertas = async function() {
    const todasParcelas  = await ParcelasDB.listar();
    const eventos        = await EventosDB.listar();
    const contratos      = await ContratosDB.listar();
    const despesas       = await DespesasDB.listar();

    const hoje    = new Date(); hoje.setHours(0,0,0,0);
    const em7d    = new Date(hoje); em7d.setDate(hoje.getDate() + 7);
    const em30d   = new Date(hoje); em30d.setDate(hoje.getDate() + 30);

    // Parcelas em aberto — separar atrasadas e a vencer (próximos 30 dias)
    const parcelasAtrasadas = todasParcelas.filter(p => {
        if (p.status === 'Pago') return false;
        if (!p.data_vencimento) return false;
        return new Date(p.data_vencimento + 'T00:00:00') < hoje;
    });
    const parcelasAVencer = todasParcelas.filter(p => {
        if (p.status === 'Pago') return false;
        if (!p.data_vencimento) return false;
        const d = new Date(p.data_vencimento + 'T00:00:00');
        return d >= hoje && d <= em30d;
    });

    // Eventos próximos (7 dias)
    const eventosProximos = eventos.filter(e => {
        if (!e.data) return false;
        const d = new Date(e.data + 'T00:00:00');
        return d >= hoje && d <= em7d;
    });

    // Contratos não assinados
    const contratosPendentes = contratos.filter(c => c.status === 'Pendente');

    // Despesas pendentes
    const despesasPendentes = despesas.filter(d => d.status === 'Pendente');

    const totalAlertas = parcelasAtrasadas.length + parcelasAVencer.length + eventosProximos.length + contratosPendentes.length + despesasPendentes.length;

    const html = `
        <div class="alertas-container">
            <div class="page-header mb-3">
                <h2>Central de Alertas</h2>
                <p class="text-muted">${totalAlertas} alerta(s) ativo(s)</p>
            </div>

            <!-- Parcelas Atrasadas (VENCIDAS) -->
            ${parcelasAtrasadas.length > 0 ? `
                <div class="card mb-3" style="border-left: 4px solid var(--danger);">
                    <div class="card-header" style="background: rgba(239, 68, 68, 0.1);">
                        <h3 class="card-title" style="color: var(--danger);">
                            <i class="fas fa-exclamation-triangle"></i> Parcelas Vencidas (${parcelasAtrasadas.length})
                        </h3>
                    </div>
                    <div class="card-body">
                        ${await this.renderParcelasAtrasadasAlerta(parcelasAtrasadas)}
                    </div>
                </div>
            ` : ''}

            <!-- Parcelas A Vencer (próximos 30 dias) -->
            ${parcelasAVencer.length > 0 ? `
                <div class="card mb-3" style="border-left: 4px solid #F59E0B;">
                    <div class="card-header" style="background: rgba(245,158,11,0.08);">
                        <h3 class="card-title" style="color:#F59E0B;">
                            <i class="fas fa-clock"></i> Parcelas em Aberto — Próximos 30 dias (${parcelasAVencer.length})
                        </h3>
                    </div>
                    <div class="card-body">
                        ${await this.renderParcelasAVencerAlerta(parcelasAVencer, eventos)}
                    </div>
                </div>
            ` : ''}

            <!-- Eventos Próximos -->
            ${eventosProximos.length > 0 ? `
                <div class="card mb-3" style="border-left: 4px solid var(--warning);">
                    <div class="card-header" style="background: rgba(245, 158, 11, 0.1);">
                        <h3 class="card-title" style="color: var(--warning);">
                            <i class="fas fa-calendar-check"></i> Eventos Próximos (${eventosProximos.length})
                        </h3>
                    </div>
                    <div class="card-body">
                        ${await this.renderEventosProximosAlerta(eventosProximos)}
                    </div>
                </div>
            ` : ''}

            <!-- Contratos Pendentes -->
            ${contratosPendentes.length > 0 ? `
                <div class="card mb-3" style="border-left: 4px solid var(--info);">
                    <div class="card-header" style="background: rgba(59, 130, 246, 0.1);">
                        <h3 class="card-title" style="color: var(--info);">
                            <i class="fas fa-file-contract"></i> Contratos Não Assinados (${contratosPendentes.length})
                        </h3>
                    </div>
                    <div class="card-body">
                        ${await this.renderContratosPendentesAlerta(contratosPendentes)}
                    </div>
                </div>
            ` : ''}

            <!-- Despesas Pendentes -->
            ${despesasPendentes.length > 0 ? `
                <div class="card mb-3" style="border-left: 4px solid var(--warning);">
                    <div class="card-header" style="background: rgba(245, 158, 11, 0.1);">
                        <h3 class="card-title" style="color: var(--warning);">
                            <i class="fas fa-money-bill-wave"></i> Despesas Pendentes (${despesasPendentes.length})
                        </h3>
                    </div>
                    <div class="card-body">
                        <p class="text-muted">Total pendente: <strong>${Utils.formatCurrency(despesasPendentes.reduce((sum, d) => sum + d.valor, 0))}</strong></p>
                        <button class="btn-primary btn-sm" onclick="Pages.changePage('financeiro')">
                            Ver Detalhes
                        </button>
                    </div>
                </div>
            ` : ''}

            ${totalAlertas === 0 ? `
                <div class="card text-center" style="padding: 60px;">
                    <i class="fas fa-check-circle" style="font-size: 48px; color: var(--success); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--text-secondary);">Tudo em ordem!</h3>
                    <p class="text-muted">Nenhum alerta ativo no momento.</p>
                </div>
            ` : ''}
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
};

Pages.renderParcelasAtrasadasAlerta = async function(parcelas) {
    let html = '<div class="alert-list">';
    
    for (const parcela of parcelas) {
        const evento = await EventosDB.buscarPorId(parcela.evento_id);
        const diasAtrasados = Utils.daysBetween(parcela.data_vencimento, new Date());
        
        html += `
            <div style="padding: 12px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: var(--danger);">Parcela ${parcela.numero_parcela}ª - ${evento ? evento.local : 'Evento'}</strong>
                    <p style="margin: 4px 0 0; font-size: 13px; color: var(--text-secondary);">
                        Vencimento: ${Utils.formatDate(parcela.data_vencimento)} (${diasAtrasados} dias atraso)
                    </p>
                </div>
                <div style="text-align: right;">
                    <strong style="color: var(--danger);">${Utils.formatCurrency(parcela.valor)}</strong>
                    <button class="btn-primary btn-sm mt-1" onclick="Pages.marcarParcelaPaga('${parcela.id}')">
                        Marcar Pago
                    </button>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
};

Pages.renderParcelasAVencerAlerta = async function(parcelas, eventos) {
    let html = '<div class="alert-list">';
    for (const parcela of parcelas) {
        const evento = eventos?.find(e => e.id === parcela.evento_id)
            || await EventosDB.buscarPorId(parcela.evento_id);
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const venc = new Date(parcela.data_vencimento + 'T00:00:00');
        const diff  = Math.ceil((venc - hoje) / 86400000);
        const cor   = diff <= 7 ? '#F59E0B' : 'var(--text-primary)';
        const label = diff === 0 ? 'Vence hoje' : `Vence em ${diff} dia(s)`;
        html += `
            <div style="padding:12px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <strong style="color:${cor};">${parcela.descricao || ('Parcela ' + parcela.numero_parcela)} — ${evento?.local || 'Evento'}</strong>
                    <p style="margin:4px 0 0;font-size:13px;color:var(--text-muted);">
                        ${Utils.formatDate(parcela.data_vencimento)} &nbsp;·&nbsp; <span style="color:${cor};font-weight:600;">${label}</span>
                    </p>
                </div>
                <div style="text-align:right;">
                    <strong style="color:var(--success);">${Utils.formatCurrency(parcela.valor)}</strong>
                    <button class="btn-primary btn-sm mt-1" onclick="Pages.marcarParcelaPaga('${parcela.id}')">
                        Marcar Pago
                    </button>
                </div>
            </div>`;
    }
    html += '</div>';
    return html;
};

Pages.renderEventosProximosAlerta = async function(eventos) {
    let html = '<div class="alert-list">';
    
    for (const evento of eventos) {
        const artista = await ArtistasDB.buscarPorId(evento.artista_id);
        const diasFaltando = Utils.daysBetween(new Date(), evento.data);
        
        html += `
            <div style="padding: 12px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: var(--warning);">${evento.local}</strong>
                    <p style="margin: 4px 0 0; font-size: 13px; color: var(--text-secondary);">
                        ${artista ? artista.nome : ''} - ${Utils.formatDate(evento.data)} (em ${diasFaltando} dias)
                    </p>
                </div>
                <button class="btn-secondary btn-sm" onclick="Modals.showEventoMultiStepModal('${evento.id}')">
                    Ver Detalhes
                </button>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
};

Pages.renderContratosPendentesAlerta = async function(contratos) {
    let html = '<div class="alert-list">';
    
    for (const contrato of contratos) {
        const evento = await EventosDB.buscarPorId(contrato.evento_id);
        const artista = evento ? await ArtistasDB.buscarPorId(evento.artista_id) : null;
        
        html += `
            <div style="padding: 12px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: var(--info);">${evento ? evento.local : 'Evento'}</strong>
                    <p style="margin: 4px 0 0; font-size: 13px; color: var(--text-secondary);">
                        ${artista ? artista.nome : ''} - Gerado em ${Utils.formatDate(contrato.data_geracao)}
                    </p>
                </div>
                <button class="btn-primary btn-sm" onclick="Pages.assinarContrato('${contrato.id}')">
                    Assinar Contrato
                </button>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
};