/* ========================================
   KSHOW MANAGER - PÁGINA DE VENDAS
   Kanban pipeline + rider + media kit + rotas
======================================== */

Pages.renderVendas = async function() {
    document.getElementById('pageContent').innerHTML =
        '<div class="loading-container"><div class="loading-spinner"></div></div>';

    const [propostas, contratos, eventos, artistas] = await Promise.all([
        PropostasDB.listar(true),
        ContratosDB.listar(),
        EventosDB.listar(),
        ArtistasDB.listar()
    ]);

    // Enriquecer propostas e detectar se contrato foi assinado
    const propostasRicas = [];
    for (const p of propostas) {
        const artista   = artistas.find(a => a.id === p.artista_id);
        // Buscar evento gerado a partir dessa proposta (por datas + artista)
        const eventoGerado = eventos.find(e =>
            e.artista_id === p.artista_id &&
            e.data === p.data_evento &&
            (e.local === p.local_evento || !p.local_evento || !e.local)
        );
        
        let contratoObj = eventoGerado
            ? contratos.find(c => c.evento_id === eventoGerado.id)
            : null;

        // Auto-reparo: Se a proposta está 'Aceita', tem evento gerado, mas NÃO tem contrato, geramos agora
        if (p.status === 'Aceita' && eventoGerado && !contratoObj) {
            if (typeof Modals !== 'undefined' && typeof Modals.gerarContratoEvento === 'function') {
                await Modals.gerarContratoEvento(eventoGerado.id, p.artista_id);
                contratoObj = { status: 'Pendente' }; // Mock temporário para a tela
            }
        }

        const contratoAssinado = contratoObj && contratoObj.status === 'Assinado' ? contratoObj : null;

        propostasRicas.push({ ...p, artista, eventoGerado, contratoAssinado });
    }

    // Separar por coluna do Kanban
    const col1 = propostasRicas.filter(p => p.status === 'Rascunho');
    const col2 = propostasRicas.filter(p => p.status === 'Enviada');
    const col3 = propostasRicas.filter(p => p.status === 'Aceita' && !p.contratoAssinado);
    const col4 = propostasRicas.filter(p => p.status === 'Aceita' && !!p.contratoAssinado);

    // Shows assinados para rota (todos contratos assinados)
    const contratosAssinados = [];
    for (const c of contratos.filter(c => c.status === 'Assinado')) {
        const ev = eventos.find(e => e.id === c.evento_id);
        const ar = ev ? artistas.find(a => a.id === ev.artista_id) : null;
        contratosAssinados.push({ ...c, evento: ev, artista: ar });
    }

    // KPIs
    const totalPropostas  = propostasRicas.length;
    const emNegociacao    = col2.length;
    const aguardandoAssin = col3.length;
    const fechados        = col4.length;
    const receitaFechada  = col4.reduce((s, p) => s + (p.cache_bruto || 0), 0);

    const html = `
    <div class="vendas-page">

        <!-- Header -->
        <div class="page-header flex-between mb-3">
            <div>
                <h2 style="display:flex;align-items:center;gap:10px;">
                    <i class="fas fa-route" style="color:var(--brand-primary)"></i> Vendas & Rotas
                </h2>
                <p class="text-muted">Pipeline de propostas, rider, media kit e oportunidades de rota</p>
            </div>
            <button class="btn-primary" onclick="Modals.showPropostaModal()">
                <i class="fas fa-plus"></i> Nova Proposta
            </button>
        </div>

        <!-- KPIs -->
        <div class="grid grid-4 mb-3">
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(107,114,128,0.15);">
                    <i class="fas fa-file-alt" style="color:#9CA3AF"></i>
                </div>
                <div class="stat-content"><h3>${totalPropostas}</h3><p>Total Propostas</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon yellow"><i class="fas fa-paper-plane"></i></div>
                <div class="stat-content"><h3>${emNegociacao}</h3><p>Em Negociação</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(59,130,246,0.15);">
                    <i class="fas fa-file-contract" style="color:#3B82F6"></i>
                </div>
                <div class="stat-content"><h3>${aguardandoAssin}</h3><p>Aguard. Assinatura</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><i class="fas fa-trophy"></i></div>
                <div class="stat-content">
                    <h3>${Utils.formatCurrency(receitaFechada)}</h3>
                    <p>Receita Fechada (${fechados} shows)</p>
                </div>
            </div>
        </div>

        <!-- KANBAN PIPELINE -->
        <div class="card mb-3">
            <div class="card-header flex-between">
                <h3 class="card-title">
                    <i class="fas fa-columns" style="color:var(--brand-primary)"></i>
                    Pipeline de Propostas
                </h3>
                <button class="btn-primary btn-sm" onclick="Modals.showPropostaModal()">
                    <i class="fas fa-plus"></i> Nova Proposta
                </button>
            </div>
            <div class="card-body" style="padding:0 16px 16px;">
                <div class="kanban-board">

                    <!-- Coluna 1: Proposta -->
                    <div class="kanban-col">
                        <div class="kanban-col-header" style="border-top:3px solid #9CA3AF;">
                            <span class="kanban-col-title">
                                <i class="fas fa-file-alt"></i> Proposta
                            </span>
                            <span class="kanban-count">${col1.length}</span>
                        </div>
                        <div class="kanban-cards">
                            ${col1.length > 0
                                ? col1.map(p => Pages._renderKanbanCard(p, 1)).join('')
                                : '<div class="kanban-empty">Nenhuma proposta em rascunho</div>'}
                        </div>
                    </div>

                    <!-- Coluna 2: Enviada / Em Negociação -->
                    <div class="kanban-col">
                        <div class="kanban-col-header" style="border-top:3px solid #F59E0B;">
                            <span class="kanban-col-title">
                                <i class="fas fa-paper-plane"></i> Em Negociação
                            </span>
                            <span class="kanban-count" style="background:rgba(245,158,11,0.2);color:#F59E0B;">${col2.length}</span>
                        </div>
                        <div class="kanban-cards">
                            ${col2.length > 0
                                ? col2.map(p => Pages._renderKanbanCard(p, 2)).join('')
                                : '<div class="kanban-empty">Nenhuma proposta enviada</div>'}
                        </div>
                    </div>

                    <!-- Coluna 3: Contrato Emitido / Aguardando Assinatura -->
                    <div class="kanban-col">
                        <div class="kanban-col-header" style="border-top:3px solid #3B82F6;">
                            <span class="kanban-col-title">
                                <i class="fas fa-file-contract"></i> Contrato Emitido
                            </span>
                            <span class="kanban-count" style="background:rgba(59,130,246,0.2);color:#3B82F6;">${col3.length}</span>
                        </div>
                        <div class="kanban-cards">
                            ${col3.length > 0
                                ? col3.map(p => Pages._renderKanbanCard(p, 3)).join('')
                                : '<div class="kanban-empty">Nenhum contrato aguardando</div>'}
                        </div>
                    </div>

                    <!-- Coluna 4: FECHADO (verde) -->
                    <div class="kanban-col kanban-col-fechado">
                        <div class="kanban-col-header" style="border-top:3px solid #10B981;">
                            <span class="kanban-col-title">
                                <i class="fas fa-trophy"></i> Fechado ✓
                            </span>
                            <span class="kanban-count" style="background:rgba(16,185,129,0.2);color:#10B981;">${col4.length}</span>
                        </div>
                        <div class="kanban-cards">
                            ${col4.length > 0
                                ? col4.map(p => Pages._renderKanbanCard(p, 4)).join('')
                                : '<div class="kanban-empty">Assine contratos para ver aqui</div>'}
                        </div>
                    </div>

                </div>
            </div>
        </div>

        <!-- Materiais do Artista -->
        <div class="card mb-3">
            <div class="card-header">
                <h3 class="card-title">
                    <i class="fas fa-box-open" style="color:var(--brand-primary)"></i>
                    Materiais do Artista — Rider & Media Kit
                </h3>
            </div>
            <div class="card-body">
                <div class="artistas-materiais-grid">
                    ${artistas.map(a => Pages._renderArtistaMateriais(a)).join('')}
                </div>
            </div>
        </div>

        <!-- Oportunidades de Rota -->
        ${contratosAssinados.length > 0 ? `
            <div class="card mb-3">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-route" style="color:var(--brand-primary)"></i>
                        Shows Fechados — Oportunidades de Rota
                    </h3>
                </div>
                <div class="card-body">
                    <div style="display:flex;flex-direction:column;gap:12px;">
                        ${contratosAssinados.map(c => Pages._renderVendasShowCard(c)).join('')}
                    </div>
                </div>
            </div>
        ` : ''}

    </div>`;

    document.getElementById('pageContent').innerHTML = html;
};

