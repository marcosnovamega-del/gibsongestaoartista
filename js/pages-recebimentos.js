/* ========================================
   GIBSON MANAGER PRO - PAINEL RECEBIMENTOS
   Geração automática de parcelas + alertas
======================================== */

// Gera parcelas no banco quando proposta é aceita
PropostasDB._gerarParcelasDoEvento = async function(proposta, eventoId) {
    try {
        let cronograma = [];
        try {
            const cond = JSON.parse(proposta.condicoes_pagamento || '{}');
            cronograma = cond.cronograma || [];
        } catch(e) { cronograma = []; }

        if (!cronograma.length) {
            // fallback: 1 parcela no dia do show
            cronograma = [{ pct: 100, dias_antes_show: 0, descricao: 'Pagamento integral', tipo: 'integral', numero: 1 }];
        }

        const showDate   = new Date(proposta.data_evento + 'T12:00:00');
        const cacheBruto = proposta.cache_bruto || 0;
        // Comissão agora é R$ fixo (não %)
        const comissaoEsc = proposta.comissao || 0;
        const liquido     = cacheBruto - comissaoEsc;
        const total       = cronograma.length;

        for (let i = 0; i < cronograma.length; i++) {
            const c    = cronograma[i];
            const dias = c.dias_antes_show !== undefined ? c.dias_antes_show : 0;
            const venc = new Date(showDate);
            venc.setDate(venc.getDate() + dias);

            // Usar valor fixo do cronograma se disponível; fallback para % do cachê bruto
            const valorParcela = c.valor !== undefined
                ? parseFloat(c.valor)
                : parseFloat((cacheBruto * (c.pct || 100) / 100).toFixed(2));

            await sbClient.from('parcelas').insert({
                evento_id:       eventoId,
                proposta_id:     proposta.id,
                valor:           valorParcela,
                data_vencimento: venc.toISOString().split('T')[0],
                status:          'Pendente',
                descricao:       c.descricao || `Parcela ${i+1}`,
                tipo:            c.tipo || 'parcela',
                numero_parcela:  c.numero || (i + 1),
                total_parcelas:  total,
                dias_antes_show: dias,
            });
        }

        // --- GERAR DESPESAS DE COMISSÃO AUTOMATICAMENTE ---
        const vendedorComissao = parseFloat(proposta.vendedor_comissao_valor) || 0;
        if (vendedorComissao > 0) {
            const nomeVendedor = proposta.vendedor_nome || proposta.vendedor_nome_fin || 'N/A';
            await sbClient.from('despesas').insert({
                evento_id:       eventoId,
                descricao:       `Comissão Vendedor – ${nomeVendedor}`,
                categoria:       'Comissão',
                valor:           vendedorComissao,
                status:          'Pendente',
                data_vencimento: proposta.data_evento || null,
                observacoes:     'Gerado automaticamente da venda.',
            });
            console.log(`✅ Despesa de comissão gerada para vendedor: ${nomeVendedor}`);
        }

        const parceiroComissao = parseFloat(proposta.parceiro_comissao_valor) || 0;
        if (proposta.parceiro_nome && parceiroComissao > 0) {
            await sbClient.from('despesas').insert({
                evento_id:       eventoId,
                descricao:       `Comissão Vendedor – ${proposta.parceiro_nome}`,
                categoria:       'Comissão',
                valor:           parceiroComissao,
                status:          'Pendente',
                data_vencimento: proposta.data_evento || null,
                observacoes:     'Comissão de parceiro — aguardando aprovação.',
            });
            console.log(`✅ Despesa de comissão gerada para parceiro: ${proposta.parceiro_nome}`);
        }

        DB.cache = {}; // limpar cache
        console.log(`✅ ${total} parcela(s) gerada(s) para evento ${eventoId}`);
    } catch(e) {
        console.error('Erro ao gerar parcelas:', e);
    }
};

