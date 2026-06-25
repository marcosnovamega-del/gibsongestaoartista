/* ========================================
   GIBSON MANAGER PRO - MODAL DE PROPOSTA
   Formulário multi-etapa com validação completa
======================================== */

Modals.showPropostaModal = async function(propostaId = null) {
    const proposta = propostaId ? await PropostasDB.buscarPorId(propostaId) : null;
    const artistas = await ArtistasDB.listarAtivos();
    const isEdit   = !!propostaId;
    const config   = await ConfigDB.obter();

    const html = `
        <div class="modal-overlay" onclick="if(event.target===this) Modals.close()" style="overflow-y:auto;">
            <div class="modal proposta-modal" style="max-width:780px;margin:30px auto;">
                <div class="modal-header" style="background:linear-gradient(135deg,#0d0d0d,#1a0500);border-bottom:1px solid var(--red-primary);">
                    <h3 class="modal-title">
                        <i class="fas fa-file-signature" style="color:var(--red-primary)"></i>
                        ${isEdit ? 'Editar Proposta' : 'Nova Proposta Comercial'}
                    </h3>
                    <button class="modal-close" onclick="Modals.close()"><i class="fas fa-times"></i></button>
                </div>

                <!-- Steps -->
                <div class="proposta-steps">
                    <div class="proposta-step active" id="step-indicator-1">
                        <span class="step-num">1</span><span class="step-label">Artista</span>
                    </div>
                    <div class="proposta-step-line"></div>
                    <div class="proposta-step" id="step-indicator-2">
                        <span class="step-num">2</span><span class="step-label">Contratante</span>
                    </div>
                    <div class="proposta-step-line"></div>
                    <div class="proposta-step" id="step-indicator-3">
                        <span class="step-num">3</span><span class="step-label">Evento</span>
                    </div>
                    <div class="proposta-step-line"></div>
                    <div class="proposta-step" id="step-indicator-4">
                        <span class="step-num">4</span><span class="step-label">Financeiro</span>
                    </div>
                </div>

                <div class="modal-body" style="padding:0;">
                    <form id="propostaForm" novalidate>

                        <!-- ETAPA 1: Artista + Vendedor -->
                        <div class="proposta-etapa active" id="proposta-etapa-1">
                            <div style="padding:24px;">
                                <h4 class="etapa-title"><i class="fas fa-microphone"></i> Artista & Vendedor</h4>
                                <div class="form-group">
                                    <label>Artista *</label>
                                    <select name="artista_id" required id="p_artista_id">
                                        <option value="">Selecione o artista</option>
                                        ${artistas.map(a => `
                                            <option value="${a.id}" ${proposta?.artista_id === a.id ? 'selected' : ''}>
                                                ${a.nome}
                                            </option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Vendedor Responsável *</label>
                                    <input type="text" name="vendedor_nome" value="${proposta?.vendedor_nome || (window.Auth?.currentUser?.nome || '')}" required placeholder="Nome do vendedor">
                                </div>
                                <div class="form-group">
                                    <label>Validade da Proposta *</label>
                                    <input type="date" name="validade" value="${proposta?.validade || ''}" required>
                                </div>
                                <div class="form-group">
                                    <label>Observações Gerais</label>
                                    <textarea name="observacoes" rows="3" placeholder="Informações adicionais da proposta...">${proposta?.observacoes || ''}</textarea>
                                </div>
                            </div>
                        </div>

                        <!-- ETAPA 2: Contratante -->
                        <div class="proposta-etapa" id="proposta-etapa-2">
                            <div style="padding:24px;">
                                <h4 class="etapa-title"><i class="fas fa-user-tie"></i> Dados do Contratante</h4>
                                <div class="form-group">
                                    <label>Tipo de Contratante *</label>
                                    <select name="tipo_contratante" id="p_tipo_contratante" onchange="Modals.togglePropostaPJ()" required>
                                        <option value="PJ" ${proposta?.tipo_contratante !== 'PF' ? 'selected' : ''}>Pessoa Jurídica (PJ)</option>
                                        <option value="PF" ${proposta?.tipo_contratante === 'PF' ? 'selected' : ''}>Pessoa Física (PF)</option>
                                    </select>
                                </div>
                                <div id="p_campos_pj">
                                    <div class="grid grid-2">
                                        <div class="form-group">
                                            <label>Razão Social *</label>
                                            <input type="text" name="razao_social" value="${proposta?.razao_social || ''}" placeholder="Empresa Ltda" id="p_razao_social">
                                        </div>
                                        <div class="form-group">
                                            <label>Nome Fantasia</label>
                                            <input type="text" name="nome_fantasia" value="${proposta?.nome_fantasia || ''}" placeholder="Nome Fantasia">
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label>CNPJ *</label>
                                        <input type="text" name="cnpj" value="${proposta?.cnpj || ''}" placeholder="00.000.000/0000-00" id="p_cnpj"
                                               oninput="Utils.maskCNPJ(this)">
                                    </div>
                                </div>
                                <div id="p_campos_pf" style="display:none;">
                                    <div class="grid grid-2">
                                        <div class="form-group">
                                            <label>Nome Completo *</label>
                                            <input type="text" name="nome_contratante" value="${proposta?.nome_contratante || ''}" id="p_nome_contratante">
                                        </div>
                                        <div class="form-group">
                                            <label>CPF *</label>
                                            <input type="text" name="cpf_contratante" value="${proposta?.cpf_contratante || ''}" placeholder="000.000.000-00"
                                                   oninput="Utils.maskCPF(this)">
                                        </div>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Responsável pelo Contrato *</label>
                                    <input type="text" name="responsavel" value="${proposta?.responsavel || ''}" required placeholder="Nome do responsável">
                                </div>
                                <div class="grid grid-2">
                                    <div class="form-group">
                                        <label>Telefone / WhatsApp *</label>
                                        <input type="text" name="telefone" value="${proposta?.telefone || ''}" required placeholder="(00) 00000-0000"
                                               oninput="Utils.maskPhone(this)">
                                    </div>
                                    <div class="form-group">
                                        <label>E-mail *</label>
                                        <input type="email" name="email" value="${proposta?.email || ''}" required placeholder="contato@empresa.com">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Endereço Completo *</label>
                                    <input type="text" name="endereco" value="${proposta?.endereco || ''}" required placeholder="Rua, número, bairro">
                                </div>
                                <div class="grid grid-3">
                                    <div class="form-group">
                                        <label>Cidade *</label>
                                        <input type="text" name="cidade_contratante" value="${proposta?.cidade_contratante || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Estado *</label>
                                        <input type="text" name="estado_contratante" value="${proposta?.estado_contratante || ''}" required maxlength="2" placeholder="UF" style="text-transform:uppercase">
                                    </div>
                                    <div class="form-group">
                                        <label>CEP</label>
                                        <input type="text" name="cep" value="${proposta?.cep || ''}" placeholder="00000-000"
                                               oninput="Utils.maskCEP(this)">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ETAPA 3: Evento -->
                        <div class="proposta-etapa" id="proposta-etapa-3">
                            <div style="padding:24px;">
                                <h4 class="etapa-title"><i class="fas fa-calendar-star"></i> Dados do Evento</h4>
                                <div class="grid grid-2">
                                    <div class="form-group">
                                        <label>Data do Show *</label>
                                        <input type="date" name="data_evento" value="${proposta?.data_evento || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Horário <span style="font-size:11px;color:var(--text-muted);font-weight:400;">(opcional)</span></label>
                                        <input type="time" name="horario" value="${proposta?.horario || ''}">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Nome / Local do Evento *</label>
                                    <input type="text" name="local_evento" value="${proposta?.local_evento || ''}" required placeholder="Ex: Espaço XYZ, Arena, Clube...">
                                </div>
                                <div class="grid grid-3">
                                    <div class="form-group" style="grid-column:span 2;">
                                        <label>Cidade do Show *</label>
                                        <input type="text" name="cidade_evento" value="${proposta?.cidade_evento || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <label>UF *</label>
                                        <input type="text" name="estado_evento" value="${proposta?.estado_evento || ''}" required maxlength="2" placeholder="UF" style="text-transform:uppercase">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Tipo de Evento *</label>
                                    <select name="tipo_evento" required>
                                        ${['Show','Festival','Festa Particular','Evento Corporativo','Casamento','Aniversário','Forró','Réveillon','São João','Outro'].map(t => `
                                            <option value="${t}" ${proposta?.tipo_evento === t ? 'selected' : ''}>${t}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- ETAPA 4: Financeiro + Cronograma de Pagamento -->
                        <div class="proposta-etapa" id="proposta-etapa-4">
                            <div style="padding:24px;">
                                <h4 class="etapa-title"><i class="fas fa-dollar-sign"></i> Proposta Financeira & Pagamento</h4>
                                <div class="grid grid-2">
                                    <div class="form-group">
                                        <label>Cachê Bruto (R$) *</label>
                                        <input type="number" name="cache_bruto" id="p_cache" value="${proposta?.cache_bruto || ''}" min="0" step="0.01" required
                                               oninput="Modals.calcPropostaLiquido();Modals.atualizarCronograma()">
                                    </div>
                                    <div class="form-group">
                                        <label>Comissão da Produtora (R$) *</label>
                                        <input type="number" name="comissao" id="p_comissao" value="${proposta?.comissao || ''}" min="0" step="0.01" placeholder="Ex: 1500.00" required
                                               oninput="Modals.calcPropostaLiquido();Modals.atualizarCronograma()">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Valor Líquido (calculado)</label>
                                    <input type="text" id="p_liquido" readonly
                                           style="background:var(--bg-secondary);color:var(--success);font-weight:700;font-size:18px;">
                                </div>

                                <!-- COMISSÕES (VENDEDOR / PARCEIRO) -->
                                <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:10px;padding:16px;margin-bottom:16px;">
                                    <label style="font-size:13px;font-weight:700;color:var(--text-primary);display:block;margin-bottom:12px;">
                                        <i class="fas fa-hand-holding-usd" style="color:var(--red-primary)"></i> Comissões Adicionais
                                    </label>
                                    <div class="form-group">
                                        <label>Comissão do Vendedor (R$)</label>
                                        <input type="number" name="vendedor_comissao_valor" id="p_vendedor_comissao" value="${proposta?.vendedor_comissao_valor || ''}" min="0" step="0.01" placeholder="Ex: 500.00">
                                        <small class="text-muted" style="display:block;margin-top:4px;">Este valor será programado automaticamente no financeiro.</small>
                                    </div>

                                    <div class="form-group" style="margin-top:12px;">
                                        <label style="display:flex;align-items:center;gap:8px;font-weight:600;cursor:pointer;">
                                            <input type="checkbox" id="tem_parceiro" onchange="document.getElementById('bloco_parceiro').style.display = this.checked ? 'block' : 'none'" ${proposta?.parceiro_nome ? 'checked' : ''}>
                                            Tem parceiro nesta venda?
                                        </label>
                                    </div>
                                    <div id="bloco_parceiro" style="display:${proposta?.parceiro_nome ? 'block' : 'none'}; padding-top:10px; border-top:1px dashed var(--border-color); margin-top:10px;">
                                        <div class="grid grid-2">
                                            <div class="form-group">
                                                <label>Nome do Parceiro</label>
                                                <input type="text" name="parceiro_nome" id="p_parceiro_nome" value="${proposta?.parceiro_nome || ''}" placeholder="Nome do parceiro">
                                            </div>
                                            <div class="form-group">
                                                <label>Comissão do Parceiro (R$)</label>
                                                <input type="number" name="parceiro_comissao_valor" id="p_parceiro_comissao" value="${proposta?.parceiro_comissao_valor || ''}" min="0" step="0.01" placeholder="Ex: 300.00">
                                            </div>
                                        </div>
                                        <div style="font-size:11px;color:#B45309;background:rgba(245,158,11,0.1);padding:8px;border-radius:6px;margin-top:4px;">
                                            <i class="fas fa-exclamation-triangle"></i> A comissão do parceiro será lançada como <b>Aprovação Pendente</b> no financeiro.
                                        </div>
                                    </div>
                                </div>

                                <!-- FORMA DE PAGAMENTO -->
                                <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:10px;padding:16px;margin-bottom:16px;">
                                    <label style="font-size:13px;font-weight:700;color:var(--text-primary);display:block;margin-bottom:12px;">
                                        <i class="fas fa-credit-card" style="color:var(--red-primary)"></i> Forma de Pagamento *
                                    </label>
                                    <div style="display:flex;gap:10px;margin-bottom:14px;">
                                        <button type="button" id="btn_avista" onclick="Modals.setPagTipo('avista')"
                                            class="pag-tipo-btn pag-tipo-ativo" style="flex:1;">
                                            <i class="fas fa-money-bill-wave"></i> À Vista
                                        </button>
                                        <button type="button" id="btn_parcelado" onclick="Modals.setPagTipo('parcelado')"
                                            class="pag-tipo-btn" style="flex:1;">
                                            <i class="fas fa-th-list"></i> Parcelado
                                        </button>
                                    </div>
                                    <input type="hidden" name="pag_tipo" id="pag_tipo" value="avista">

                                    <!-- À VISTA -->
                                    <div id="pag_avista_config">
                                        <div class="form-group" style="margin:0;">
                                            <label>Quando será pago? *</label>
                                            <select id="pag_avista_quando" name="pag_avista_quando" onchange="Modals.atualizarCronograma()">
                                                <option value="-30">30 dias antes do show</option>
                                                <option value="-15">15 dias antes do show</option>
                                                <option value="-7">7 dias antes do show</option>
                                                <option value="-3">3 dias antes do show</option>
                                                <option value="-1">1 dia antes do show</option>
                                                <option value="0">No dia do show</option>
                                                <option value="7">Até 7 dias após o show</option>
                                                <option value="15">Até 15 dias após o show</option>
                                                <option value="30">Até 30 dias após o show</option>
                                            </select>
                                        </div>
                                    </div>

                                    <!-- PARCELADO -->
                                    <div id="pag_parcelado_config" style="display:none;">
                                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                                            <label style="margin:0;white-space:nowrap;">Nº de parcelas:</label>
                                            <select id="pag_num_parcelas" onchange="Modals.gerarLinhasParcelas()" style="width:80px;">
                                                <option value="2">2x</option>
                                                <option value="3">3x</option>
                                                <option value="4">4x</option>
                                                <option value="5">5x</option>
                                            </select>
                                        </div>
                                        <div id="pag_parcelas_linhas"></div>
                                        <div id="pag_pct_total" style="font-size:12px;margin-top:6px;text-align:right;color:var(--text-muted);"></div>
                                    </div>
                                </div>

                                <!-- PREVIEW CRONOGRAMA -->
                                <div class="proposta-preview-box" id="cronograma_preview" style="display:none;">
                                    <div class="proposta-preview-header">
                                        <i class="fas fa-calendar-check"></i> Cronograma de Pagamentos
                                    </div>
                                    <div id="cronograma_linhas" class="proposta-preview-content"></div>
                                </div>

                                <!-- Preview da proposta -->
                                <div class="proposta-preview-box" style="margin-top:12px;">
                                    <div class="proposta-preview-header"><i class="fas fa-eye"></i> Resumo da Proposta</div>
                                    <div id="propostaResumo" class="proposta-preview-content">Preencha os dados para visualizar.</div>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                <!-- Footer com navegação das etapas -->
                <div class="modal-footer proposta-footer">
                    <button class="btn-secondary" id="proposta-btn-back" onclick="Modals.propostaNavegar(-1)" style="display:none;">
                        <i class="fas fa-arrow-left"></i> Anterior
                    </button>
                    <div style="flex:1;text-align:center;">
                        <span id="proposta-step-label" style="color:var(--text-muted);font-size:13px;">Etapa 1 de 4</span>
                    </div>
                    <button class="btn-primary" id="proposta-btn-next" onclick="Modals.propostaNavegar(1)">
                        Próximo <i class="fas fa-arrow-right"></i>
                    </button>
                    <button class="btn-primary" id="proposta-btn-save" onclick="Modals.submitProposta('${propostaId || ''}')" style="display:none;">
                        <i class="fas fa-save"></i> Salvar Proposta
                    </button>
                </div>
            </div>
        </div>
    `;

    this.container.innerHTML = html;
    Modals._propostaEtapa = 1;

    // Aplicar estado inicial dos campos PJ
    Modals.togglePropostaPJ();

    // Calcular preview se editando
    if (proposta?.cache_bruto) Modals.calcPropostaLiquido();
};

// Controle de etapas
Modals._propostaEtapa = 1;

Modals.propostaNavegar = function(direcao) {
    const atual = Modals._propostaEtapa;
    const nova  = atual + direcao;

    // Validar etapa atual antes de avançar
    if (direcao > 0 && !Modals.validarEtapaProposta(atual)) return;

    if (nova < 1 || nova > 4) return;

    // Ocultar etapa atual
    document.getElementById(`proposta-etapa-${atual}`).classList.remove('active');
    document.getElementById(`step-indicator-${atual}`).classList.remove('active');
    document.getElementById(`step-indicator-${atual}`).classList.add('done');

    // Mostrar nova etapa
    document.getElementById(`proposta-etapa-${nova}`).classList.add('active');
    document.getElementById(`step-indicator-${nova}`).classList.add('active');

    Modals._propostaEtapa = nova;

    // Atualizar botões
    document.getElementById('proposta-btn-back').style.display  = nova > 1 ? 'inline-flex' : 'none';
    document.getElementById('proposta-btn-next').style.display  = nova < 4 ? 'inline-flex' : 'none';
    document.getElementById('proposta-btn-save').style.display  = nova === 4 ? 'inline-flex' : 'none';
    document.getElementById('proposta-step-label').textContent  = `Etapa ${nova} de 4`;

    // Gerar resumo na última etapa
    if (nova === 4) Modals.gerarResumoPropostaPreview();
};

Modals.validarEtapaProposta = function(etapa) {
    const form = document.getElementById('propostaForm');
    const etapaEl = document.getElementById(`proposta-etapa-${etapa}`);
    const campos = etapaEl.querySelectorAll('[required]');
    let valido = true;

    // Remover erros anteriores
    etapaEl.querySelectorAll('.field-error').forEach(e => e.remove());
    etapaEl.querySelectorAll('.input-error').forEach(e => e.classList.remove('input-error'));

    campos.forEach(campo => {
        // Pular campos em seções ocultas
        if (campo.closest('[style*="display:none"]') || campo.closest('[style*="display: none"]')) return;
        if (!campo.value.trim()) {
            valido = false;
            campo.classList.add('input-error');
            const err = document.createElement('small');
            err.className = 'field-error';
            err.textContent = 'Campo obrigatório';
            campo.parentNode.appendChild(err);
        }
    });

    if (!valido) Utils.showToast('Preencha todos os campos obrigatórios para continuar.', 'error');
    return valido;
};

Modals.togglePropostaPJ = function() {
    const tipo = document.getElementById('p_tipo_contratante')?.value;
    const pjEl = document.getElementById('p_campos_pj');
    const pfEl = document.getElementById('p_campos_pf');
    if (!pjEl || !pfEl) return;
    pjEl.style.display = tipo === 'PJ' ? 'block' : 'none';
    pfEl.style.display = tipo === 'PF' ? 'block' : 'none';
};

Modals.calcPropostaLiquido = function() {
    const cache    = parseFloat(document.getElementById('p_cache')?.value)    || 0;
    const comissao = parseFloat(document.getElementById('p_comissao')?.value) || 0;
    const liquido  = cache - comissao;
    const el = document.getElementById('p_liquido');
    if (el) el.value = Utils.formatCurrency(liquido >= 0 ? liquido : 0);
};

Modals.gerarResumoPropostaPreview = function() {
    const form = document.getElementById('propostaForm');
    if (!form) return;
    const d = new FormData(form);
    const get = k => d.get(k) || '—';

    const artistaSelect = document.getElementById('p_artista_id');
    const artistaNome   = artistaSelect?.options[artistaSelect.selectedIndex]?.text || '—';

    const cache    = parseFloat(get('cache_bruto')) || 0;
    const comissao = parseFloat(get('comissao'))    || 0;
    const liquido  = Math.max(0, cache - comissao);

    document.getElementById('propostaResumo').innerHTML = `
        <div class="resumo-row"><span>Artista</span><strong>${artistaNome}</strong></div>
        <div class="resumo-row"><span>Vendedor</span><strong>${get('vendedor_nome')}</strong></div>
        <div class="resumo-row"><span>Contratante</span><strong>${get('razao_social') || get('nome_contratante')}</strong></div>
        <div class="resumo-row"><span>Responsável</span><strong>${get('responsavel')}</strong></div>
        <div class="resumo-row"><span>Evento</span><strong>${get('tipo_evento')} — ${get('local_evento')}</strong></div>
        <div class="resumo-row"><span>Data / Hora</span><strong>${get('data_evento') ? Utils.formatDate(get('data_evento')) : '—'} às ${get('horario')}</strong></div>
        <div class="resumo-row"><span>Cidade</span><strong>${get('cidade_evento')}/${get('estado_evento')}</strong></div>
        <div class="resumo-row" style="border-top:1px solid var(--border-color);margin-top:8px;padding-top:8px;">
            <span>Cachê Bruto</span><strong style="color:var(--text-primary)">${Utils.formatCurrency(cache)}</strong>
        </div>
        <div class="resumo-row">
            <span>Comissão Produtora</span><strong style="color:var(--danger)">- ${Utils.formatCurrency(comissao)}</strong>
        </div>
        <div class="resumo-row">
            <span>Valor Líquido</span><strong style="color:var(--success);font-size:16px;">${Utils.formatCurrency(liquido)}</strong>
        </div>
        ${get('vendedor_comissao_valor') ? `<div class="resumo-row"><span>Comissão Vendedor</span><strong>${Utils.formatCurrency(parseFloat(get('vendedor_comissao_valor')))}</strong></div>` : ''}
        ${get('parceiro_nome') ? `<div class="resumo-row"><span>Parceiro (${get('parceiro_nome')})</span><strong style="color:var(--warning)">${Utils.formatCurrency(parseFloat(get('parceiro_comissao_valor')))}</strong></div>` : ''}
        <div class="resumo-row"><span>Pagamento</span><strong>${get('condicoes_pagamento')}</strong></div>
        <div class="resumo-row"><span>Validade</span><strong>${get('validade') ? Utils.formatDate(get('validade')) : '—'}</strong></div>
    `;
};

Modals.submitProposta = async function(propostaId) {
    if (!Modals.validarEtapaProposta(4)) return;

    const form = document.getElementById('propostaForm');
    const d    = new FormData(form);
    const get  = k => d.get(k) || '';

    // Montar cronograma JSON
    const pagTipo = get('pag_tipo') || 'avista';
    let cronograma = [];
    const cacheBruto = parseFloat(get('cache_bruto')) || 0;
    const comissaoVal = parseFloat(get('comissao')) || 0;
    const liquidoVal = Math.max(0, cacheBruto - comissaoVal);

    if (pagTipo === 'avista') {
        const dias = parseInt(get('pag_avista_quando') || '0');
        cronograma = [{ valor: liquidoVal, dias_antes_show: -dias, descricao: dias <= 0 ? (dias === 0 ? 'Pagamento no dia do show' : `Pagamento ${Math.abs(dias)}d antes`) : `Pagamento até ${dias}d após show`, tipo: 'integral' }];
    } else {
        const linhas = document.querySelectorAll('.parcela-linha');
        linhas.forEach((linha, i) => {
            const valor = parseFloat(linha.querySelector('.parcela-valor')?.value) || 0;
            const dias  = parseInt(linha.querySelector('.parcela-dias')?.value)    || 0;
            const desc  = linha.querySelector('.parcela-desc')?.value || `Parcela ${i+1}`;
            cronograma.push({ valor, dias_antes_show: -dias, descricao: desc, tipo: i === 0 ? 'entrada' : 'restante', numero: i+1 });
        });
    }

    const data = {
        artista_id: get('artista_id'), vendedor_nome: get('vendedor_nome'),
        validade: get('validade') || null, observacoes: get('observacoes'),
        tipo_contratante: get('tipo_contratante'), razao_social: get('razao_social'),
        nome_fantasia: get('nome_fantasia'), cnpj: get('cnpj'),
        nome_contratante: get('nome_contratante'), cpf_contratante: get('cpf_contratante'),
        responsavel: get('responsavel'), telefone: get('telefone'), email: get('email'),
        endereco: get('endereco'), cidade_contratante: get('cidade_contratante'),
        estado_contratante: (get('estado_contratante') || '').toUpperCase(), cep: get('cep'),
        data_evento: get('data_evento') || null, horario: get('horario'),
        local_evento: get('local_evento'), cidade_evento: get('cidade_evento'),
        estado_evento: (get('estado_evento') || '').toUpperCase(), tipo_evento: get('tipo_evento'),
        cache_bruto: cacheBruto,
        comissao: comissaoVal,
        vendedor_comissao_valor: parseFloat(get('vendedor_comissao_valor')) || 0,
        parceiro_nome: document.getElementById('tem_parceiro')?.checked ? get('parceiro_nome') : null,
        parceiro_comissao_valor: document.getElementById('tem_parceiro')?.checked ? (parseFloat(get('parceiro_comissao_valor')) || 0) : 0,
        condicoes_pagamento: JSON.stringify({ tipo: pagTipo, cronograma }),
    };

    Utils.showLoading();
    let result = propostaId ? await PropostasDB.atualizar(propostaId, data) : await PropostasDB.criar(data);
    Utils.hideLoading();

    if (result) {
        Utils.showToast(`Proposta ${propostaId ? 'atualizada' : 'criada'} com sucesso!`, 'success');
        Modals.close();
        if (typeof Pages.renderVendas === 'function') Pages.renderVendas();
    } else {
        Utils.showToast('Erro ao salvar proposta.', 'error');
    }
};

// ---- Funções do configurador de pagamento ----

Modals.setPagTipo = function(tipo) {
    document.getElementById('pag_tipo').value = tipo;
    const ativo = tipo === 'avista';
    document.getElementById('btn_avista').classList.toggle('pag-tipo-ativo', ativo);
    document.getElementById('btn_parcelado').classList.toggle('pag-tipo-ativo', !ativo);
    document.getElementById('pag_avista_config').style.display    = ativo ? 'block' : 'none';
    document.getElementById('pag_parcelado_config').style.display = ativo ? 'none'  : 'block';
    if (!ativo) Modals.gerarLinhasParcelas();
    Modals.atualizarCronograma();
};

Modals.gerarLinhasParcelas = function() {
    const n   = parseInt(document.getElementById('pag_num_parcelas')?.value || 2);
    const cache    = parseFloat(document.getElementById('p_cache')?.value) || 0;
    const comissao = parseFloat(document.getElementById('p_comissao')?.value) || 0;
    const liquido  = Math.max(0, cache - comissao);
    const valorParcela = liquido > 0 ? parseFloat((liquido / n).toFixed(2)) : 0;
    const labels = ['Entrada', '2ª parcela', '3ª parcela', '4ª parcela', '5ª parcela'];
    const diasPadrao = [-30, 0, 15, 30, 45];

    let html = '';
    for (let i = 0; i < n; i++) {
        // Última parcela recebe o ajuste de arredondamento
        const v = i === n - 1 ? parseFloat((liquido - valorParcela * (n - 1)).toFixed(2)) : valorParcela;
        html += `
        <div class="parcela-linha" style="display:grid;grid-template-columns:1fr 110px 100px;gap:8px;align-items:center;margin-bottom:8px;">
            <input class="parcela-desc" placeholder="${labels[i] || `Parcela ${i+1}`}" value="${labels[i] || `Parcela ${i+1}`}"
                   style="padding:6px 8px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);font-size:12px;">
            <div style="position:relative;">
                <span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:11px;color:var(--text-muted);">R$</span>
                <input type="number" class="parcela-valor" value="${v}" min="0" step="0.01"
                       oninput="Modals.validarValores()"
                       style="padding:6px 8px 6px 28px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);font-size:12px;width:100%;">
            </div>
            <select class="parcela-dias" onchange="Modals.atualizarCronograma()"
                    style="padding:6px 4px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);font-size:11px;">
                <option value="-30" ${diasPadrao[i]===-30?'selected':''}>30d antes</option>
                <option value="-15" ${diasPadrao[i]===-15?'selected':''}>15d antes</option>
                <option value="-7"  ${diasPadrao[i]===-7?'selected':''}>7d antes</option>
                <option value="0"   ${diasPadrao[i]===0?'selected':''}>No dia</option>
                <option value="7"   ${diasPadrao[i]===7?'selected':''}>7d depois</option>
                <option value="15"  ${diasPadrao[i]===15?'selected':''}>15d depois</option>
                <option value="30"  ${diasPadrao[i]===30?'selected':''}>30d depois</option>
            </select>
        </div>`;
    }
    const el = document.getElementById('pag_parcelas_linhas');
    if (el) { el.innerHTML = html; Modals.validarValores(); Modals.atualizarCronograma(); }
};

Modals.validarValores = function() {
    const inputs  = document.querySelectorAll('.parcela-valor');
    const total   = Array.from(inputs).reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
    const cache    = parseFloat(document.getElementById('p_cache')?.value) || 0;
    const comissao = parseFloat(document.getElementById('p_comissao')?.value) || 0;
    const liquido  = Math.max(0, cache - comissao);
    const el = document.getElementById('pag_pct_total');
    if (el) {
        const diff = Math.abs(total - liquido);
        const ok   = diff < 0.02;
        el.textContent = `Total: ${Utils.formatCurrency(total)} ${ok ? '✅' : `⚠️ deve somar ${Utils.formatCurrency(liquido)}`}`;
        el.style.color = ok ? 'var(--success)' : 'var(--danger)';
    }
    Modals.atualizarCronograma();
};

Modals.atualizarCronograma = function() {
    const dataEvento = document.querySelector('[name="data_evento"]')?.value;
    const cache      = parseFloat(document.getElementById('p_cache')?.value) || 0;
    const comissao   = parseFloat(document.getElementById('p_comissao')?.value) || 0;
    const liquido    = Math.max(0, cache - comissao);
    const tipo       = document.getElementById('pag_tipo')?.value || 'avista';
    const prev       = document.getElementById('cronograma_preview');
    const linhasEl   = document.getElementById('cronograma_linhas');
    if (!prev || !linhasEl) return;

    if (!dataEvento || liquido <= 0) { prev.style.display = 'none'; return; }

    const showDate = new Date(dataEvento + 'T12:00:00');
    let items = [];

    if (tipo === 'avista') {
        const dias = parseInt(document.getElementById('pag_avista_quando')?.value || '0');
        const venc = new Date(showDate); venc.setDate(venc.getDate() + dias);
        items = [{ desc: dias > 0 ? `Pagamento integral (até ${dias}d após show)` : dias === 0 ? 'Pagamento no dia do show' : `Pagamento (${Math.abs(dias)}d antes)`, valor: liquido, venc }];
    } else {
        document.querySelectorAll('.parcela-linha').forEach((linha, i) => {
            const valor = parseFloat(linha.querySelector('.parcela-valor')?.value) || 0;
            const dias  = parseInt(linha.querySelector('.parcela-dias')?.value) || 0;
            const desc  = linha.querySelector('.parcela-desc')?.value || `Parcela ${i+1}`;
            const venc  = new Date(showDate); venc.setDate(venc.getDate() + dias);
            items.push({ desc, valor, venc });
        });
    }

    prev.style.display = 'block';
    linhasEl.innerHTML = items.map((it, i) => {
        const hoje  = new Date();
        const diff  = Math.ceil((it.venc - hoje) / 86400000);
        const alert = diff < 0 ? '🔴' : diff <= 7 ? '🟡' : '🟢';
        return `<div class="resumo-row">
            <span>${alert} ${it.desc}</span>
            <strong style="color:var(--success);">${Utils.formatCurrency(it.valor)} <span style="color:var(--text-muted);font-weight:400;font-size:11px;">· ${it.venc.toLocaleDateString('pt-BR')}</span></strong>
        </div>`;
    }).join('');
};

