/* ========================================
   GIBSON MANAGER PRO - GESTÃO FINANCEIRA
   Receitas, Despesas e Modelos de Escritório
======================================== */

const CATEGORIAS_DESPESA = [
    { id: 'aluguel',        nome: 'Aluguel',           icon: 'fa-home',          cor: '#8B5CF6' },
    { id: 'energia',        nome: 'Energia Elétrica',  icon: 'fa-bolt',          cor: '#F59E0B' },
    { id: 'agua',           nome: 'Água',              icon: 'fa-tint',          cor: '#3B82F6' },
    { id: 'internet',       nome: 'Internet/Telefone', icon: 'fa-wifi',          cor: '#06B6D4' },
    { id: 'folha',          nome: 'Folha de Pagamento',icon: 'fa-users',         cor: '#10B981' },
    { id: 'marketing',      nome: 'Marketing/Mídia',   icon: 'fa-bullhorn',      cor: '#EC4899' },
    { id: 'equipamentos',   nome: 'Equipamentos',      icon: 'fa-tools',         cor: '#6366F1' },
    { id: 'transporte',     nome: 'Transporte',        icon: 'fa-car',           cor: '#F97316' },
    { id: 'alimentacao',    nome: 'Alimentação',       icon: 'fa-utensils',      cor: '#84CC16' },
    { id: 'impostos',       nome: 'Impostos/Taxas',    icon: 'fa-file-invoice',  cor: '#EF4444' },
    { id: 'manutencao',     nome: 'Manutenção',        icon: 'fa-wrench',        cor: '#78716C' },
    { id: 'comissoes',      nome: 'Comissões',         icon: 'fa-hand-holding-usd', cor: '#EAB308' },
    { id: 'extras',         nome: 'Despesas Extras',   icon: 'fa-plus-circle',   cor: '#9CA3AF' },
];

const CATEGORIAS_RECEITA = [
    { id: 'cache',          nome: 'Cachê de Show',     icon: 'fa-microphone',    cor: '#10B981' },
    { id: 'patrocinio',     nome: 'Patrocínio',        icon: 'fa-handshake',     cor: '#3B82F6' },
    { id: 'merchandising',  nome: 'Merchandising',     icon: 'fa-tshirt',        cor: '#8B5CF6' },
    { id: 'streaming',      nome: 'Streaming/Digital', icon: 'fa-music',         cor: '#EC4899' },
    { id: 'royalties',      nome: 'Royalties/Direitos',icon: 'fa-copyright',     cor: '#F59E0B' },
    { id: 'outros',         nome: 'Outras Receitas',   icon: 'fa-plus',          cor: '#9CA3AF' },
];

