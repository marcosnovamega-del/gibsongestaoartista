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
};

// ── Seção "Recebimentos a Confirmar" ─────────────────────────────────────────
Pages.carregarRecebimentosAConfirmar = async function() {
    const el = document.getElementById('recebimentos-confirmar-body');
    if (!el) return;

    try {
        const [contratos, eventos, artistas, todasParcelas] = await Promise.all([
            ContratosDB.listar(),
            EventosDB.listar(),
            ArtistasDB.listar(),
            ParcelasDB.listar()
        ]);

        // Apenas contratos assinados que possuem proposta vinculada
        const contratosAssinados = contratos.filter(c => c.status === 'Assinado');
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

            const artista = artistas.find(a => a.id === evento.artista_id);
            const parcelasEvento = todasParcelas.filter(p => p.evento_id === evento.id);
            const cacheBruto = proposta.cache_bruto || 0;

            // Checar cada item do cronograma
            cronograma.forEach((item, idx) => {
                const numero = item.numero || (idx + 1);
                // Já foi lançado se existe parcela com mesmo número
                const jaLancado = parcelasEvento.some(p => p.numero_parcela === numero);
                if (jaLancado) return;

                const valor = item.valor !== undefined
                    ? item.valor
                    : parseFloat((cacheBruto * (item.pct || 100) / 100).toFixed(2));

                let dataVenc = item.data_vencimento;
                if (!dataVenc && item.dias_antes_show !== undefined && evento.data) {
                    const d = new Date(evento.data + 'T12:00:00');
                    d.setDate(d.getDate() + (item.dias_antes_show || 0));
                    dataVenc = d.toISOString().split('T')[0];
                }

                itens.push({
                    eventoId: evento.id,
                    artistaNome: artista?.nome || '—',
                    eventoLocal: evento.local || '—',
                    eventoData: evento.data,
                    descricao: item.descricao || `Parcela ${numero}`,
                    valor,
                    dataVenc,
                    numero,
                    tipo: item.tipo || 'parcela'
                });
            });
        }

        if (itens.length === 0) {
            el.innerHTML = `<p class="text-muted" style="text-align:center;padding:20px;font-size:13px;">
                <i class="fas fa-check-circle" style="color:var(--success);margin-right:6px;"></i>
                Nenhum recebimento pendente de confirmação.
            </p>`;
            return;
        }

        // Ordenar por data de vencimento
        itens.sort((a, b) => (a.dataVenc || '9999') < (b.dataVenc || '9999') ? -1 : 1);

        el.innerHTML = `
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.25);border-radius:8px;padding:8px 12px;">
                <i class="fas fa-info-circle" style="color:#D4AF37;"></i>
                Estes valores vêm do cronograma da proposta. Clique em <strong>Confirmar Lançamento</strong> para registrar cada recebimento no financeiro.
            </p>
            <div style="display:flex;flex-direction:column;gap:8px;">
                ${itens.map((it, i) => {
                    const hoje = new Date();
                    const venc = it.dataVenc ? new Date(it.dataVenc + 'T12:00:00') : null;
                    const diff = venc ? Math.ceil((venc - hoje) / 86400000) : null;
                    const badge = diff === null ? '' : diff < 0
                        ? `<span style="font-size:11px;color:var(--danger);font-weight:600;">⚠️ Atrasado ${Math.abs(diff)}d</span>`
                        : diff <= 7
                        ? `<span style="font-size:11px;color:#F59E0B;font-weight:600;">🟡 Vence em ${diff}d</span>`
                        : `<span style="font-size:11px;color:var(--text-muted);">Vence ${it.dataVenc ? Utils.formatDate(it.dataVenc) : '—'}</span>`;

                    const dataJson = encodeURIComponent(JSON.stringify(it));
                    return `
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;
                                padding:12px 14px;background:var(--bg-secondary);border-radius:8px;
                                border:1px solid var(--border-color);">
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:13px;font-weight:600;color:var(--text-primary);">
                                ${it.artistaNome} — ${it.descricao}
                            </div>
                            <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
                                📍 ${it.eventoLocal} &nbsp;|&nbsp;
                                🗓 ${it.eventoData ? Utils.formatDate(it.eventoData) : '—'} &nbsp;|&nbsp;
                                ${badge}
                            </div>
                        </div>
                        <div style="text-align:right;white-space:nowrap;">
                            <div style="font-size:15px;font-weight:700;color:var(--success);">${Utils.formatCurrency(it.valor)}</div>
                            <button class="btn-primary btn-sm" style="margin-top:6px;font-size:11px;"
                                    onclick="Pages.confirmarLancamentoParcela('${it.eventoId}',${it.numero},'${it.descricao}',${it.valor},'${it.dataVenc || ''}')">
                                <i class="fas fa-check"></i> Confirmar Lançamento
                            </button>
                        </div>
                    </div>`;
                }).join('')}
            </div>`;
    } catch(e) {
        console.error('Erro ao carregar recebimentos a confirmar:', e);
        if (el) el.innerHTML = '<p class="text-muted" style="padding:16px;">Erro ao carregar recebimentos.</p>';
    }
};

