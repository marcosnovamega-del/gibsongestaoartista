/* ========================================
   GIBSON MANAGER PRO - BALANÇO MENSAL
   Relatório poderoso de fechamento mensal
======================================== */

Pages.renderBalancoMensal = async function(mesParam, anoParam, artistaFiltroParam) {
    document.getElementById('pageContent').innerHTML =
        '<div class="loading-container"><div class="loading-spinner"></div></div>';

    const hoje = new Date();
    const mes  = mesParam ?? hoje.getMonth();
    const ano  = anoParam ?? hoje.getFullYear();

    // artistaFiltro: ID específico ou 'todos' (padrão)
    const artistaFiltro = artistaFiltroParam ?? 'todos';

    // Carregar TODOS os dados sem filtro de artista (via Supabase direto)
    const escritorioId = window.Auth?.currentUser?.escritorio_id || null;
    const buildQuery = (table) => {
        let q = sbClient.from(table).select('*');
        if (escritorioId) q = q.eq('escritorio_id', escritorioId);
        return q;
    };

    const [
        { data: parcelas  = [] },
        { data: todosEvts = [] },
        { data: artistas  = [] },
        { data: despesas  = [] },
        { data: contratos = [] }
    ] = await Promise.all([
        buildQuery('parcelas'),
        buildQuery('eventos'),
        buildQuery('artistas'),
        buildQuery('despesas'),
        buildQuery('contratos')
    ]);

    // Filtrar por artista selecionado (cliente-side)
    const eventos = artistaFiltro && artistaFiltro !== 'todos'
        ? todosEvts.filter(e => e.artista_id === artistaFiltro)
        : todosEvts;

    // Filtrar eventos do mês
    const eventosMes = eventos.filter(e => {
        const d = new Date(e.data + 'T12:00:00');
        return d.getMonth() === mes && d.getFullYear() === ano;
    });

    // Enriquecer eventos com artista, contrato e parcelas
    const eventosRicos = eventosMes.map(e => {
        const artista  = artistas.find(a => a.id === e.artista_id);
        const contrato = contratos.find(c => c.evento_id === e.id);
        const parsEvt  = parcelas.filter(p => p.evento_id === e.id);
        const pgPago   = parsEvt.filter(p => p.status === 'Pago').reduce((s, p) => s + (p.valor || 0), 0);
        const pgPendente = parsEvt.filter(p => p.status === 'Pendente').reduce((s, p) => s + (p.valor || 0), 0);
        return { ...e, artista, contrato, parcelas: parsEvt, pgPago, pgPendente };
    }).sort((a, b) => new Date(a.data) - new Date(b.data));

    // Filtrar despesas do mês
    const despesasMes = despesas.filter(d => {
        const dt = new Date(d.data_vencimento || d.created_at || d.data);
        return dt.getMonth() === mes && dt.getFullYear() === ano;
    });

    // ---- Cálculos principais ----
    const cacheBrutoTotal   = eventosRicos.reduce((s, e) => s + (e.cache_bruto || 0), 0);
    const comissaoTotal     = eventosRicos.reduce((s, e) => s + (e.comissao || 0), 0);
    const cacheLiquidoTotal = cacheBrutoTotal - comissaoTotal;
    const pagoTotal         = eventosRicos.reduce((s, e) => s + e.pgPago, 0);
    const pendenteTotal     = eventosRicos.reduce((s, e) => s + e.pgPendente, 0);
    const despesaTotal      = despesasMes.reduce((s, d) => s + (d.valor || 0), 0);
    const saldoLiquido      = pagoTotal - despesaTotal;
    const taxaRecebimento   = cacheLiquidoTotal > 0 ? (pagoTotal / cacheLiquidoTotal * 100).toFixed(1) : 0;

    // Agrupar por artista
    const porArtista = {};
    eventosRicos.forEach(e => {
        const nomeArt = e.artista?.nome || 'Desconhecido';
        if (!porArtista[nomeArt]) porArtista[nomeArt] = {
            artista: e.artista, shows: 0, bruto: 0, liquido: 0, pago: 0, pendente: 0
        };
        porArtista[nomeArt].shows++;
        porArtista[nomeArt].bruto    += e.cache_bruto || 0;
        porArtista[nomeArt].liquido  += (e.cache_bruto || 0) - (e.comissao || 0);
        porArtista[nomeArt].pago     += e.pgPago;
        porArtista[nomeArt].pendente += e.pgPendente;
    });

    // Agrupar despesas por categoria
    const porCategoria = {};
    despesasMes.forEach(d => {
        const cat = d.categoria || 'Outros';
        if (!porCategoria[cat]) porCategoria[cat] = 0;
        porCategoria[cat] += d.valor || 0;
    });

    const nomeMes = Utils.getMonthName(mes);
    const meses   = Array.from({ length: 12 }, (_, i) => Utils.getMonthName(i));
    const anos    = [ano - 1, ano, ano + 1];

    const html = `
    <div class="balanco-page">

        <!-- Header -->
        <div class="balanco-header">
            <div>
                <h2 class="balanco-titulo">
                    <i class="fas fa-chart-bar"></i> Fechamento Mensal
                </h2>
                <p class="text-muted">Relatório completo · ${nomeMes} ${ano}</p>
            </div>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                <!-- Seletor de artista -->
                <select class="balanco-select" id="balArtista" onchange="Pages.mudarMesBalanco()">
                    <option value="todos" ${artistaFiltro === 'todos' ? 'selected' : ''}>Todos os Artistas</option>
                    ${artistas.map(a => `<option value="${a.id}" ${artistaFiltro === a.id ? 'selected' : ''}>${a.nome}</option>`).join('')}
                </select>
                <!-- Seletor de mês/ano -->
                <select class="balanco-select" id="balMes" onchange="Pages.mudarMesBalanco()">
                    ${meses.map((m, i) => `<option value="${i}" ${i === mes ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
                <select class="balanco-select" id="balAno" onchange="Pages.mudarMesBalanco()">
                    ${anos.map(a => `<option value="${a}" ${a === ano ? 'selected' : ''}>${a}</option>`).join('')}
                </select>
                <button class="btn-secondary" onclick="Pages.imprimirBalanco()">
                    <i class="fas fa-print"></i> Imprimir
                </button>
                <button class="btn-primary" onclick="Pages.exportarBalancoPDF()">
                    <i class="fas fa-file-pdf"></i> Exportar PDF
                </button>
            </div>
        </div>

        <!-- KPIs principais -->
        <div class="balanco-kpis">
            <div class="balanco-kpi balanco-kpi-blue">
                <div class="bkpi-icon"><i class="fas fa-calendar-check"></i></div>
                <div class="bkpi-content">
                    <div class="bkpi-valor">${eventosRicos.length}</div>
                    <div class="bkpi-label">Shows no Mês</div>
                </div>
            </div>
            <div class="balanco-kpi balanco-kpi-purple">
                <div class="bkpi-icon"><i class="fas fa-dollar-sign"></i></div>
                <div class="bkpi-content">
                    <div class="bkpi-valor">${Utils.formatCurrency(cacheBrutoTotal)}</div>
                    <div class="bkpi-label">Cachê Bruto Total</div>
                </div>
            </div>
            <div class="balanco-kpi balanco-kpi-red">
                <div class="bkpi-icon"><i class="fas fa-percentage"></i></div>
                <div class="bkpi-content">
                    <div class="bkpi-valor">${Utils.formatCurrency(comissaoTotal)}</div>
                    <div class="bkpi-label">Comissão Produtora</div>
                </div>
            </div>
            <div class="balanco-kpi balanco-kpi-green">
                <div class="bkpi-icon"><i class="fas fa-hand-holding-usd"></i></div>
                <div class="bkpi-content">
                    <div class="bkpi-valor">${Utils.formatCurrency(cacheLiquidoTotal)}</div>
                    <div class="bkpi-label">Cachê Líquido</div>
                </div>
            </div>
        </div>

        <div class="balanco-kpis" style="margin-top:12px;">
            <div class="balanco-kpi" style="background:rgba(16,185,129,0.08);border-color:rgba(16,185,129,0.2);">
                <div class="bkpi-icon" style="background:rgba(16,185,129,0.15);color:#10B981;"><i class="fas fa-check-circle"></i></div>
                <div class="bkpi-content">
                    <div class="bkpi-valor" style="color:#10B981;">${Utils.formatCurrency(pagoTotal)}</div>
                    <div class="bkpi-label">Recebido no Mês</div>
                </div>
            </div>
            <div class="balanco-kpi" style="background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.2);">
                <div class="bkpi-icon" style="background:rgba(245,158,11,0.15);color:#F59E0B;"><i class="fas fa-clock"></i></div>
                <div class="bkpi-content">
                    <div class="bkpi-valor" style="color:#F59E0B;">${Utils.formatCurrency(pendenteTotal)}</div>
                    <div class="bkpi-label">A Receber</div>
                </div>
            </div>
            <div class="balanco-kpi" style="background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.2);">
                <div class="bkpi-icon" style="background:rgba(239,68,68,0.15);color:#EF4444;"><i class="fas fa-arrow-down"></i></div>
                <div class="bkpi-content">
                    <div class="bkpi-valor" style="color:#EF4444;">${Utils.formatCurrency(despesaTotal)}</div>
                    <div class="bkpi-label">Despesas</div>
                </div>
            </div>
            <div class="balanco-kpi" style="background:${saldoLiquido >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'};border-color:${saldoLiquido >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'};">
                <div class="bkpi-icon" style="background:${saldoLiquido >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'};color:${saldoLiquido >= 0 ? '#10B981' : '#EF4444'};">
                    <i class="fas fa-balance-scale"></i>
                </div>
                <div class="bkpi-content">
                    <div class="bkpi-valor" style="color:${saldoLiquido >= 0 ? '#10B981' : '#EF4444'};">${Utils.formatCurrency(saldoLiquido)}</div>
                    <div class="bkpi-label">Saldo Líquido</div>
                </div>
            </div>
        </div>

        <!-- Barra de progresso de recebimento -->
        <div class="card mb-3" style="margin-top:16px;">
            <div class="card-body" style="padding:16px 20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="font-size:13px;font-weight:600;color:var(--text-secondary);">
                        Taxa de Recebimento
                    </span>
                    <span style="font-size:18px;font-weight:800;color:${taxaRecebimento >= 80 ? '#10B981' : taxaRecebimento >= 50 ? '#F59E0B' : '#EF4444'};">
                        ${taxaRecebimento}%
                    </span>
                </div>
                <div class="balanco-progress-bar">
                    <div class="balanco-progress-fill" style="width:${Math.min(taxaRecebimento,100)}%;background:${taxaRecebimento >= 80 ? '#10B981' : taxaRecebimento >= 50 ? '#F59E0B' : '#EF4444'};"></div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-top:6px;">
                    <span>Recebido: ${Utils.formatCurrency(pagoTotal)}</span>
                    <span>Total Líquido: ${Utils.formatCurrency(cacheLiquidoTotal)}</span>
                </div>
            </div>
        </div>

        <div class="balanco-grid-2">

            <!-- Tabela de Shows -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-calendar-alt" style="color:var(--red-primary)"></i>
                        Shows do Mês (${eventosRicos.length})
                    </h3>
                </div>
                <div class="card-body" style="padding:0;overflow-x:auto;">
                    ${eventosRicos.length > 0 ? `
                    <table class="balanco-tabela">
                        <thead>
                            <tr>
                                <th>Artista</th>
                                <th>Data</th>
                                <th>Local / Cidade</th>
                                <th>Cachê Bruto</th>
                                <th>Comissão</th>
                                <th>Líquido</th>
                                <th>Recebido</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${eventosRicos.map(e => {
                                const comissao = e.comissao || 0;
                                const liquido  = (e.cache_bruto || 0) - comissao;
                                const statusCor = e.status === 'Realizado' ? '#10B981' : e.status === 'Confirmado' ? '#3B82F6' : '#F59E0B';
                                return `<tr>
                                    <td>
                                        <div style="display:flex;align-items:center;gap:8px;">
                                            <img src="${e.artista?.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(e.artista?.nome||'?')}&background=E10600&color=fff&size=40`}"
                                                 style="width:28px;height:28px;border-radius:50%;object-fit:cover;">
                                            <span style="font-weight:600;font-size:12px;">${e.artista?.nome || '—'}</span>
                                        </div>
                                    </td>
                                    <td style="font-size:12px;white-space:nowrap;">${Utils.formatDate(e.data)}</td>
                                    <td style="font-size:12px;">${e.local || '—'}<br><span style="color:var(--text-muted);font-size:11px;">${e.cidade || ''}/${e.estado || ''}</span></td>
                                    <td style="font-size:12px;font-weight:600;">${Utils.formatCurrency(e.cache_bruto || 0)}</td>
                                    <td style="font-size:12px;color:#EF4444;">${Utils.formatCurrency(comissao)}</td>
                                    <td style="font-size:12px;font-weight:700;color:#10B981;">${Utils.formatCurrency(liquido)}</td>
                                    <td>
                                        <div style="font-size:11px;">
                                            <div style="color:#10B981;">${Utils.formatCurrency(e.pgPago)}</div>
                                            ${e.pgPendente > 0 ? `<div style="color:#F59E0B;">${Utils.formatCurrency(e.pgPendente)} pend.</div>` : ''}
                                        </div>
                                    </td>
                                    <td>
                                        <span style="background:${statusCor}22;color:${statusCor};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">
                                            ${e.status || '—'}
                                        </span>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="balanco-totais-row">
                                <td colspan="3"><strong>TOTAIS DO MÊS</strong></td>
                                <td><strong>${Utils.formatCurrency(cacheBrutoTotal)}</strong></td>
                                <td style="color:#EF4444;"><strong>${Utils.formatCurrency(comissaoTotal)}</strong></td>
                                <td style="color:#10B981;"><strong>${Utils.formatCurrency(cacheLiquidoTotal)}</strong></td>
                                <td style="color:#10B981;"><strong>${Utils.formatCurrency(pagoTotal)}</strong></td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                    ` : '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>Nenhum show em '+ nomeMes +' '+ano+'.</p></div>'}
                </div>
            </div>

            <!-- Painel direito: Artistas + Despesas -->
            <div style="display:flex;flex-direction:column;gap:16px;">

                <!-- Por Artista -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-microphone" style="color:var(--red-primary)"></i>
                            Resumo por Artista
                        </h3>
                    </div>
                    <div class="card-body" style="padding:0;">
                        ${Object.entries(porArtista).length > 0 ? `
                        <table class="balanco-tabela">
                            <thead>
                                <tr>
                                    <th>Artista</th>
                                    <th>Shows</th>
                                    <th>Bruto</th>
                                    <th>Líquido</th>
                                    <th>Recebido</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(porArtista).map(([nome, d]) => `
                                <tr>
                                    <td>
                                        <div style="display:flex;align-items:center;gap:8px;">
                                            <img src="${d.artista?.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=E10600&color=fff&size=40`}"
                                                 style="width:26px;height:26px;border-radius:50%;object-fit:cover;">
                                            <span style="font-size:12px;font-weight:600;">${nome}</span>
                                        </div>
                                    </td>
                                    <td style="text-align:center;font-size:12px;">${d.shows}</td>
                                    <td style="font-size:12px;">${Utils.formatCurrency(d.bruto)}</td>
                                    <td style="font-size:12px;color:#10B981;font-weight:600;">${Utils.formatCurrency(d.liquido)}</td>
                                    <td style="font-size:12px;color:${d.pago >= d.liquido ? '#10B981' : '#F59E0B'};font-weight:600;">${Utils.formatCurrency(d.pago)}</td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                        ` : '<div style="padding:20px;text-align:center;color:var(--text-muted);">Sem artistas este mês.</div>'}
                    </div>
                </div>

                <!-- Despesas por categoria -->
                <div class="card">
                    <div class="card-header flex-between">
                        <h3 class="card-title">
                            <i class="fas fa-receipt" style="color:var(--red-primary)"></i>
                            Despesas do Mês
                        </h3>
                        <strong style="color:#EF4444;">${Utils.formatCurrency(despesaTotal)}</strong>
                    </div>
                    <div class="card-body" style="padding:0;">
                        ${despesasMes.length > 0 ? `
                        <table class="balanco-tabela">
                            <thead>
                                <tr><th>Descrição</th><th>Categoria</th><th>Vencto.</th><th>Valor</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                ${despesasMes.sort((a,b) => new Date(a.data_vencimento) - new Date(b.data_vencimento)).map(d => {
                                    const vencida = d.status !== 'Pago' && new Date(d.data_vencimento) < new Date();
                                    return `<tr>
                                        <td style="font-size:12px;font-weight:600;">${d.descricao || '—'}</td>
                                        <td style="font-size:11px;color:var(--text-muted);">${d.categoria || '—'}</td>
                                        <td style="font-size:11px;color:${vencida ? '#EF4444' : 'var(--text-muted)'};">${d.data_vencimento ? Utils.formatDate(d.data_vencimento) : '—'}</td>
                                        <td style="font-size:12px;font-weight:600;color:#EF4444;">${Utils.formatCurrency(d.valor || 0)}</td>
                                        <td>
                                            <span style="font-size:10px;padding:2px 6px;border-radius:8px;
                                                background:${d.status === 'Pago' ? 'rgba(16,185,129,0.15)' : vencida ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'};
                                                color:${d.status === 'Pago' ? '#10B981' : vencida ? '#EF4444' : '#F59E0B'};">
                                                ${d.status === 'Pago' ? 'Pago' : vencida ? 'Vencida' : 'Pendente'}
                                            </span>
                                        </td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                        ` : '<div style="padding:20px;text-align:center;color:var(--text-muted);">Sem despesas este mês.</div>'}
                    </div>
                </div>

                <!-- Resumo Final -->
                <div class="card balanco-resumo-final">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-balance-scale" style="color:var(--red-primary)"></i>
                            Resumo do Fechamento
                        </h3>
                    </div>
                    <div class="card-body">
                        <div class="balanco-resumo-linha">
                            <span>Cachê Bruto Total</span>
                            <strong>${Utils.formatCurrency(cacheBrutoTotal)}</strong>
                        </div>
                        <div class="balanco-resumo-linha">
                            <span>(-) Comissão Produtora</span>
                            <strong style="color:#EF4444;">${Utils.formatCurrency(comissaoTotal)}</strong>
                        </div>
                        <div class="balanco-resumo-linha" style="border-top:1px solid var(--border-color);padding-top:8px;">
                            <span>Cachê Líquido Artista</span>
                            <strong style="color:#10B981;">${Utils.formatCurrency(cacheLiquidoTotal)}</strong>
                        </div>
                        <div class="balanco-resumo-linha">
                            <span>(-) Despesas do Mês</span>
                            <strong style="color:#EF4444;">${Utils.formatCurrency(despesaTotal)}</strong>
                        </div>
                        <div class="balanco-resumo-linha balanco-saldo" style="border-top:2px solid var(--border-color);margin-top:8px;padding-top:10px;">
                            <span style="font-size:15px;">SALDO FINAL</span>
                            <strong style="font-size:22px;color:${saldoLiquido >= 0 ? '#10B981' : '#EF4444'};">
                                ${Utils.formatCurrency(saldoLiquido)}
                            </strong>
                        </div>
                        <div class="balanco-resumo-linha" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border-color);">
                            <span style="color:var(--text-muted);">Ainda a Receber</span>
                            <strong style="color:#F59E0B;">${Utils.formatCurrency(pendenteTotal)}</strong>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>`;

    document.getElementById('pageContent').innerHTML = html;
    Pages._balMes = mes;
    Pages._balAno = ano;
};

Pages.mudarMesBalanco = function() {
    const mes      = parseInt(document.getElementById('balMes')?.value ?? new Date().getMonth());
    const ano      = parseInt(document.getElementById('balAno')?.value ?? new Date().getFullYear());
    const artista  = document.getElementById('balArtista')?.value ?? 'todos';
    Pages.renderBalancoMensal(mes, ano, artista);
};

Pages.imprimirBalanco = function() {
    window.print();
};

Pages.exportarBalancoPDF = function() {
    Utils.showToast('Use Ctrl+P → Salvar como PDF para gerar o PDF do relatório.', 'info');
    setTimeout(() => window.print(), 500);
};