// Painel de Recebimentos dentro do Financeiro
Pages.renderRecebimentos = async function() {
    document.getElementById('pageContent').innerHTML =
        '<div class="loading-container"><div class="loading-spinner"></div></div>';

    const [parcelas, eventos, artistas] = await Promise.all([
        ParcelasDB.listar(true),
        EventosDB.listar(),
        ArtistasDB.listar()
    ]);

    const hoje = new Date(); hoje.setHours(0,0,0,0);

    // Enriquecer e classificar
    const parcelasRicas = parcelas
        .filter(p => p.status !== 'Pago' || new Date(p.data_vencimento) >= new Date(Date.now() - 30*864e5))
        .map(p => {
            const ev   = eventos.find(e => e.id === p.evento_id);
            const art  = ev ? artistas.find(a => a.id === ev.artista_id) : null;
            const venc = new Date(p.data_vencimento + 'T12:00:00');
            const diff = Math.ceil((venc - hoje) / 86400000);
            let alerta = 'ok';
            if (p.status !== 'Pago') {
                if (diff < 0)  alerta = 'vencida';
                else if (diff <= 3)  alerta = 'critico';
                else if (diff <= 7)  alerta = 'urgente';
                else if (diff <= 15) alerta = 'atencao';
            }
            return { ...p, evento: ev, artista: art, venc, diff, alerta };
        })
        .sort((a, b) => a.venc - b.venc);

    // KPIs
    const pendentes  = parcelasRicas.filter(p => p.status === 'Pendente');
    const vencidas   = pendentes.filter(p => p.alerta === 'vencida');
    const criticos   = pendentes.filter(p => ['critico','urgente'].includes(p.alerta));
    const totalPend  = pendentes.reduce((s,p) => s + (p.valor||0), 0);
    const totalVenc  = vencidas.reduce((s,p)  => s + (p.valor||0), 0);

    const html = `
    <div class="receb-page">
        <div class="page-header flex-between mb-3">
            <div>
                <h2 style="display:flex;align-items:center;gap:10px;">
                    <i class="fas fa-bell" style="color:var(--red-primary)"></i> Controle de Recebimentos
                </h2>
                <p class="text-muted">Cronograma de pagamentos, alertas e shows futuros</p>
            </div>
            <button class="btn-secondary" onclick="Pages.renderFinanceiro()">
                <i class="fas fa-arrow-left"></i> Voltar ao Financeiro
            </button>
        </div>

        <!-- KPIs alerta -->
        <div class="grid grid-4 mb-3">
            <div class="stat-card" style="${vencidas.length > 0 ? 'border-color:#EF4444;' : ''}">
                <div class="stat-icon" style="background:rgba(239,68,68,0.15);"><i class="fas fa-exclamation-triangle" style="color:#EF4444;"></i></div>
                <div class="stat-content">
                    <h3 style="color:#EF4444;">${vencidas.length}</h3>
                    <p>Vencidas — ${Utils.formatCurrency(totalVenc)}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon yellow"><i class="fas fa-clock"></i></div>
                <div class="stat-content"><h3>${criticos.length}</h3><p>Vencem em até 7 dias</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon blue"><i class="fas fa-calendar-check"></i></div>
                <div class="stat-content"><h3>${pendentes.length}</h3><p>Pendentes no total</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><i class="fas fa-hand-holding-usd"></i></div>
                <div class="stat-content"><h3>${Utils.formatCurrency(totalPend)}</h3><p>Total a Receber</p></div>
            </div>
        </div>

        <!-- Timeline de parcelas -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">
                    <i class="fas fa-calendar-alt" style="color:var(--red-primary)"></i>
                    Cronograma de Recebimentos
                </h3>
            </div>
            <div class="card-body" style="padding:0;overflow-x:auto;">
                <table class="balanco-tabela">
                    <thead>
                        <tr>
                            <th>Alerta</th>
                            <th>Artista / Evento</th>
                            <th>Descrição</th>
                            <th>Vencimento</th>
                            <th>Dias</th>
                            <th>Valor</th>
                            <th>Status</th>
                            <th>Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${parcelasRicas.map(p => Pages._renderParcelaRow(p)).join('')}
                    </tbody>
                </table>
                ${!parcelasRicas.length ? '<div class="empty-state"><i class="fas fa-check-circle" style="color:var(--success)"></i><p>Nenhum recebimento pendente!</p></div>' : ''}
            </div>
        </div>
    </div>`;

    document.getElementById('pageContent').innerHTML = html;
};