Pages.renderGestaoFinanceira = async function(targetMes = null, targetAno = null) {
    try {
        document.getElementById('pageContent').innerHTML =
            '<div class="loading-container"><div class="loading-spinner"></div></div>';

        const hoje = new Date();
        const mes  = targetMes !== null ? parseInt(targetMes) : hoje.getMonth();
        const ano  = targetAno !== null ? parseInt(targetAno) : hoje.getFullYear();

        const [despesas, receitas, modelos, totais] = await Promise.all([
            DespesasDB.listar(true),
            ReceitasDB.listar(true),
            ModelosDespesaDB.listar(),
            Utils.calcularTotaisMes(mes, ano)
        ]);

        // Filtrar pelo mês selecionado
        const despMes = despesas.filter(d => {
            const dt = new Date((d.data_vencimento || d.created_at || new Date().toISOString()) + 'T12:00:00');
            return dt.getMonth() === mes && dt.getFullYear() === ano;
        });
        const recMes = receitas.filter(r => {
            const dt = new Date((r.data_recebimento || r.created_at || new Date().toISOString()) + 'T12:00:00');
            return dt.getMonth() === mes && dt.getFullYear() === ano;
        });

        // KPIs (Usando totais unificados de Utils)
        const totalDesp    = totais.despesas;
        const totalRec     = totais.receita;
        const saldo        = totais.lucro;
        
        const despPagas    = despMes.filter(d => d.status === 'Pago').reduce((s,d) => s + (parseFloat(d.valor)||0), 0);
        const despPend     = despMes.filter(d => d.status !== 'Pago').reduce((s,d) => s + (parseFloat(d.valor)||0), 0);
        const despVencidas = despMes.filter(d => d.status !== 'Pago' && d.data_vencimento && new Date(d.data_vencimento+'T12:00:00') < hoje);

        const aprovPendentes = despesas.filter(d => 
            d.status === 'Aprovação Pendente' || 
            (d.status === 'Pendente' && d.criado_por)
        );

        // Agrupar despesas por categoria
        const porCategoria = {};
        despMes.forEach(d => {
            const cat = d.categoria || 'extras';
            if (!porCategoria[cat]) porCategoria[cat] = 0;
            porCategoria[cat] += parseFloat(d.valor) || 0;
        });

        const nomeMes = Utils.getMonthName(mes);

        const html = `
        <div class="gestao-fin-page">

        <!-- Header -->
        <div class="page-header flex-between mb-3">
            <div>
                <h2 style="display:flex;align-items:center;gap:10px;">
                    <i class="fas fa-wallet" style="color:var(--red-primary)"></i> Gestão Financeira
                </h2>
                <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
                    <select id="selectMesFin" class="form-control-sm" style="background:#1a1a1a;color:#fff;border:1px solid #333;" onchange="Pages.mudarPeriodoFinanceiro()">
                        ${[0,1,2,3,4,5,6,7,8,9,10,11].map(m => `<option value="${m}" ${m === mes ? 'selected' : ''}>${Utils.getMonthName(m)}</option>`).join('')}
                    </select>
                    <select id="selectAnoFin" class="form-control-sm" style="background:#1a1a1a;color:#fff;border:1px solid #333;" onchange="Pages.mudarPeriodoFinanceiro()">
                        ${[ano-1, ano, ano+1].map(a => `<option value="${a}" ${a === ano ? 'selected' : ''}>${a}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn-primary" onclick="Modals.showReceitaModal()">
                    <i class="fas fa-plus"></i> Nova Receita
                </button>
                <button class="btn-secondary" onclick="Modals.showDespesaModal()">
                    <i class="fas fa-minus"></i> Nova Despesa
                </button>
                <button class="btn-secondary" onclick="Pages.renderFinanceiro()">
                    <i class="fas fa-arrow-left"></i> Financeiro
                </button>
            </div>
        </div>

        <!-- APROVAÇÕES PENDENTES -->
        ${aprovPendentes.length > 0 ? `
        <div class="card mb-3" style="border:1px solid #F59E0B; background:rgba(245,158,11,0.05);">
            <div class="card-header" style="border-bottom:none;padding-bottom:0;">
                <h3 class="card-title" style="color:#B45309;"><i class="fas fa-exclamation-circle"></i> Aprovações Pendentes (${aprovPendentes.length})</h3>
            </div>
            <div class="card-body">
                <table class="balanco-tabela" style="background:transparent;">
                    <tbody>
                        ${aprovPendentes.map(d => `
                        <tr>
                            <td>
                                <div style="font-weight:600;">${d.tipo || 'Despesa'} ${d.descricao ? `- ${d.descricao}` : ''}</div>
                                <div style="font-size:11px;color:var(--text-muted);">Por: ${d.criado_por || 'Sistema'}</div>
                            </td>
                            <td style="color:#B45309;font-weight:700;">${Utils.formatCurrency(d.valor)}</td>
                            <td style="text-align:right;">
                                ${d.comprovante_url ? `
                                    <a href="${d.comprovante_url}" target="_blank" class="btn-secondary btn-sm" style="margin-right:4px;" title="Ver Comprovante">
                                        <i class="fas fa-file-invoice"></i>
                                    </a>
                                ` : ''}
                                <button class="btn-primary btn-sm" onclick="Pages.aprovarDespesa('${d.id}')" style="background:#10B981;border-color:#10B981;padding:4px 8px;font-size:11px;"><i class="fas fa-check"></i> Aprovar</button>
                                <button class="btn-secondary btn-sm" onclick="Pages.rejeitarDespesa('${d.id}')" style="color:#EF4444;padding:4px 8px;font-size:11px;margin-left:4px;"><i class="fas fa-times"></i> Rejeitar</button>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ` : ''}

        <!-- KPIs -->
        <div class="grid grid-4 mb-3">
            <div class="stat-card" style="border-color:rgba(16,185,129,0.3);">
                <div class="stat-icon green"><i class="fas fa-arrow-up"></i></div>
                <div class="stat-content">
                    <h3 style="color:#10B981;">${Utils.formatCurrency(totalRec)}</h3>
                    <p>Receitas do Mês</p>
                </div>
            </div>
            <div class="stat-card" style="border-color:rgba(239,68,68,0.3);">
                <div class="stat-icon red"><i class="fas fa-arrow-down"></i></div>
                <div class="stat-content">
                    <h3 style="color:#EF4444;">${Utils.formatCurrency(totalDesp)}</h3>
                    <p>Despesas do Mês</p>
                </div>
            </div>
            <div class="stat-card" style="border-color:${saldo>=0?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'};">
                <div class="stat-icon" style="background:${saldo>=0?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)'};color:${saldo>=0?'#10B981':'#EF4444'};">
                    <i class="fas fa-balance-scale"></i>
                </div>
                <div class="stat-content">
                    <h3 style="color:${saldo>=0?'#10B981':'#EF4444'};">${Utils.formatCurrency(saldo)}</h3>
                    <p>Saldo do Mês</p>
                </div>
            </div>
            <div class="stat-card" style="${despVencidas.length>0?'border-color:#EF4444;':''}" >
                <div class="stat-icon" style="background:rgba(239,68,68,0.15);color:#EF4444;">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="stat-content">
                    <h3 style="color:#EF4444;">${despVencidas.length}</h3>
                    <p>Despesas Vencidas</p>
                </div>
            </div>
        </div>

        <div class="fin-grid-main">

            <!-- COLUNA ESQUERDA -->
            <div>

                <!-- Receitas -->
                <div class="card mb-3">
                    <div class="card-header flex-between">
                        <h3 class="card-title">
                            <i class="fas fa-arrow-up" style="color:#10B981"></i> Receitas
                        </h3>
                        <button class="btn-primary btn-sm" onclick="Modals.showReceitaModal()">
                            <i class="fas fa-plus"></i> Adicionar
                        </button>
                    </div>
                    <div class="card-body" style="padding:0;">
                        ${recMes.length > 0 ? `
                        <table class="balanco-tabela">
                            <thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th>Valor</th><th>Status</th><th></th></tr></thead>
                            <tbody>
                                ${recMes.sort((a,b) => new Date(a.data_recebimento)-new Date(b.data_recebimento)).map(r => {
                                    const cat = CATEGORIAS_RECEITA.find(c => c.id === r.categoria);
                                    return `<tr>
                                        <td style="font-weight:600;font-size:12px;">${r.descricao}</td>
                                        <td>
                                            <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${cat?.cor||'#9CA3AF'}22;color:${cat?.cor||'#9CA3AF'};">
                                                <i class="fas ${cat?.icon||'fa-circle'}"></i> ${cat?.nome||r.categoria}
                                            </span>
                                        </td>
                                        <td style="font-size:12px;">${Utils.formatDate(r.data_recebimento)}</td>
                                        <td style="font-weight:700;color:#10B981;font-size:13px;">${Utils.formatCurrency(r.valor)}</td>
                                        <td>
                                            <span style="font-size:10px;padding:2px 8px;border-radius:8px;
                                                background:${r.status==='Recebido'?'rgba(16,185,129,0.15)':'rgba(245,158,11,0.15)'};
                                                color:${r.status==='Recebido'?'#10B981':'#F59E0B'};">
                                                ${r.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div style="display:flex;gap:4px;">
                                                ${r.status!=='Recebido'?`<button class="kanban-btn kanban-btn-success" onclick="Pages.marcarReceitaRecebida('${r.id}')"><i class="fas fa-check"></i></button>`:''}
                                                <button class="kanban-btn kanban-btn-danger" onclick="Pages.deletarReceita('${r.id}')"><i class="fas fa-trash"></i></button>
                                            </div>
                                        </td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                            <tfoot>
                                <tr class="balanco-totais-row">
                                    <td colspan="3"><strong>Total Receitas</strong></td>
                                    <td colspan="3"><strong style="color:#10B981;">${Utils.formatCurrency(totalRec)}</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                        ` : '<div class="empty-state"><i class="fas fa-arrow-up"></i><p>Nenhuma receita este mês.</p></div>'}
                    </div>
                </div>

                <!-- Despesas -->
                <div class="card mb-3">
                    <div class="card-header flex-between">
                        <h3 class="card-title">
                            <i class="fas fa-arrow-down" style="color:#EF4444"></i> Despesas
                        </h3>
                        <button class="btn-secondary btn-sm" onclick="Modals.showDespesaModal()">
                            <i class="fas fa-plus"></i> Adicionar
                        </button>
                    </div>
                    <div class="card-body" style="padding:0;">
                        ${despMes.length > 0 ? `
                        <table class="balanco-tabela">
                            <thead><tr><th>Descrição</th><th>Categoria</th><th>Vencimento</th><th>Valor</th><th>Status</th><th></th></tr></thead>
                            <tbody>
                                ${despMes.sort((a,b) => new Date(a.data_vencimento||a.created_at)-new Date(b.data_vencimento||b.created_at)).map(d => {
                                    const cat = CATEGORIAS_DESPESA.find(c => c.id === d.categoria);
                                    const vencida = d.status!=='Pago' && d.data_vencimento && new Date(d.data_vencimento+'T12:00:00') < hoje;
                                    return `<tr style="${vencida?'background:rgba(239,68,68,0.04);':''}">
                                        <td style="font-weight:600;font-size:12px;">
                                            ${d.recorrente?'<i class="fas fa-sync" style="color:var(--text-muted);font-size:10px;" title="Recorrente"></i> ':''} ${d.descricao}
                                        </td>
                                        <td>
                                            <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${cat?.cor||'#9CA3AF'}22;color:${cat?.cor||'#9CA3AF'};">
                                                <i class="fas ${cat?.icon||'fa-circle'}"></i> ${cat?.nome||d.categoria||'—'}
                                            </span>
                                        </td>
                                        <td style="font-size:12px;color:${vencida?'#EF4444':'var(--text-secondary)'};">
                                            ${d.data_vencimento?Utils.formatDate(d.data_vencimento):'—'}
                                            ${vencida?'<span style="font-size:10px;color:#EF4444;"> VENCIDA</span>':''}
                                        </td>
                                        <td style="font-weight:700;color:#EF4444;font-size:13px;">${Utils.formatCurrency(d.valor)}</td>
                                        <td>
                                            <span style="font-size:10px;padding:2px 8px;border-radius:8px;
                                                background:${d.status==='Pago'?'rgba(16,185,129,0.15)':vencida?'rgba(239,68,68,0.15)':'rgba(245,158,11,0.15)'};
                                                color:${d.status==='Pago'?'#10B981':vencida?'#EF4444':'#F59E0B'};">
                                                ${d.status==='Pago'?'Pago':vencida?'Vencida':'Pendente'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style="display:flex;gap:4px;">
                                                ${d.status!=='Pago'?`<button class="kanban-btn kanban-btn-success" onclick="Pages.marcarDespesaPaga('${d.id}')"><i class="fas fa-check"></i></button>`:''}
                                                <button class="kanban-btn" onclick="Modals.showDespesaModal('${d.id}')"><i class="fas fa-edit"></i></button>
                                                <button class="kanban-btn kanban-btn-danger" onclick="Pages.deletarDespesa('${d.id}')"><i class="fas fa-trash"></i></button>
                                            </div>
                                        </td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                            <tfoot>
                                <tr class="balanco-totais-row">
                                    <td colspan="3"><strong>Total Despesas</strong></td>
                                    <td colspan="3"><strong style="color:#EF4444;">${Utils.formatCurrency(totalDesp)}</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                        ` : '<div class="empty-state"><i class="fas fa-arrow-down"></i><p>Nenhuma despesa este mês.</p></div>'}
                    </div>
                </div>

            </div>

            <!-- COLUNA DIREITA -->
            <div style="display:flex;flex-direction:column;gap:16px;">

                <!-- DRE Simplificado -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-chart-pie" style="color:var(--red-primary)"></i> DRE — ${nomeMes}</h3>
                    </div>
                    <div class="card-body">
                        <div class="dre-linha dre-receita">
                            <span>📈 Receitas</span><strong>${Utils.formatCurrency(totalRec)}</strong>
                        </div>
                        ${Object.entries(porCategoria).map(([catId, val]) => {
                            const cat = CATEGORIAS_DESPESA.find(c => c.id === catId);
                            const pct = totalDesp > 0 ? (val/totalDesp*100).toFixed(0) : 0;
                            return `
                            <div class="dre-linha dre-desp-cat">
                                <span style="display:flex;align-items:center;gap:8px;font-size:12px;">
                                    <i class="fas ${cat?.icon||'fa-circle'}" style="color:${cat?.cor||'#9CA3AF'};width:14px;"></i>
                                    ${cat?.nome||catId}
                                </span>
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <div style="width:60px;height:4px;background:var(--bg-secondary);border-radius:2px;overflow:hidden;">
                                        <div style="width:${pct}%;height:100%;background:${cat?.cor||'#9CA3AF'};border-radius:2px;"></div>
                                    </div>
                                    <strong style="color:#EF4444;min-width:80px;text-align:right;">${Utils.formatCurrency(val)}</strong>
                                </div>
                            </div>`;
                        }).join('')}
                        <div class="dre-linha dre-total" style="border-top:2px solid var(--border-color);margin-top:8px;padding-top:10px;">
                            <span style="font-weight:700;">📊 (-) Total Despesas</span>
                            <strong style="color:#EF4444;">${Utils.formatCurrency(totalDesp)}</strong>
                        </div>
                        <div class="dre-linha dre-saldo" style="border-top:2px solid ${saldo>=0?'#10B981':'#EF4444'};margin-top:8px;padding-top:10px;">
                            <span style="font-size:16px;font-weight:800;">⚖️ SALDO</span>
                            <strong style="font-size:20px;color:${saldo>=0?'#10B981':'#EF4444'};">${Utils.formatCurrency(saldo)}</strong>
                        </div>
                    </div>
                </div>

                <!-- Modelos de Despesa -->
                <div class="card">
                    <div class="card-header flex-between">
                        <h3 class="card-title"><i class="fas fa-clone" style="color:var(--red-primary)"></i> Modelos de Despesa</h3>
                        <button class="btn-primary btn-sm" onclick="Modals.showModeloModal()">
                            <i class="fas fa-plus"></i> Novo Modelo
                        </button>
                    </div>
                    <div class="card-body" style="padding:${modelos.length?0:16}px;">
                        ${modelos.length > 0 ? `
                        <div style="display:flex;flex-direction:column;gap:0;">
                            ${modelos.map(m => {
                                const cat = CATEGORIAS_DESPESA.find(c => c.id === m.categoria);
                                return `
                                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border-color);">
                                    <div style="display:flex;align-items:center;gap:10px;">
                                        <div style="width:32px;height:32px;border-radius:8px;background:${cat?.cor||'#9CA3AF'}22;display:flex;align-items:center;justify-content:center;color:${cat?.cor||'#9CA3AF'};">
                                            <i class="fas ${cat?.icon||'fa-circle'}" style="font-size:13px;"></i>
                                        </div>
                                        <div>
                                            <div style="font-size:13px;font-weight:600;">${m.nome}</div>
                                            <div style="font-size:11px;color:var(--text-muted);">
                                                ${cat?.nome||m.categoria} · Todo dia ${m.dia_vencimento||'?'}
                                            </div>
                                        </div>
                                    </div>
                                    <div style="display:flex;align-items:center;gap:8px;">
                                        <strong style="color:#EF4444;font-size:13px;">${Utils.formatCurrency(m.valor||0)}</strong>
                                        <button class="kanban-btn kanban-btn-success" onclick="Pages.gerarDespesaModelo('${m.id}')" title="Gerar despesa deste mês">
                                            <i class="fas fa-magic"></i> Gerar
                                        </button>
                                        <button class="kanban-btn kanban-btn-danger" onclick="Pages.deletarModelo('${m.id}')" title="Remover modelo">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                        ` : `
                        <div style="text-align:center;padding:20px;color:var(--text-muted);">
                            <i class="fas fa-clone" style="font-size:32px;opacity:0.3;display:block;margin-bottom:8px;"></i>
                            <p style="font-size:13px;">Crie modelos para despesas recorrentes<br>como aluguel, energia, folha...</p>
                            <button class="btn-primary mt-2" onclick="Modals.showModeloModal()">
                                <i class="fas fa-plus"></i> Criar Modelo
                            </button>
                        </div>`}
                    </div>
                </div>

            </div>
        </div>
    </div>`;

        document.getElementById('pageContent').innerHTML = html;
    } catch (error) {
        console.error('Erro em renderGestaoFinanceira:', error);
        document.getElementById('pageContent').innerHTML = `
            <div class="empty-state" style="color:var(--danger)">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar Gestão Financeira.</p>
                <p style="font-size:12px;color:var(--text-muted);margin-top:10px;">${error.message}</p>
            </div>
        `;
    }
};

// ---- AÇÕES ----

Pages.mudarPeriodoFinanceiro = function() {
    const mes = document.getElementById('selectMesFin').value;
    const ano = document.getElementById('selectAnoFin').value;
    this.renderGestaoFinanceira(mes, ano);
};

Pages.marcarReceitaRecebida = async function(id) {
    const r = await ReceitasDB.atualizar(id, { status: 'Recebido', data_recebimento: new Date().toLocaleDateString('fr-CA') });
    if (r) { Utils.showToast('Receita marcada como recebida!', 'success'); Pages.renderGestaoFinanceira(); }
};
Pages.deletarReceita = async function(id) {
    if (!await Utils.confirm('Excluir esta receita?')) return;
    await ReceitasDB.deletar(id);
    Utils.showToast('Receita excluída.', 'success');
    Pages.renderGestaoFinanceira();
};
Pages.marcarDespesaPaga = async function(id) {
    const r = await DespesasDB.atualizar(id, { status: 'Pago', data_pagamento: new Date().toLocaleDateString('fr-CA') });
    if (r) { Utils.showToast('Despesa marcada como paga!', 'success'); Pages.renderGestaoFinanceira(); }
};
Pages.deletarDespesa = async function(id) {
    if (!await Utils.confirm('Excluir esta despesa?')) return;
    await DespesasDB.deletar(id);
    Utils.showToast('Despesa excluída.', 'success');
    Pages.renderGestaoFinanceira();
};
Pages.gerarDespesaModelo = async function(modeloId) {
    Utils.showLoading();
    const r = await ModelosDespesaDB.gerarDespesaDoMes(modeloId);
    Utils.hideLoading();
    if (r) { Utils.showToast('Despesa gerada com sucesso!', 'success'); Pages.renderGestaoFinanceira(); }
    else Utils.showToast('Erro ao gerar despesa.', 'error');
};
Pages.deletarModelo = async function(id) {
    if (!await Utils.confirm('Remover este modelo?')) return;
    await ModelosDespesaDB.deletar(id);
    Utils.showToast('Modelo removido.', 'success');
    Pages.renderGestaoFinanceira();
};

Pages.aprovarDespesa = async function(id) {
    const despesa = await DB.getById('despesas_evento', id) || await DB.getById('despesas', id);
    const tipo = despesa?.comprovante_url ? 'despesa de produção' : 'comissão';
    
    if (!await Utils.confirm(`Aprovar o pagamento desta ${tipo}?`)) return;
    Utils.showLoading();
    await DespesasDB.atualizar(id, { status: 'Pago' });
    Utils.hideLoading();
    Utils.showToast(`${tipo} aprovada e marcada como Paga!`, 'success');
    Pages.renderGestaoFinanceira();
};

Pages.rejeitarDespesa = async function(id) {
    if (!await Utils.confirm('Rejeitar e cancelar esta despesa?')) return;
    Utils.showLoading();
    await DespesasDB.deletar(id);
    Utils.hideLoading();
    Utils.showToast('Despesa rejeitada e removida.', 'success');
    Pages.renderGestaoFinanceira();
};