// ============================================================
// KANBAN CARD
// ============================================================
Pages._renderKanbanCard = function(p, coluna) {
    const nomeCliente = p.tipo_contratante === 'PF'
        ? (p.nome_contratante || '—')
        : (p.razao_social     || '—');

    const vencida = p.validade && new Date(p.validade) < new Date();
    const isFechado = coluna === 4;

    return `
        <div class="kanban-card ${isFechado ? 'kanban-card-fechado' : ''}">
            ${isFechado ? '<div class="kanban-fechado-glow"></div>' : ''}
            <div class="kanban-card-top">
                <img src="${p.artista?.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.artista?.nome||'?')}&background=8B5CF6&color=fff&size=80`}"
                     class="kanban-foto" alt="">
                <div class="kanban-card-info">
                    <div class="kanban-artista">${p.artista?.nome || '—'}</div>
                    <div class="kanban-cliente"><i class="fas fa-user-tie"></i> ${nomeCliente}</div>
                </div>
                ${isFechado ? '<i class="fas fa-check-circle" style="color:#10B981;font-size:18px;"></i>' : ''}
            </div>
            <div class="kanban-card-body">
                <div class="kanban-meta">
                    <i class="fas fa-map-marker-alt"></i>
                    ${p.cidade_evento || '—'}/${p.estado_evento || '—'}
                </div>
                <div class="kanban-meta">
                    <i class="fas fa-calendar"></i>
                    ${p.data_evento ? Utils.formatDate(p.data_evento) : '—'}
                </div>
                <div class="kanban-meta" style="color:${isFechado ? '#10B981' : 'var(--success)'}; font-weight:600;">
                    <i class="fas fa-dollar-sign"></i>
                    ${Utils.formatCurrency(p.cache_bruto || 0)}
                </div>
                ${vencida && !isFechado ? '<div style="color:var(--danger);font-size:10px;margin-top:4px;"><i class="fas fa-exclamation-triangle"></i> Validade vencida</div>' : ''}
            </div>
            <div class="kanban-card-actions">
                ${coluna === 1 ? `
                    <button class="kanban-btn" onclick="Modals.showPropostaModal('${p.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="kanban-btn kanban-btn-whatsapp" onclick="Pages.enviarPropostaWhatsApp('${p.id}')" title="Enviar WhatsApp">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                    <button class="kanban-btn" onclick="Pages.marcarPropostaEnviada('${p.id}')" title="Marcar Enviada">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                    <button class="kanban-btn kanban-btn-danger" onclick="Pages.deletarProposta('${p.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
                ${coluna === 2 ? `
                    <button class="kanban-btn kanban-btn-whatsapp" onclick="Pages.enviarPropostaWhatsApp('${p.id}')" title="Enviar WhatsApp">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                    <button class="kanban-btn kanban-btn-success" onclick="Pages.aceitarProposta('${p.id}')" title="Aceitar → Criar Evento">
                        <i class="fas fa-check"></i> Aceitar
                    </button>
                    <button class="kanban-btn kanban-btn-danger" onclick="Pages.recusarProposta('${p.id}')" title="Recusar">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
                ${coluna === 3 ? `
                    <button class="kanban-btn kanban-btn-success" onclick="Pages.assinarContratoModal('${p.eventoGerado?.id || ''}', '${p.id}')" title="Ver e Assinar Contrato">
                        <i class="fas fa-file-signature"></i> Assinar Contrato
                    </button>
                ` : ''}
                ${coluna === 4 ? `
                    <button class="kanban-btn kanban-btn-rota" onclick="RouteSuggestions.mostrarSugestoesRota('${p.eventoGerado?.id || ''}')" title="Ver Rota">
                        <i class="fas fa-route"></i> Ver Rota
                    </button>
                ` : ''}
            </div>
        </div>
    `;
};

// ============================================================
// CARDS AUXILIARES
// ============================================================
Pages._renderArtistaMateriais = function(a) {
    return `
        <div class="artista-material-card">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                <img src="${a.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.nome)}&background=8B5CF6&color=fff&size=80`}"
                     style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--border-color);">
                <div>
                    <strong style="font-size:14px;">${a.nome}</strong>
                    <p style="margin:0;font-size:11px;color:var(--text-muted);">${a.genero || 'Sem gênero'}</p>
                </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
                <div class="material-row">
                    <span class="material-label"><i class="fas fa-music"></i> Rider Técnico</span>
                    <div class="material-actions">
                        ${a.rider_url ? `
                            <a href="${a.rider_url}" target="_blank" class="btn-secondary btn-sm"><i class="fas fa-eye"></i></a>
                            <button class="btn-secondary btn-sm" style="color:#25D366"
                                    onclick="Pages.enviarMaterialWhatsApp('${a.id}','rider')">
                                <i class="fab fa-whatsapp"></i>
                            </button>
                        ` : '<span style="font-size:11px;color:var(--text-muted);">Não enviado</span>'}
                        <button class="btn-secondary btn-sm" onclick="Pages.uploadMaterial('${a.id}','rider')" title="Upload">
                            <i class="fas fa-upload"></i>
                        </button>
                    </div>
                </div>
                <div class="material-row">
                    <span class="material-label"><i class="fas fa-images"></i> Media Kit</span>
                    <div class="material-actions">
                        ${a.media_kit_url ? `
                            <a href="${a.media_kit_url}" target="_blank" class="btn-secondary btn-sm"><i class="fas fa-eye"></i></a>
                            <button class="btn-secondary btn-sm" style="color:#25D366"
                                    onclick="Pages.enviarMaterialWhatsApp('${a.id}','media_kit')">
                                <i class="fab fa-whatsapp"></i>
                            </button>
                        ` : '<span style="font-size:11px;color:var(--text-muted);">Não enviado</span>'}
                        <button class="btn-secondary btn-sm" onclick="Pages.uploadMaterial('${a.id}','media_kit')" title="Upload">
                            <i class="fas fa-upload"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
};