Pages._renderParcelaRow = function(p) {
    const alertaCfg = {
        vencida:  { cor: '#EF4444', icone: '🔴', label: 'VENCIDA'  },
        critico:  { cor: '#EF4444', icone: '🔴', label: 'CRÍTICO'  },
        urgente:  { cor: '#F59E0B', icone: '🟡', label: 'URGENTE'  },
        atencao:  { cor: '#F59E0B', icone: '🟡', label: 'ATENÇÃO'  },
        ok:       { cor: '#10B981', icone: '🟢', label: 'OK'       },
    };
    const cfg  = alertaCfg[p.alerta] || alertaCfg.ok;
    const pago = p.status === 'Pago';

    return `<tr style="${!pago && p.alerta !== 'ok' ? `background:${cfg.cor}08;` : ''}">
        <td>
            <span style="font-size:18px;" title="${cfg.label}">${pago ? '✅' : cfg.icone}</span>
        </td>
        <td>
            <div style="display:flex;align-items:center;gap:8px;">
                <img src="${p.artista?.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.artista?.nome||'?')}&background=E10600&color=fff&size=40`}"
                     style="width:26px;height:26px;border-radius:50%;object-fit:cover;flex-shrink:0;">
                <div>
                    <div style="font-weight:600;font-size:12px;">${p.artista?.nome || '—'}</div>
                    <div style="font-size:10px;color:var(--text-muted);">${p.evento?.local || ''} · ${p.evento?.data ? Utils.formatDate(p.evento.data) : ''}</div>
                </div>
            </div>
        </td>
        <td style="font-size:12px;">
            ${p.descricao || '—'}
            ${p.total_parcelas > 1 ? `<span style="color:var(--text-muted);font-size:10px;"> (${p.numero_parcela}/${p.total_parcelas})</span>` : ''}
        </td>
        <td style="font-size:12px;font-weight:600;color:${pago ? 'var(--text-muted)' : cfg.cor};">
            ${p.data_vencimento ? Utils.formatDate(p.data_vencimento) : '—'}
        </td>
        <td style="text-align:center;">
            ${pago ? '<span style="color:var(--text-muted);font-size:11px;">pago</span>' : `
            <span style="font-size:12px;font-weight:700;color:${cfg.cor};">
                ${p.diff < 0 ? `${Math.abs(p.diff)}d atraso` : p.diff === 0 ? 'HOJE' : `${p.diff}d`}
            </span>`}
        </td>
        <td style="font-size:13px;font-weight:700;color:${pago ? 'var(--text-muted)' : 'var(--success)'};">
            ${Utils.formatCurrency(p.valor || 0)}
        </td>
        <td>
            <span style="font-size:10px;padding:3px 8px;border-radius:10px;font-weight:700;
                background:${pago ? 'rgba(107,114,128,0.15)' : p.alerta==='vencida'||p.alerta==='critico' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'};
                color:${pago ? '#6B7280' : p.alerta==='vencida'||p.alerta==='critico' ? '#EF4444' : '#F59E0B'};">
                ${pago ? 'Pago' : 'Pendente'}
            </span>
        </td>
        <td>
            ${!pago ? `
            <button class="btn-primary btn-sm" onclick="Pages.marcarParcelaPaga('${p.id}')">
                <i class="fas fa-check"></i> Recebido
            </button>` : ''}
            ${(!pago && p.evento?.artista_id) ? `
            <button class="btn-secondary btn-sm" style="color:#25D366;margin-top:2px;"
                    onclick="Pages.alertaWhatsApp('${p.id}')">
                <i class="fab fa-whatsapp"></i>
            </button>` : ''}
        </td>
    </tr>`;
};

Pages.marcarParcelaPaga = async function(parcelaId) {
    const ok = await Utils.confirm('Confirmar recebimento desta parcela?');
    if (!ok) return;
    Utils.showLoading();
    const r = await ParcelasDB.marcarPaga(parcelaId);
    Utils.hideLoading();
    if (r) {
        await AuditDB.registrar({ acao: 'EDITAR', modulo: 'financeiro', registroId: parcelaId, descricao: 'Parcela marcada como paga' });
        Utils.showToast('Pagamento registrado!', 'success');
        Pages.renderRecebimentos();
    }
};

Pages.alertaWhatsApp = async function(parcelaId) {
    const { data: p } = await sbClient.from('parcelas').select('*').eq('id', parcelaId).single();
    if (!p) return;
    const ev  = await EventosDB.buscarPorId(p.evento_id);
    const msg = `🔔 *LEMBRETE DE PAGAMENTO*\n\nOlá! Segue lembrete do pagamento referente ao show:\n\n📍 *${ev?.local || '—'}* — ${ev?.cidade || ''}/${ev?.estado || ''}\n📅 Data do show: ${ev?.data ? Utils.formatDate(ev.data) : '—'}\n\n💰 *Valor:* ${Utils.formatCurrency(p.valor)}\n📆 *Vencimento:* ${p.data_vencimento ? Utils.formatDate(p.data_vencimento) : '—'}\n📝 *Ref:* ${p.descricao || '—'}\n\nQualquer dúvida, estamos à disposição! ✅`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
};