Pages.confirmarLancamentoParcela = async function(eventoId, numero, descricao, valor, dataVenc) {
    const ok = await Utils.confirm(`Confirmar lançamento no Financeiro?\n\n${descricao}: ${Utils.formatCurrency(valor)}\nVencimento: ${dataVenc ? Utils.formatDate(dataVenc) : '—'}`);
    if (!ok) return;

    Utils.showLoading();
    try {
        await ParcelasDB.criar({
            evento_id:       eventoId,
            numero_parcela:  numero,
            valor:           parseFloat(valor),
            data_vencimento: dataVenc || null,
            status:          'Pendente',
            descricao:       descricao,
        });
        Utils.hideLoading();
        Utils.showToast(`✅ "${descricao}" lançada no Financeiro!`, 'success');
        // Recarregar só a seção, sem recarregar a página toda
        Pages.carregarRecebimentosAConfirmar();
    } catch(e) {
        Utils.hideLoading();
        Utils.showToast('Erro ao confirmar lançamento: ' + e.message, 'error');
    }
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
    const parcelasAtrasadas = await ParcelasDB.verificarAtrasadas();
    const eventos = await EventosDB.listar();
    const contratos = await ContratosDB.listar();
    
    // Eventos próximos (próximos 7 dias)
    const hoje = new Date();
    const em7Dias = new Date();
    em7Dias.setDate(hoje.getDate() + 7);
    
    const eventosProximos = eventos.filter(e => {
        const dataEvento = new Date(e.data);
        return dataEvento >= hoje && dataEvento <= em7Dias;
    });

    // Contratos não assinados
    const contratosPendentes = contratos.filter(c => c.status === 'Pendente');

    // Despesas pendentes
    const despesas = await DespesasDB.listar();
    const despesasPendentes = despesas.filter(d => d.status === 'Pendente');

    const totalAlertas = parcelasAtrasadas.length + eventosProximos.length + contratosPendentes.length + despesasPendentes.length;

    const html = `
        <div class="alertas-container">
            <div class="page-header mb-3">
                <h2>Central de Alertas</h2>
                <p class="text-muted">${totalAlertas} alerta(s) ativo(s)</p>
            </div>

            <!-- Parcelas Atrasadas -->
            ${parcelasAtrasadas.length > 0 ? `
                <div class="card mb-3" style="border-left: 4px solid var(--danger);">
                    <div class="card-header" style="background: rgba(239, 68, 68, 0.1);">
                        <h3 class="card-title" style="color: var(--danger);">
                            <i class="fas fa-exclamation-triangle"></i> Parcelas Atrasadas (${parcelasAtrasadas.length})
                        </h3>
                    </div>
                    <div class="card-body">
                        ${await this.renderParcelasAtrasadasAlerta(parcelasAtrasadas)}
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