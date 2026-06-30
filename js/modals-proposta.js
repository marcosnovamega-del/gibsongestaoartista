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

                                <div class="form-group">
                                    <label>Cachê (R$) *</label>
                                    <input type="number" name="cache_bruto" id="p_cache" value="${proposta?.cache_bruto || ''}" min="0" step="0.01" required
                                           oninput="Modals.atualizarCronograma()">
                                </div>

                                <!-- VENDEDOR -->
                                <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:10px;padding:16px;margin-bottom:16px;">
                                    <label style="font-size:13px;font-weight:700;color:var(--text-primary);display:block;margin-bottom:12px;">
                                        <i class="fas fa-user-tie" style="color:var(--brand-primary)"></i> Vendedor
                                    </label>
                                    <div class="grid grid-2">
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Nome do Vendedor</label>
                                            <input type="text" name="vendedor_nome_fin" id="p_vendedor_nome_fin" value="${proposta?.vendedor_nome || (window.Auth?.currentUser?.nome || '')}" placeholder="Nome do vendedor">
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Comissão do Vendedor (R$)</label>
                                            <input type="number" name="vendedor_comissao_valor" id="p_vendedor_comissao" value="${proposta?.vendedor_comissao_valor || ''}" min="0" step="0.01" placeholder="Ex: 500.00">
                                        </div>
                                    </div>
                                    <small class="text-muted" style="display:block;margin-top:8px;"><i class="fas fa-info-circle"></i> Comissão lançada automaticamente no Financeiro ao confirmar o contrato.</small>
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
                                            <label>Data de Vencimento *</label>
                                            <input type="date" id="pag_avista_data" name="pag_avista_data"
                                                   value="${proposta?.condicoes_pagamento ? (() => { try { const c = JSON.parse(proposta.condicoes_pagamento); return c?.cronograma?.[0]?.data_vencimento || ''; } catch(e) { return ''; } })() : ''}"
                                                   oninput="Modals.atualizarCronograma()"
                                                   style="max-width:220px;">
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
    // Mantido por compatibilidade — sem dedução de produtora
    Modals.atualizarCronograma();
};

