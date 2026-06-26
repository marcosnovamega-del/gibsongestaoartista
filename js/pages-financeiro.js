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

    const estilos = `
    <style>
        .rec-table-wrap { overflow-x:auto; margin-bottom:24px; }
        .rec-header-table {
            width:100%; border-collapse:collapse; margin-bottom:0;
            background: var(--red-primary); border-radius:8px 8px 0 0; overflow:hidden;
        }
        .rec-header-table th {
            padding:8px 10px; font-size:11px; font-weight:700;
            text-transform:uppercase; letter-spacing:.5px;
            color:#fff; border:1px solid rgba(255,255,255,.2); text-align:center;
        }
        .rec-header-table td {
            padding:8px 10px; font-size:13px; font-weight:600;
            color:var(--text-primary); border:1px solid var(--border-color);
            background:var(--bg-secondary); text-align:center;
        }
        .rec-body-table { width:100%; border-collapse:collapse; }
        .rec-body-table th {
            padding:7px 8px; font-size:10px; font-weight:700;
            text-transform:uppercase; letter-spacing:.4px;
            background:#1a1a2e; color:#D4AF37;
            border:1px solid var(--border-color); text-align:center; white-space:nowrap;
        }
        .rec-body-table td {
            padding:6px 8px; border:1px solid var(--border-color);
            background:var(--bg-card); vertical-align:middle;
        }
        .rec-body-table td.locked {
            background:var(--bg-secondary); color:var(--text-primary);
            font-weight:600; text-align:center; font-size:13px;
        }
        .rec-input {
            width:100%; border:1px solid var(--border-color); border-radius:6px;
            padding:5px 8px; font-size:12px; background:var(--bg-secondary);
            color:var(--text-primary); box-sizing:border-box;
        }
        .rec-input:focus { border-color:var(--red-primary); outline:none; }
        .rec-total-row td {
            background:#1a1a2e !important; font-weight:700;
            color:#D4AF37; font-size:13px; border:1px solid var(--border-color);
            padding:8px 10px;
        }
        .rec-total-row td.label { color:#fff; text-align:right; padding-right:12px; }
        .rec-total-row td.value { color:#D4AF37; text-align:center; }
        .rec-total-row td.faltam { color:var(--danger); }
        .rec-total-row td.recebido { color:var(--success); }
        .btn-confirmar-parc {
            background:var(--red-primary); color:#fff; border:none;
            border-radius:6px; padding:5px 10px; font-size:11px;
            font-weight:700; cursor:pointer; white-space:nowrap;
            transition:opacity .2s;
        }
        .btn-confirmar-parc:hover { opacity:.85; }
        .parc-confirmada td { opacity:.6; }
        .parc-confirmada td.locked { color:var(--success) !important; }
    </style>`;

    try {
        const [contratos, eventos, artistas, todasParcelas] = await Promise.all([
            ContratosDB.listar(),
            EventosDB.listar(),
            ArtistasDB.listar(),
            ParcelasDB.listar()
        ]);

        const contratosAssinados = contratos.filter(c => c.status === 'Assinado');
        let blocos = '';
        let algumItem = false;

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
            algumItem = true;

            const artista    = artistas.find(a => a.id === evento.artista_id);
            const parcelasEv = todasParcelas.filter(p => p.evento_id === evento.id);
            const cacheBruto = proposta.cache_bruto || 0;
            const totalAReceber = cronograma.reduce((s, item, idx) => {
                const v = item.valor !== undefined ? item.valor : parseFloat((cacheBruto * (item.pct || 100) / 100).toFixed(2));
                return s + v;
            }, 0);
            const totalRecebido = parcelasEv.filter(p => p.status === 'Pago').reduce((s, p) => s + (parseFloat(p.valor_recebido || p.valor) || 0), 0);
            const faltam = totalAReceber - totalRecebido;

            // Linhas do cronograma
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
                    <td><input type="number" step="0.01" class="rec-input" id="${uid}_vlrreceb" value="${parc?.valor_recebido || valor}" ${confirmada ? 'disabled' : ''}></td>
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

            blocos += `
            <div class="rec-table-wrap">
                <table class="rec-header-table">
                    <tr>
                        <th>Show</th><th>Data do Show</th><th>Valor do Show</th>
                        <th>Responsável</th><th>Telefone</th><th>Local do Show</th>
                    </tr>
                    <tr>
                        <td><strong>${artista?.nome || '—'}</strong></td>
                        <td>${evento.data ? Utils.formatDate(evento.data) : '—'}</td>
                        <td style="color:#D4AF37;">${Utils.formatCurrency(cacheBruto)}</td>
                        <td>${proposta.contratante_nome || evento.contratante || '—'}</td>
                        <td>${proposta.contratante_telefone || evento.telefone || '—'}</td>
                        <td>${evento.local || '—'}</td>
                    </tr>
                </table>
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
                    <tbody>
                        ${linhas}
                    </tbody>
                    <tfoot>
                        <tr class="rec-total-row">
                            <td colspan="3" class="label">TOTAL A RECEBER</td>
                            <td class="value" colspan="4">${Utils.formatCurrency(totalAReceber)}</td>
                            <td></td>
                        </tr>
                        <tr class="rec-total-row">
                            <td colspan="3" class="label">TOTAL RECEBIDO</td>
                            <td class="value recebido" colspan="4">${Utils.formatCurrency(totalRecebido)}</td>
                            <td></td>
                        </tr>
                        <tr class="rec-total-row">
                            <td colspan="3" class="label">FALTAM</td>
                            <td class="value faltam" colspan="4">${Utils.formatCurrency(faltam)}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>`;
        }

        if (!algumItem) {
            el.innerHTML = `<p class="text-muted" style="text-align:center;padding:20px;font-size:13px;">
                <i class="fas fa-check-circle" style="color:var(--success);margin-right:6px;"></i>
                Nenhum recebimento pendente de confirmação.
            </p>`;
            return;
        }

        el.innerHTML = estilos + blocos;

    } catch(e) {
        console.error('Erro ao carregar recebimentos a confirmar:', e);
        if (el) el.innerHTML = '<p class="text-muted" style="padding:16px;">Erro ao carregar recebimentos.</p>';
    }
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