Pages._renderVendasShowCard = function(c) {
    return `
        <div class="vendas-show-card">
            <div class="vendas-show-left">
                <img src="${c.artista?.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.artista?.nome||'?')}&background=8B5CF6&color=fff&size=80`}"
                     class="vendas-artista-foto" alt="">
                <div class="vendas-show-info">
                    <div class="vendas-show-nome">${c.artista?.nome || '—'}</div>
                    <div class="vendas-show-local">
                        <i class="fas fa-map-marker-alt"></i>
                        ${c.evento?.local || '—'} — <strong>${c.evento?.cidade || ''}/${c.evento?.estado || ''}</strong>
                    </div>
                    <div class="vendas-show-meta">
                        <span><i class="fas fa-calendar"></i> ${c.evento ? Utils.formatDate(c.evento.data) : '—'}</span>
                        <span><i class="fas fa-clock"></i> ${c.evento?.horario || '—'}</span>
                        <span style="color:var(--success)"><i class="fas fa-dollar-sign"></i> ${Utils.formatCurrency(c.evento?.cache_bruto || 0)}</span>
                    </div>
                </div>
            </div>
            <div class="vendas-show-right">
                <span class="badge" style="background:rgba(16,185,129,0.15);color:var(--success);margin-bottom:8px;">
                    <i class="fas fa-check-circle"></i> Contrato Assinado
                </span>
                <button class="btn-primary" onclick="RouteSuggestions.mostrarSugestoesRota('${c.id}')">
                    <i class="fas fa-route"></i> Ver Oportunidades de Rota
                </button>
            </div>
        </div>
    `;
};

// ============================================================
// AÇÕES
// ============================================================
Pages.marcarPropostaEnviada = async function(id) {
    const r = await PropostasDB.atualizarStatus(id, 'Enviada');
    if (r) { Utils.showToast('Proposta marcada como Enviada!', 'success'); Pages.renderVendas(); }
};

Pages.aceitarProposta = async function(id) {
    const ok = await Utils.confirm('Aceitar esta proposta e criar o evento + contrato automaticamente?');
    if (!ok) return;
    Utils.showLoading();
    const evento = await PropostasDB.converterParaEvento(id);
    Utils.hideLoading();
    if (evento) {
        Utils.showToast('🎉 Proposta aceita! Evento e contrato criados.', 'success');
        Pages.renderVendas();
    } else {
        Utils.showToast('Erro ao converter proposta em evento.', 'error');
    }
};

Pages.recusarProposta = async function(id) {
    const ok = await Utils.confirm('Marcar esta proposta como Recusada?');
    if (!ok) return;
    const r = await PropostasDB.atualizarStatus(id, 'Recusada');
    if (r) { Utils.showToast('Proposta recusada.', 'info'); Pages.renderVendas(); }
};

Pages.deletarProposta = async function(id) {
    const ok = await Utils.confirm('Excluir esta proposta permanentemente?');
    if (!ok) return;
    Utils.showLoading();
    const r = await PropostasDB.deletar(id);
    Utils.hideLoading();
    if (r) { Utils.showToast('Proposta excluída.', 'success'); Pages.renderVendas(); }
    else Utils.showToast('Erro ao excluir proposta.', 'error');
};

Pages.enviarPropostaWhatsApp = async function(id) {
    const p = await PropostasDB.buscarPorId(id);
    if (!p) return;
    const artista = await ArtistasDB.buscarPorId(p.artista_id);
    const config  = await ConfigDB.obter();
    const empresa = config?.nome_empresa || 'Gibson Manager';

    const msg = [
        `🎵 *PROPOSTA COMERCIAL — ${empresa.toUpperCase()}*`,
        ``,
        `Olá, *${p.responsavel}*!`,
        ``,
        `Segue proposta para o show de *${artista?.nome || ''}*:`,
        ``,
        `📅 *Data:* ${p.data_evento ? Utils.formatDate(p.data_evento) : '—'} às ${p.horario || '—'}`,
        `📍 *Local:* ${p.local_evento || '—'} — ${p.cidade_evento || ''}/${p.estado_evento || ''}`,
        `🎤 *Tipo:* ${p.tipo_evento || '—'}`,
        ``,
        `💰 *Cachê:* ${Utils.formatCurrency(p.cache_bruto || 0)}`,
        `💳 *Pagamento:* ${p.condicoes_pagamento || '—'}`,
        ``,
        p.observacoes ? `📝 *Obs:* ${p.observacoes}\n` : '',
        `⏰ *Válida até:* ${p.validade ? Utils.formatDate(p.validade) : '—'}`,
        ``,
        `Qualquer dúvida, estamos à disposição! ✅`,
    ].filter(Boolean).join('\n');

    const tel = p.telefone?.replace(/\D/g, '');
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank');

    if (p.status === 'Rascunho') {
        await PropostasDB.atualizarStatus(id, 'Enviada');
        Pages.renderVendas();
    }
};

Pages.enviarMaterialWhatsApp = async function(artistaId, tipo) {
    const artista = await ArtistasDB.buscarPorId(artistaId);
    if (!artista) return;
    const url  = tipo === 'rider' ? artista.rider_url : artista.media_kit_url;
    const nome = tipo === 'rider' ? 'Rider Técnico' : 'Media Kit';
    if (!url) { Utils.showToast(`${nome} não disponível. Faça o upload primeiro.`, 'error'); return; }
    const msg = `🎵 *${nome} — ${artista.nome}*\n\nLink para download:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
};