Modals.gerarResumoPropostaPreview = function() {
    const form = document.getElementById('propostaForm');
    if (!form) return;
    const d = new FormData(form);
    const get = k => d.get(k) || '—';

    const artistaSelect = document.getElementById('p_artista_id');
    const artistaNome   = artistaSelect?.options[artistaSelect.selectedIndex]?.text || '—';

    const cache   = parseFloat(get('cache_bruto')) || 0;
    const vendNome = get('vendedor_nome_fin') || get('vendedor_nome') || '—';
    const vendComissao = parseFloat(get('vendedor_comissao_valor')) || 0;

    document.getElementById('propostaResumo').innerHTML = `
        <div class="resumo-row"><span>Artista</span><strong>${artistaNome}</strong></div>
        <div class="resumo-row"><span>Vendedor</span><strong>${vendNome}</strong></div>
        <div class="resumo-row"><span>Contratante</span><strong>${get('razao_social') || get('nome_contratante')}</strong></div>
        <div class="resumo-row"><span>Responsável</span><strong>${get('responsavel')}</strong></div>
        <div class="resumo-row"><span>Evento</span><strong>${get('tipo_evento')} — ${get('local_evento')}</strong></div>
        <div class="resumo-row"><span>Data / Hora</span><strong>${get('data_evento') ? Utils.formatDate(get('data_evento')) : '—'}${get('horario') ? ' às ' + get('horario') : ''}</strong></div>
        <div class="resumo-row"><span>Cidade</span><strong>${get('cidade_evento')}/${get('estado_evento')}</strong></div>
        <div class="resumo-row" style="border-top:1px solid var(--border-color);margin-top:8px;padding-top:8px;">
            <span>Cachê</span><strong style="color:var(--success);font-size:16px;">${Utils.formatCurrency(cache)}</strong>
        </div>
        ${vendComissao ? `<div class="resumo-row"><span>Comissão Vendedor</span><strong style="color:var(--warning);">${Utils.formatCurrency(vendComissao)}</strong></div>` : ''}
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
    const vendedorNome = get('vendedor_nome_fin') || get('vendedor_nome') || '';

    if (pagTipo === 'avista') {
        const dataVenc = document.getElementById('pag_avista_data')?.value || null;
        cronograma = [{ valor: cacheBruto, data_vencimento: dataVenc, descricao: 'Pagamento integral', tipo: 'integral' }];
    } else {
        const linhas = document.querySelectorAll('.parcela-linha');
        linhas.forEach((linha, i) => {
            const valor      = parseFloat(linha.querySelector('.parcela-valor')?.value) || 0;
            const dataVenc   = linha.querySelector('.parcela-data')?.value || null;
            const desc       = linha.querySelector('.parcela-desc')?.value || `Parcela ${i+1}`;
            cronograma.push({ valor, data_vencimento: dataVenc, descricao: desc, tipo: i === 0 ? 'entrada' : 'restante', numero: i+1 });
        });
    }

    const data = {
        artista_id: get('artista_id'), vendedor_nome: vendedorNome,
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
        comissao: 0,
        vendedor_comissao_valor: parseFloat(get('vendedor_comissao_valor')) || 0,
        parceiro_nome: null,
        parceiro_comissao_valor: 0,
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
    const valorParcela = cache > 0 ? parseFloat((cache / n).toFixed(2)) : 0;
    const liquido = cache; // sem dedução de produtora
    const labels = ['Entrada', '2ª parcela', '3ª parcela', '4ª parcela', '5ª parcela'];

    // Carregar datas existentes se estiver editando
    let datasExistentes = [];
    try {
        const propostaEl = document.getElementById('proposta-form');
        if (propostaEl) {
            const cronStr = propostaEl.dataset.cronograma;
            if (cronStr) {
                const cron = JSON.parse(cronStr);
                datasExistentes = (cron.cronograma || []).map(c => c.data_vencimento || '');
            }
        }
    } catch(e) {}

    let html = '';
    for (let i = 0; i < n; i++) {
        // Última parcela recebe o ajuste de arredondamento
        const v = i === n - 1 ? parseFloat((liquido - valorParcela * (n - 1)).toFixed(2)) : valorParcela;
        const dataVal = datasExistentes[i] || '';
        html += `
        <div class="parcela-linha" style="display:grid;grid-template-columns:1fr 110px 140px;gap:8px;align-items:center;margin-bottom:8px;">
            <input class="parcela-desc" placeholder="${labels[i] || `Parcela ${i+1}`}" value="${labels[i] || `Parcela ${i+1}`}"
                   style="padding:6px 8px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);font-size:12px;">
            <div style="position:relative;">
                <span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:11px;color:var(--text-muted);">R$</span>
                <input type="number" class="parcela-valor" value="${v}" min="0" step="0.01"
                       oninput="Modals.validarValores()"
                       style="padding:6px 8px 6px 28px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);font-size:12px;width:100%;">
            </div>
            <input type="date" class="parcela-data" value="${dataVal}"
                   oninput="Modals.atualizarCronograma()"
                   style="padding:6px 8px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);font-size:12px;width:100%;">
        </div>`;
    }
    const el = document.getElementById('pag_parcelas_linhas');
    if (el) { el.innerHTML = html; Modals.validarValores(); Modals.atualizarCronograma(); }
};

Modals.validarValores = function() {
    const inputs = document.querySelectorAll('.parcela-valor');
    const total  = Array.from(inputs).reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
    const cache  = parseFloat(document.getElementById('p_cache')?.value) || 0;
    const el = document.getElementById('pag_pct_total');
    if (el) {
        const ok = Math.abs(total - cache) < 0.02;
        el.textContent = `Total: ${Utils.formatCurrency(total)} ${ok ? '✅' : `⚠️ deve somar ${Utils.formatCurrency(cache)}`}`;
        el.style.color = ok ? 'var(--success)' : 'var(--danger)';
    }
    Modals.atualizarCronograma();
};

Modals.atualizarCronograma = function() {
    const cache      = parseFloat(document.getElementById('p_cache')?.value) || 0;
    const liquido    = cache; // sem dedução de produtora
    const tipo       = document.getElementById('pag_tipo')?.value || 'avista';
    const prev       = document.getElementById('cronograma_preview');
    const linhasEl   = document.getElementById('cronograma_linhas');
    if (!prev || !linhasEl) return;

    if (liquido <= 0) { prev.style.display = 'none'; return; }

    let items = [];

    if (tipo === 'avista') {
        const dataStr = document.getElementById('pag_avista_data')?.value;
        if (!dataStr) { prev.style.display = 'none'; return; }
        const venc = new Date(dataStr + 'T12:00:00');
        items = [{ desc: 'Pagamento integral', valor: liquido, venc }];
    } else {
        document.querySelectorAll('.parcela-linha').forEach((linha, i) => {
            const valor   = parseFloat(linha.querySelector('.parcela-valor')?.value) || 0;
            const dataStr = linha.querySelector('.parcela-data')?.value;
            const desc    = linha.querySelector('.parcela-desc')?.value || `Parcela ${i+1}`;
            const venc    = dataStr ? new Date(dataStr + 'T12:00:00') : null;
            if (venc) items.push({ desc, valor, venc });
        });
        if (items.length === 0) { prev.style.display = 'none'; return; }
    }

    prev.style.display = 'block';
    linhasEl.innerHTML = items.map((it) => {
        const hoje  = new Date();
        const diff  = Math.ceil((it.venc - hoje) / 86400000);
        const alert = diff < 0 ? '🔴' : diff <= 7 ? '🟡' : '🟢';
        return `<div class="resumo-row">
            <span>${alert} ${it.desc}</span>
            <strong style="color:var(--success);">${Utils.formatCurrency(it.valor)} <span style="color:var(--text-muted);font-weight:400;font-size:11px;">· ${it.venc.toLocaleDateString('pt-BR')}</span></strong>
        </div>`;
    }).join('');
};

// ============================================================
// MODAL: GERAR PDF DA PROPOSTA
// ============================================================
Modals.showGerarPropostaPDF = async function(propostaId) {
    // Buscar proposta completa
    const res = await sbClient.from('propostas').select('*').eq('id', propostaId).single();
    if (res.error || !res.data) { alert('Erro ao carregar proposta.'); return; }
    const p = res.data;

    // Buscar artista
    let artistaNome = '';
    if (p.artista_id) {
        const ar = await sbClient.from('artistas').select('nome').eq('id', p.artista_id).single();
        if (ar.data) artistaNome = ar.data.nome;
    }

    const isPrefeitura = p.tipo_contratante === 'PJ' &&
        ((p.razao_social || '').toLowerCase().includes('prefeitura') ||
         (p.razao_social || '').toLowerCase().includes('municipio') ||
         (p.razao_social || '').toLowerCase().includes('município'));

    // Itens existentes ou defaults
    let itensExistentes = [];
    try { itensExistentes = JSON.parse(p.itens_proposta || '[]'); } catch(e) {}
    if (!itensExistentes.length) {
        itensExistentes = [
            { desc: 'CACHÊ ARTÍSTICO DO CANTOR', valor: '' },
            { desc: 'DIREITOS AUTORAIS E ECAD', valor: '' },
            { desc: 'APOIO LOGÍSTICO – SOM, LUZ E PALCO PARA REALIZAÇÃO DO SHOW', valor: '' },
        ];
        if (!isPrefeitura) itensExistentes.push({ desc: 'JATINHO (IDA E VOLTA)', valor: '' });
    }

    // Obrigações default
    const obgDefault = p.obrigacoes_contratante || [
        'HOSPEDAGEM: 20 (VINTE) APARTAMENTOS DUPLOS COM CAFÉ DA MANHÃ NAS NOITES ANTERIORES E POSTERIORES AO SHOW;',
        'ALIMENTAÇÃO: 20 (VINTE) REFEIÇÕES NO DIA DO SHOW;',
        'TRANSPORTE: 02 (DOIS) VAN OU MICRO-ÔNIBUS;',
        'CAMARIM: DEVIDAMENTE MONTADO COM BANHEIRO PRIVATIVO;',
        'SEGURANÇA: PARA A BANDA E PARA O ARTISTA DURANTE TODO O SHOW.',
    ].join('\n');

    const validadeDias = p.validade_proposta || 10;

    // Cronograma de pagamento
    let cronograma = [];
    try {
        var rawCp = p.condicoes_pagamento;
        if (typeof rawCp === 'string') rawCp = JSON.parse(rawCp);
        if (rawCp && Array.isArray(rawCp.cronograma)) cronograma = rawCp.cronograma;
        else if (Array.isArray(rawCp)) cronograma = rawCp;
    } catch(e) { cronograma = []; }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'modalGerarPDF';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:680px;max-height:90vh;overflow-y:auto;">
            <div class="modal-header" style="background:var(--brand-primary);color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;">
                <h3 style="margin:0;font-size:16px;"><i class="fas fa-file-pdf"></i> Gerar PDF da Proposta</h3>
                <button onclick="document.getElementById('modalGerarPDF').remove()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;">×</button>
            </div>
            <div style="padding:20px;">

                <!-- Info resumida -->
                <div style="background:var(--bg-secondary);border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px;">
                    <strong>${artistaNome}</strong> · ${p.cidade_evento || '—'}/${p.estado_evento || '—'} ·
                    ${p.data_evento ? Utils.formatDate(p.data_evento) : '—'} ·
                    <span style="color:var(--brand-primary);font-weight:600;">${Utils.formatCurrency(p.cache_bruto || 0)}</span>
                </div>

                <!-- Tipo de proposta -->
                <div class="form-group" style="margin-bottom:14px;">
                    <label style="font-size:12px;font-weight:600;color:var(--text-muted);">TIPO DE PROPOSTA</label>
                    <div style="display:flex;gap:10px;margin-top:6px;">
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
                            <input type="radio" name="pdf_tipo" value="particular" ${!isPrefeitura ? 'checked' : ''} onchange="Modals._pdfTipoChange(this.value)">
                            Particular / Empresa Privada
                        </label>
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
                            <input type="radio" name="pdf_tipo" value="prefeitura" ${isPrefeitura ? 'checked' : ''} onchange="Modals._pdfTipoChange(this.value)">
                            Prefeitura Municipal
                        </label>
                    </div>
                </div>

                <!-- Duração -->
                <div class="form-group" style="margin-bottom:14px;">
                    <label style="font-size:12px;font-weight:600;color:var(--text-muted);">DURAÇÃO DO SHOW</label>
                    <input type="text" id="pdf_duracao" class="form-control" style="margin-top:4px;"
                        value="${p.duracao_show || '90 min (noventa minutos) – 1h30m'}" placeholder="Ex: 90 min (noventa minutos)">
                </div>

                <!-- Equipe -->
                <div class="form-group" style="margin-bottom:14px;">
                    <label style="font-size:12px;font-weight:600;color:var(--text-muted);">NÚMERO DE PESSOAS NA EQUIPE</label>
                    <input type="number" id="pdf_equipe" class="form-control" style="margin-top:4px;width:120px;"
                        value="${p.equipe_pessoas || 20}" min="1">
                </div>

                <!-- Itens do preço -->
                <div class="form-group" style="margin-bottom:14px;">
                    <label style="font-size:12px;font-weight:600;color:var(--text-muted);">COMPOSIÇÃO DO VALOR</label>
                    <div id="pdf_itens" style="margin-top:8px;display:flex;flex-direction:column;gap:6px;">
                        ${itensExistentes.map((it, i) => Modals._renderItemPDFRow(it, i, isPrefeitura)).join('')}
                    </div>
                    <button onclick="Modals._addItemPDFRow()" style="margin-top:8px;background:none;border:1px dashed var(--border-color);color:var(--text-muted);padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;width:100%;">
                        <i class="fas fa-plus"></i> Adicionar item
                    </button>
                </div>

                <!-- Obrigações do contratante -->
                <div class="form-group" style="margin-bottom:14px;">
                    <label style="font-size:12px;font-weight:600;color:var(--text-muted);">OBRIGAÇÕES DO CONTRATANTE (uma por linha)</label>
                    <textarea id="pdf_obrigacoes" class="form-control" style="margin-top:4px;min-height:100px;font-size:12px;" rows="6">${obgDefault}</textarea>
                </div>

                <!-- Validade -->
                <div class="form-group" style="margin-bottom:14px;">
                    <label style="font-size:12px;font-weight:600;color:var(--text-muted);">VALIDADE DA PROPOSTA (dias)</label>
                    <input type="number" id="pdf_validade" class="form-control" style="margin-top:4px;width:120px;"
                        value="${validadeDias}" min="1" max="365">
                </div>

                <!-- Dados para pagamento -->
                <div style="background:var(--bg-secondary);border-radius:8px;padding:14px;margin-bottom:20px;">
                    <label style="font-size:12px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:10px;">DADOS PARA PAGAMENTO</label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        <div>
                            <label style="font-size:11px;color:var(--text-muted);">Razão Social</label>
                            <input type="text" id="pdf_banco_razao" class="form-control" style="font-size:12px;margin-top:2px;" value="DFG PRODUÇÕES E EVENTOS LTDA">
                        </div>
                        <div>
                            <label style="font-size:11px;color:var(--text-muted);">CNPJ</label>
                            <input type="text" id="pdf_banco_cnpj" class="form-control" style="font-size:12px;margin-top:2px;" value="24.483.999/0001-35">
                        </div>
                        <div>
                            <label style="font-size:11px;color:var(--text-muted);">Banco</label>
                            <input type="text" id="pdf_banco_nome" class="form-control" style="font-size:12px;margin-top:2px;" value="Banco Sicoob">
                        </div>
                        <div>
                            <label style="font-size:11px;color:var(--text-muted);">Agência</label>
                            <input type="text" id="pdf_banco_ag" class="form-control" style="font-size:12px;margin-top:2px;" value="3224">
                        </div>
                        <div>
                            <label style="font-size:11px;color:var(--text-muted);">Conta C/C</label>
                            <input type="text" id="pdf_banco_cc" class="form-control" style="font-size:12px;margin-top:2px;" value="19.259-7">
                        </div>
                        <div>
                            <label style="font-size:11px;color:var(--text-muted);">Chave PIX</label>
                            <input type="text" id="pdf_pix" class="form-control" style="font-size:12px;margin-top:2px;" value="(34) 99902-0200 - SICOOB">
                        </div>
                        <div>
                            <label style="font-size:11px;color:var(--text-muted);">Titular PIX</label>
                            <input type="text" id="pdf_pix_titular" class="form-control" style="font-size:12px;margin-top:2px;" value="Douglas Gomes Fonseca">
                        </div>
                        <div>
                            <label style="font-size:11px;color:var(--text-muted);">CPF Titular</label>
                            <input type="text" id="pdf_pix_cpf" class="form-control" style="font-size:12px;margin-top:2px;" value="098.549.066-71">
                        </div>
                    </div>
                </div>

                <!-- Botões -->
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button onclick="document.getElementById('modalGerarPDF').remove()" class="btn-secondary">
                        Cancelar
                    </button>
                    <button onclick="Modals._submitGerarPDF('${propostaId}')" class="btn-primary" style="background:var(--brand-primary);">
                        <i class="fas fa-file-pdf"></i> Gerar PDF
                    </button>
                </div>

            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

Modals._renderItemPDFRow = function(item, index, mostrarValor) {
    return `
        <div class="pdf-item-row" style="display:flex;gap:6px;align-items:center;" data-index="${index}">
            <input type="text" class="form-control pdf-item-desc" style="flex:1;font-size:12px;"
                placeholder="Descrição do item" value="${item.desc || ''}">
            <input type="number" class="form-control pdf-item-valor"
                style="width:130px;font-size:12px;display:${mostrarValor ? 'block' : 'none'};"
                placeholder="Valor (R$)" value="${item.valor || ''}">
            <button onclick="this.closest('.pdf-item-row').remove()" style="background:none;border:none;color:var(--danger);cursor:pointer;padding:4px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
};