Pages.uploadMaterial = async function(artistaId, tipo) {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = '.pdf,.zip,image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        Utils.showLoading();
        const result = await Storage.upload(file, `materiais/${artistaId}`, 'gibson-docs');
        if (result?.url) {
            const field = tipo === 'rider' ? 'rider_url' : 'media_kit_url';
            await ArtistasDB.atualizar(artistaId, { [field]: result.url });
            Utils.showToast('Upload realizado com sucesso!', 'success');
            Pages.renderVendas();
        } else {
            Utils.showToast('Erro no upload.', 'error');
        }
        Utils.hideLoading();
    };
    input.click();
};

// ============================================================
// MODAL DE ASSINATURA DE CONTRATO (inline, sem sair de Vendas)
// ============================================================
Pages.assinarContratoModal = async function(eventoId, propostaId) {
    Utils.showLoading();

    // Se o eventoId não foi passado, buscar pelo propostaId
    if (!eventoId || eventoId === 'undefined' || eventoId === '') {
        const proposta = await PropostasDB.buscarPorId(propostaId);
        if (proposta) {
            // Tentar achar o evento vinculado
            const eventosArtista = await EventosDB.buscarPorArtista(proposta.artista_id);
            const ev = eventosArtista.find(e =>
                e.data === proposta.data_evento &&
                (e.status === 'Aguardando Assinatura' || e.status === 'Reserva' || e.status === 'Confirmado')
            );
            if (ev) {
                eventoId = ev.id;
            } else {
                // Criar evento agora a partir da proposta
                const novoEvento = await EventosDB.criar({
                    artista_id:   proposta.artista_id,
                    data:         proposta.data_evento,
                    horario:      proposta.horario || '00:00',
                    local:        proposta.local_evento || 'A definir',
                    cidade:       proposta.cidade_evento || 'A definir',
                    estado:       proposta.estado_evento || 'NA',
                    tipo_evento:  proposta.tipo_evento || 'Show',
                    cache_bruto:  proposta.cache_bruto || 0,
                    status:       'Aguardando Assinatura'
                });
                if (novoEvento) eventoId = novoEvento.id;
            }
        }
    }

    if (!eventoId || eventoId === 'undefined' || eventoId === '') {
        Utils.hideLoading();
        Utils.showToast('Não foi possível encontrar o evento desta proposta.', 'error');
        return;
    }

    let contrato = await ContratosDB.buscarPorEvento(eventoId);

    // Se o contrato ainda não existe, gera agora (auto-reparo)
    if (!contrato) {
        const proposta = await PropostasDB.buscarPorId(propostaId);
        if (proposta) {
            await EventosDB.gerarContratoEvento(eventoId, proposta.artista_id);
            contrato = await ContratosDB.buscarPorEvento(eventoId);
        }
    }
    Utils.hideLoading();

    if (!contrato) {
        Utils.showToast('Não foi possível gerar o contrato. Verifique se o artista possui modelo de contrato cadastrado.', 'error');
        return;
    }

    const jaAssinado = contrato.status === 'Assinado';
    const conteudo = (contrato.conteudo || 'Conteúdo do contrato não disponível.')
        .replace(/\n/g, '<br>');

    const html = `
        <div class="modal-overlay" onclick="if(event.target===this)this.remove()">
            <div class="modal" style="max-width:860px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-file-signature"></i>
                        ${jaAssinado ? '✅ Contrato Assinado' : 'Assinar Contrato'}
                    </h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="max-height:60vh;overflow-y:auto;">
                    ${jaAssinado ? `<div style="background:rgba(16,185,129,0.1);border:1px solid #10B981;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#10B981;font-weight:600;">
                        <i class="fas fa-check-circle"></i> Contrato assinado em ${Utils.formatDate(contrato.data_assinatura)}
                    </div>` : `<div style="background:rgba(245,158,11,0.1);border:1px solid #F59E0B;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#F59E0B;font-weight:600;">
                        <i class="fas fa-exclamation-triangle"></i> Aguardando assinatura do contratante
                    </div>`}
                    <div style="background:var(--bg-secondary);border-radius:8px;padding:20px;font-size:13px;line-height:1.7;color:var(--text-primary);white-space:pre-wrap;font-family:Georgia,serif;">
                        ${conteudo}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Fechar
                    </button>
                    ${!jaAssinado ? `
                    <button class="btn-primary" onclick="Pages._confirmarAssinatura('${contrato.id}', this)" style="background:#10B981;border-color:#10B981;">
                        <i class="fas fa-pen-nib"></i> Confirmar Assinatura
                    </button>` : ''}
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = html;
};

Pages._confirmarAssinatura = async function(contratoId, btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Assinando...';
    Utils.showLoading();

    const result = await ContratosDB.assinar(contratoId);
    Utils.hideLoading();

    if (result) {
        Utils.showToast('🎉 Contrato assinado! Evento confirmado na agenda.', 'success');
        document.querySelector('.modal-overlay')?.remove();
        Pages.renderVendas();
    } else {
        Utils.showToast('Erro ao assinar contrato.', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-pen-nib"></i> Confirmar Assinatura';
    }
};

// ============================================================
// PÁGINA DE PROPOSTAS (aba dedicada)
// ============================================================
Pages.renderPropostas = async function() {
    document.getElementById('pageContent').innerHTML =
        '<div class="loading-container"><div class="loading-spinner"></div></div>';

    const [propostas, artistas, eventos, contratos] = await Promise.all([
        PropostasDB.listar(true),
        ArtistasDB.listar(),
        EventosDB.listar(),
        ContratosDB.listar()
    ]);

    // Enriquecer propostas com artista, evento e contrato vinculado
    const propostasRicas = propostas.map(p => {
        const artista = artistas.find(a => a.id === p.artista_id);
        const eventoGerado = eventos.find(e =>
            e.artista_id === p.artista_id &&
            e.data === p.data_evento
        );
        const contrato = eventoGerado
            ? contratos.find(c => c.evento_id === eventoGerado.id)
            : null;
        return { ...p, artista, eventoGerado, contrato };
    }).sort((a, b) => {
        // Ordenar: mais recentes primeiro
        const da = new Date(a.data_evento || a.created_at || 0);
        const db2 = new Date(b.data_evento || b.created_at || 0);
        return db2 - da;
    });

    // KPIs
    const total = propostasRicas.length;
    const rascunhos  = propostasRicas.filter(p => p.status === 'Rascunho').length;
    const enviadas   = propostasRicas.filter(p => p.status === 'Enviada').length;
    const aceitas    = propostasRicas.filter(p => p.status === 'Aceita').length;
    const recusadas  = propostasRicas.filter(p => p.status === 'Recusada').length;

    const _statusBadge = (s) => {
        const map = {
            'Rascunho':  'badge-secondary',
            'Enviada':   'badge-warning',
            'Aceita':    'badge-success',
            'Recusada':  'badge-danger',
        };
        return `<span class="badge ${map[s] || 'badge-secondary'}">${s}</span>`;
    };

    const _renderCronograma = (p) => {
        let cronograma = [];
        if (p.condicoes_pagamento) {
            try {
                const cond = typeof p.condicoes_pagamento === 'string'
                    ? JSON.parse(p.condicoes_pagamento)
                    : p.condicoes_pagamento;
                cronograma = cond.cronograma || [];
            } catch(e) {}
        }

        const cacheBruto = p.cache_bruto || 0;
        const comissao   = p.comissao || 10;
        const liquido    = cacheBruto - (cacheBruto * comissao / 100);
        const dataEvento = p.data_evento ? new Date(p.data_evento + 'T12:00:00') : null;

        if (!cronograma.length) {
            return `<p class="text-muted" style="font-size:13px;margin:0;">
                <i class="fas fa-info-circle"></i> Pagamento integral no dia do show
                (${Utils.formatCurrency(liquido)})
            </p>`;
        }

        return `
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                    <tr style="border-bottom:1px solid var(--border-color);">
                        <th style="padding:6px 8px;text-align:left;color:var(--text-muted);font-weight:500;">#</th>
                        <th style="padding:6px 8px;text-align:left;color:var(--text-muted);font-weight:500;">Descrição</th>
                        <th style="padding:6px 8px;text-align:right;color:var(--text-muted);font-weight:500;">Valor</th>
                        <th style="padding:6px 8px;text-align:left;color:var(--text-muted);font-weight:500;">Vencimento</th>
                    </tr>
                </thead>
                <tbody>
                    ${cronograma.map((item, i) => {
                        // Compatível com registros antigos (pct) e novos (valor)
                        const valor = item.valor !== undefined ? item.valor : liquido * (item.pct || 100) / 100;
                        let vencText = '—';
                        if (dataEvento && item.dias_antes_show !== undefined) {
                            const venc = new Date(dataEvento);
                            venc.setDate(venc.getDate() + (item.dias_antes_show || 0));
                            vencText = Utils.formatDate(venc.toISOString().split('T')[0]);
                        }
                        return `<tr style="border-bottom:1px solid var(--border-color);">
                            <td style="padding:6px 8px;">${item.numero || (i+1)}</td>
                            <td style="padding:6px 8px;">${item.descricao || 'Parcela ' + (i+1)}</td>
                            <td style="padding:6px 8px;text-align:right;color:var(--success);font-weight:600;">
                                ${Utils.formatCurrency(valor)}
                            </td>
                            <td style="padding:6px 8px;">${vencText}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2" style="padding:8px;text-align:right;font-weight:600;color:var(--text-muted);">Total líquido:</td>
                        <td style="padding:8px;text-align:right;font-weight:700;color:var(--success);">
                            ${Utils.formatCurrency(liquido)}
                        </td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>`;
    };

    const html = `
    <div class="fade-in">
        <!-- Header -->
        <div class="page-header flex-between mb-3">
            <div>
                <h2 style="display:flex;align-items:center;gap:10px;">
                    <i class="fas fa-file-alt" style="color:var(--brand-primary)"></i> Propostas
                </h2>
                <p class="text-muted">Todas as propostas geradas — com cronograma de pagamento</p>
            </div>
            <button class="btn-primary" onclick="Modals.showPropostaModal()">
                <i class="fas fa-plus"></i> Nova Proposta
            </button>
        </div>

        <!-- KPIs -->
        <div class="grid grid-4 mb-3">
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(107,114,128,0.15);">
                    <i class="fas fa-file-alt" style="color:#9CA3AF"></i>
                </div>
                <div class="stat-content"><h3>${total}</h3><p>Total</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon yellow"><i class="fas fa-paper-plane"></i></div>
                <div class="stat-content"><h3>${enviadas}</h3><p>Enviadas</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
                <div class="stat-content"><h3>${aceitas}</h3><p>Aceitas</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red"><i class="fas fa-times-circle"></i></div>
                <div class="stat-content"><h3>${recusadas}</h3><p>Recusadas</p></div>
            </div>
        </div>

        <!-- Lista de Propostas -->
        ${propostasRicas.length === 0 ? `
            <div class="card">
                <div class="card-body" style="text-align:center;padding:3rem;">
                    <i class="fas fa-file-alt" style="font-size:3rem;color:var(--text-muted);margin-bottom:1rem;display:block;"></i>
                    <h3>Nenhuma proposta encontrada</h3>
                    <p class="text-muted">Crie a primeira proposta em Vendas.</p>
                    <button class="btn-primary mt-2" onclick="Modals.showPropostaModal()">
                        <i class="fas fa-plus"></i> Nova Proposta
                    </button>
                </div>
            </div>
        ` : propostasRicas.map(p => `
            <div class="card mb-2">
                <div class="card-body" style="padding:0;">
                    <!-- Cabeçalho da proposta -->
                    <div style="display:flex;align-items:center;gap:12px;padding:16px;flex-wrap:wrap;cursor:pointer;"
                         onclick="Pages._toggleCronograma('crono-${p.id}')">
                        <div style="width:44px;height:44px;border-radius:50%;background:rgba(139,92,246,0.12);
                                    display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas fa-file-alt" style="color:var(--brand-primary);font-size:18px;"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                <strong style="font-size:15px;">${p.artista?.nome || '—'}</strong>
                                ${_statusBadge(p.status)}
                                ${p.contrato?.status === 'Assinado' ? '<span class="badge badge-success"><i class="fas fa-signature"></i> Contrato Assinado</span>' : ''}
                            </div>
                            <div style="display:flex;gap:16px;margin-top:4px;flex-wrap:wrap;">
                                <span style="font-size:13px;color:var(--text-muted);">
                                    <i class="fas fa-calendar"></i>
                                    ${p.data_evento ? Utils.formatDate(p.data_evento) : '—'}
                                    ${p.horario ? 'às ' + p.horario : ''}
                                </span>
                                <span style="font-size:13px;color:var(--text-muted);">
                                    <i class="fas fa-map-marker-alt"></i>
                                    ${p.local_evento || '—'}${p.cidade_evento ? ', ' + p.cidade_evento : ''}
                                </span>
                                <span style="font-size:13px;color:var(--text-muted);">
                                    <i class="fas fa-user"></i>
                                    ${p.responsavel || p.nome_contratante || '—'}
                                </span>
                            </div>
                        </div>
                        <div style="text-align:right;flex-shrink:0;">
                            <div style="font-size:18px;font-weight:700;color:var(--brand-primary);">
                                ${Utils.formatCurrency(p.cache_bruto || 0)}
                            </div>
                            <div style="font-size:12px;color:var(--text-muted);">cachê bruto</div>
                        </div>
                        <i class="fas fa-chevron-down" id="chevron-${p.id}"
                           style="color:var(--text-muted);transition:transform 0.2s;"></i>
                    </div>

                    <!-- Cronograma (colapsável) -->
                    <div id="crono-${p.id}" style="display:none;border-top:1px solid var(--border-color);padding:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                            <h4 style="margin:0;font-size:14px;color:var(--text-secondary);">
                                <i class="fas fa-calendar-check" style="color:var(--brand-primary);"></i>
                                Cronograma de Pagamento
                            </h4>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                <button class="btn-secondary btn-sm" onclick="Modals.showPropostaModal('${p.id}')">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn-secondary btn-sm" onclick="Pages.enviarPropostaWhatsApp('${p.id}')">
                                    <i class="fab fa-whatsapp" style="color:#25D366;"></i> WhatsApp
                                </button>
                                ${p.status !== 'Aceita' && p.status !== 'Recusada' ? `
                                    <button class="btn-primary btn-sm" onclick="Pages.aceitarProposta('${p.id}')">
                                        <i class="fas fa-check"></i> Aceitar
                                    </button>
                                    <button class="btn-secondary btn-sm" style="color:var(--danger);" onclick="Pages.recusarProposta('${p.id}')">
                                        <i class="fas fa-times"></i> Recusar
                                    </button>
                                ` : ''}
                                ${p.status === 'Aceita' && p.contrato && p.contrato.status !== 'Assinado' ? `
                                    <button class="btn-primary btn-sm" onclick="Pages.assinarContratoModal('${p.eventoGerado?.id || ''}', '${p.id}')">
                                        <i class="fas fa-signature"></i> Assinar Contrato
                                    </button>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Detalhes da proposta -->
                        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:12px;">
                            <div style="background:var(--bg-secondary);border-radius:8px;padding:10px;">
                                <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px;">Tipo de Evento</div>
                                <div style="font-size:13px;font-weight:600;">${p.tipo_evento || '—'}</div>
                            </div>
                            <div style="background:var(--bg-secondary);border-radius:8px;padding:10px;">
                                <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px;">Comissão Produtora</div>
                                <div style="font-size:13px;font-weight:600;color:var(--danger);">
                                    ${Utils.formatCurrency(p.comissao || 0)}
                                </div>
                            </div>
                            <div style="background:var(--bg-secondary);border-radius:8px;padding:10px;">
                                <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px;">Valor Líquido</div>
                                <div style="font-size:13px;font-weight:700;color:var(--success);">
                                    ${Utils.formatCurrency(Math.max(0, (p.cache_bruto||0) - (p.comissao||0)))}
                                </div>
                            </div>
                            <div style="background:var(--bg-secondary);border-radius:8px;padding:10px;">
                                <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px;">Válida até</div>
                                <div style="font-size:13px;font-weight:600;">
                                    ${p.validade ? Utils.formatDate(p.validade) : '—'}
                                </div>
                            </div>
                        </div>

                        <!-- Tabela de cronograma -->
                        ${_renderCronograma(p)}

                        ${p.observacoes ? `
                            <div style="margin-top:12px;padding:10px;background:rgba(139,92,246,0.06);
                                        border-radius:8px;border-left:3px solid var(--brand-primary);">
                                <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Observações</div>
                                <div style="font-size:13px;">${p.observacoes}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('')}
    </div>`;

    document.getElementById('pageContent').innerHTML = html;
    document.getElementById('pageTitle').textContent = 'Propostas';
};

Pages._toggleCronograma = function(id) {
    const el = document.getElementById(id);
    const propostaId = id.replace('crono-', '');
    const chevron = document.getElementById('chevron-' + propostaId);
    if (!el) return;
    const open = el.style.display === 'none';
    el.style.display = open ? 'block' : 'none';
    if (chevron) chevron.style.transform = open ? 'rotate(180deg)' : '';
};