Modals._addItemPDFRow = function() {
    const tipo = document.querySelector('input[name="pdf_tipo"]:checked')?.value;
    const mostrarValor = tipo === 'prefeitura';
    const container = document.getElementById('pdf_itens');
    const div = document.createElement('div');
    div.innerHTML = Modals._renderItemPDFRow({ desc: '', valor: '' }, Date.now(), mostrarValor);
    container.appendChild(div.firstElementChild);
};

Modals._pdfTipoChange = function(tipo) {
    const isPrefeitura = tipo === 'prefeitura';
    document.querySelectorAll('.pdf-item-valor').forEach(el => {
        el.style.display = isPrefeitura ? 'block' : 'none';
    });
};

Modals._submitGerarPDF = async function(propostaId) {
    const tipo = document.querySelector('input[name="pdf_tipo"]:checked')?.value || 'particular';
    const duracao = document.getElementById('pdf_duracao')?.value || '';
    const equipe = parseInt(document.getElementById('pdf_equipe')?.value) || 20;
    const obrigacoes = document.getElementById('pdf_obrigacoes')?.value || '';
    const validade = parseInt(document.getElementById('pdf_validade')?.value) || 10;

    // Coletar itens
    const itensList = [];
    document.querySelectorAll('.pdf-item-row').forEach(row => {
        const desc = row.querySelector('.pdf-item-desc')?.value?.trim();
        const valor = parseFloat(row.querySelector('.pdf-item-valor')?.value) || 0;
        if (desc) itensList.push({ desc, valor });
    });

    const dadosBancarios = {
        razao: document.getElementById('pdf_banco_razao')?.value || '',
        cnpj: document.getElementById('pdf_banco_cnpj')?.value || '',
        banco: document.getElementById('pdf_banco_nome')?.value || '',
        agencia: document.getElementById('pdf_banco_ag')?.value || '',
        conta: document.getElementById('pdf_banco_cc')?.value || '',
        pix: document.getElementById('pdf_pix')?.value || '',
        pixTitular: document.getElementById('pdf_pix_titular')?.value || '',
        pixCpf: document.getElementById('pdf_pix_cpf')?.value || '',
    };

    // Salvar campos no banco
    await sbClient.from('propostas').update({
        duracao_show: duracao,
        itens_proposta: JSON.stringify(itensList),
        obrigacoes_contratante: obrigacoes,
        validade_proposta: validade,
    }).eq('id', propostaId);

    // Buscar proposta atualizada com artista
    const res = await sbClient.from('propostas').select('*').eq('id', propostaId).single();
    let proposta = res.data || {};
    if (proposta.artista_id) {
        const ar = await sbClient.from('artistas').select('nome').eq('id', proposta.artista_id).single();
        proposta._artistaNome = ar.data?.nome || '';
    }

    document.getElementById('modalGerarPDF')?.remove();

    Pages.gerarPropostaPDF(proposta, {
        tipo,
        duracao,
        equipe,
        obrigacoes,
        validade,
        itens: itensList,
        banco: dadosBancarios,
    });
};

