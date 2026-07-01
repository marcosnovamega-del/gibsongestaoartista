/* ========================================
   GIBSON MANAGER PRO - MODAL EVENTO MULTI-STEP
   Modal de criação/edição de evento em 4 etapas
======================================== */

// Estado do formulário multi-step
let eventoFormData = {};
let currentStep = 1;

// Mostrar modal multi-step de evento
Modals.showEventoMultiStepModal = async function(eventoId = null, isNavigating = false, dadosIniciais = null) {
    const evento = eventoId ? await EventosDB.buscarPorId(eventoId) : null;
    const isEdit = !!eventoId;
    
    // Resetar dados APENAS se não estiver navegando entre passos
    if (!isNavigating) {
        if (!isEdit) {
            // Se houver dados iniciais (ex: de uma sugestão), usamos eles
            eventoFormData = {
                status: 'Confirmado',
                cache_bruto: 0,
                comissao: 10,
                ...(dadosIniciais || {})
            };
            currentStep = 1;
        } else {
            eventoFormData = {...evento};
            currentStep = 1;
        }
    }

    const html = `
        <div class="modal-overlay" onclick="if(event.target === this) Modals.close()">
            <div class="modal" style="max-width: 900px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-calendar-plus"></i> ${isEdit ? 'Editar' : 'Novo'} Evento
                    </h3>
                    <button class="modal-close" onclick="Modals.close()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Indicador de Etapas -->
                <div class="steps-indicator" style="padding: 20px 28px; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div class="step-item ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}" data-step="1">
                            <div class="step-number">1</div>
                            <div class="step-label">Informações</div>
                        </div>
                        <div class="step-line"></div>
                        <div class="step-item ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}" data-step="2">
                            <div class="step-number">2</div>
                            <div class="step-label">Contratante</div>
                        </div>
                        <div class="step-line"></div>
                        <div class="step-item ${currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : ''}" data-step="3">
                            <div class="step-number">3</div>
                            <div class="step-label">Receita</div>
                        </div>
                        <div class="step-line"></div>
                        <div class="step-item ${currentStep === 4 ? 'active' : ''}" data-step="4">
                            <div class="step-number">4</div>
                            <div class="step-label">Revisão</div>
                        </div>
                    </div>
                </div>

                <div class="modal-body" id="eventoModalBody">
                    ${await this.renderEventoStep(currentStep, evento)}
                </div>

                <div class="modal-footer">
                    ${currentStep > 1 ? `
                        <button class="btn-secondary" onclick="Modals.previousEventoStep()">
                            <i class="fas fa-chevron-left"></i> Voltar
                        </button>
                    ` : ''}
                    <button class="btn-secondary" onclick="Modals.close()">Cancelar</button>
                    ${currentStep < 4 ? `
                        <button class="btn-primary" onclick="Modals.nextEventoStep()">
                            Próximo <i class="fas fa-chevron-right"></i>
                        </button>
                    ` : `
                        <button class="btn-primary" onclick="Modals.submitEventoMultiStep('${eventoId || ''}')">
                            <i class="fas fa-check"></i> ${isEdit ? 'Salvar' : 'Criar Evento'}
                        </button>
                    `}
                </div>
            </div>
        </div>

        <style>
            .steps-indicator {
                position: relative;
            }
            .step-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                opacity: 0.5;
                transition: all 0.3s;
            }
            .step-item.active, .step-item.completed {
                opacity: 1;
            }
            .step-number {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: 2px solid var(--border-color);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 16px;
                transition: all 0.3s;
            }
            .step-item.active .step-number {
                background: var(--red-primary);
                border-color: var(--red-primary);
                color: white;
                box-shadow: 0 0 20px var(--red-glow);
            }
            .step-item.completed .step-number {
                background: var(--success);
                border-color: var(--success);
                color: white;
            }
            .step-label {
                font-size: 12px;
                font-weight: 600;
                color: var(--text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .step-item.active .step-label {
                color: var(--red-primary);
            }
            .step-line {
                flex: 1;
                height: 2px;
                background: var(--border-color);
            }
        </style>
    `;

    this.container.innerHTML = html;
};

// Renderizar etapa específica
Modals.renderEventoStep = async function(step, evento) {
    const artistas = await ArtistasDB.listarAtivos();
    
    if (artistas.length === 0) {
        return `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: var(--warning); margin-bottom: 16px;"></i>
                <h3 style="color: var(--text-secondary);">Nenhum artista ativo</h3>
                <p class="text-muted">É necessário ter pelo menos um artista ativo para criar eventos.</p>
                <button class="btn-primary mt-2" onclick="Modals.close(); Pages.changePage('artistas');">
                    <i class="fas fa-microphone"></i> Cadastrar Artista
                </button>
            </div>
        `;
    }

    switch(step) {
        case 1:
            return this.renderEventoStep1(artistas, evento);
        case 2:
            return this.renderEventoStep2(evento);
        case 3:
            return this.renderEventoStep3(artistas, evento);
        case 4:
            return await this.renderEventoStep4();
        default:
            return '';
    }
};

// ETAPA 1: Informações Gerais
Modals.renderEventoStep1 = function(artistas, evento) {
    return `
        <form id="eventoStep1Form">
            <h4 style="margin-bottom: 20px; color: var(--red-primary);">
                <i class="fas fa-info-circle"></i> Informações Gerais do Evento
            </h4>

            <div class="grid grid-2">
                <div class="form-group">
                    <label>Artista *</label>
                    <select name="artista_id" id="artistaSelect" required>
                        <option value="">Selecione o artista</option>
                        ${artistas.map(a => `
                            <option value="${a.id}" ${eventoFormData.artista_id === a.id ? 'selected' : ''}>
                                ${a.nome}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label>Status *</label>
                    <select name="status" required>
                        <option value="Confirmado" ${eventoFormData.status === 'Confirmado' ? 'selected' : ''}>Confirmado</option>
                        <option value="Reservado" ${eventoFormData.status === 'Reservado' ? 'selected' : ''}>Reservado</option>
                        <option value="Realizado" ${eventoFormData.status === 'Realizado' ? 'selected' : ''}>Realizado</option>
                        <option value="Cancelado" ${eventoFormData.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-2">
                <div class="form-group">
                    <label>Data do Evento *</label>
                    <input type="date" name="data" value="${evento ? Utils.formatDateInput(evento.data) : eventoFormData.data || ''}" required>
                </div>
                <div class="form-group">
                    <label>Horário *</label>
                    <input type="time" name="horario" value="${eventoFormData.horario || ''}" required>
                </div>
            </div>

            <div class="form-group">
                <label>Local do Evento *</label>
                <input type="text" name="local" value="${eventoFormData.local || ''}" placeholder="Nome do local" required>
            </div>

            <div class="grid grid-2">
                <div class="form-group">
                    <label>Cidade *</label>
                    <input type="text" name="cidade" value="${eventoFormData.cidade || ''}" required>
                </div>
                <div class="form-group">
                    <label>Estado (UF) *</label>
                    <input type="text" name="estado" value="${eventoFormData.estado || ''}" placeholder="SP" maxlength="2" style="text-transform: uppercase;" required>
                </div>
            </div>

            <div class="form-group">
                <label>Tipo de Evento</label>
                <input type="text" name="tipo_evento" value="${eventoFormData.tipo_evento || ''}" placeholder="Ex: Show, Festa, Festival">
            </div>
        </form>
    `;
};

// ETAPA 2: Dados do Contratante
Modals.renderEventoStep2 = function(evento) {
    const tipoContratante = eventoFormData.tipo_contratante || 'PJ';
    
    return `
        <form id="eventoStep2Form">
            <h4 style="margin-bottom: 20px; color: var(--red-primary);">
                <i class="fas fa-user-tie"></i> Dados do Contratante
            </h4>

            <div class="form-group">
                <label>Tipo de Contratante *</label>
                <select name="tipo_contratante" id="tipoContratanteSelect" onchange="Modals.toggleContratanteFieldsMultiStep()" required>
                    <option value="PJ" ${tipoContratante === 'PJ' ? 'selected' : ''}>Pessoa Jurídica (PJ)</option>
                    <option value="PF" ${tipoContratante === 'PF' ? 'selected' : ''}>Pessoa Física (PF)</option>
                </select>
            </div>

            <!-- Campos PJ -->
            <div id="camposPJMulti" style="display: ${tipoContratante === 'PJ' ? 'block' : 'none'};">
                <div class="form-group">
                    <label>Razão Social *</label>
                    <input type="text" name="razao_social" value="${eventoFormData.razao_social || ''}">
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Nome Fantasia</label>
                        <input type="text" name="nome_fantasia" value="${eventoFormData.nome_fantasia || ''}">
                    </div>
                    <div class="form-group">
                        <label>CNPJ *</label>
                        <input type="text" name="cnpj" value="${eventoFormData.cnpj || ''}" placeholder="00.000.000/0000-00">
                    </div>
                </div>
            </div>

            <!-- Campos PF -->
            <div id="camposPFMulti" style="display: ${tipoContratante === 'PF' ? 'block' : 'none'};">
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Nome Completo *</label>
                        <input type="text" name="nome_contratante" value="${eventoFormData.nome_contratante || ''}">
                    </div>
                    <div class="form-group">
                        <label>CPF *</label>
                        <input type="text" name="cpf_contratante" value="${eventoFormData.cpf_contratante || ''}" placeholder="000.000.000-00">
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label>Endereço Completo</label>
                <input type="text" name="endereco" value="${eventoFormData.endereco || ''}">
            </div>

            <div class="grid grid-2">
                <div class="form-group">
                    <label>Responsável</label>
                    <input type="text" name="responsavel" value="${eventoFormData.responsavel || ''}">
                </div>
                <div class="form-group">
                    <label>Telefone *</label>
                    <input type="text" name="telefone_contratante" value="${eventoFormData.telefone_contratante || ''}" placeholder="(00) 00000-0000" required>
                </div>
            </div>

            <div class="form-group">
                <label>Email do Contratante</label>
                <input type="email" name="email_contratante" value="${eventoFormData.email_contratante || ''}">
            </div>
        </form>
    `;
};

// ETAPA 3: Receita
Modals.renderEventoStep3 = async function(artistas, evento) {
    // Buscar comissão do artista selecionado
    let comissaoPadrao = 0;
    if (eventoFormData.artista_id) {
        const artista = await ArtistasDB.buscarPorId(eventoFormData.artista_id);
        if (artista) comissaoPadrao = artista.comissao_padrao || 0;
    }

    if (!eventoFormData.comissao) {
        eventoFormData.comissao = comissaoPadrao;
    }

    return `
        <form id="eventoStep3Form">
            <h4 style="margin-bottom: 20px; color: var(--red-primary);">
                <i class="fas fa-dollar-sign"></i> Receita do Evento
            </h4>

            <div class="grid grid-3">
                <div class="form-group">
                    <label>Cachê Bruto (R$) *</label>
                    <input type="number" name="cache_bruto" id="cacheBrutoMulti" value="${eventoFormData.cache_bruto || ''}" min="0" step="0.01" onchange="Modals.calcularValorLiquidoMulti()" required>
                </div>
                <div class="form-group">
                    <label>Comissão (R$) *</label>
                    <input type="number" name="comissao" id="comissaoMulti" value="${eventoFormData.comissao || comissaoPadrao}" min="0" step="0.01" onchange="Modals.calcularValorLiquidoMulti()" required>
                </div>
                <div class="form-group">
                    <label>Valor Líquido (R$)</label>
                    <input type="number" id="valorLiquidoMulti" readonly style="background: var(--bg-secondary); color: var(--success); font-weight: 700; font-size: 16px;">
                </div>
            </div>

            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" name="alimentacao_inclusa" ${eventoFormData.alimentacao_inclusa ? 'checked' : ''} style="width: auto;">
                    Alimentação inclusa pelo contratante
                </label>
            </div>

            <div style="margin-top: 24px; padding: 20px; background: rgba(16, 185, 129, 0.1); border-radius: 12px; border: 1px solid var(--success);">
                <h5 style="color: var(--success); margin-bottom: 12px;">
                    <i class="fas fa-info-circle"></i> Cálculo Automático
                </h5>
                <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">
                    O valor líquido é calculado automaticamente: <strong>Cachê Bruto - Comissão</strong><br>
                    Após criar o evento, você poderá adicionar despesas para calcular o lucro líquido real.
                </p>
            </div>
        </form>

        <script>
            // Calcular valor líquido inicial
            setTimeout(() => Modals.calcularValorLiquidoMulti(), 100);
        </script>
    `;
};

// ETAPA 4: Revisão Final
Modals.renderEventoStep4 = async function() {
    const artista = eventoFormData.artista_id ? await ArtistasDB.buscarPorId(eventoFormData.artista_id) : null;
    
    return `
        <div>
            <h4 style="margin-bottom: 20px; color: var(--red-primary);">
                <i class="fas fa-check-circle"></i> Revisar Informações
            </h4>

            <div class="card mb-3" style="background: var(--bg-secondary);">
                <h5 style="color: var(--red-primary); margin-bottom: 12px;">Informações Gerais</h5>
                <div class="grid grid-2" style="gap: 12px; font-size: 14px;">
                    <div><strong>Artista:</strong> ${artista ? artista.nome : '-'}</div>
                    <div><strong>Status:</strong> <span class="badge badge-success">${eventoFormData.status}</span></div>
                    <div><strong>Data:</strong> ${Utils.formatDate(eventoFormData.data)}</div>
                    <div><strong>Horário:</strong> ${eventoFormData.horario}</div>
                    <div><strong>Local:</strong> ${eventoFormData.local}</div>
                    <div><strong>Cidade:</strong> ${eventoFormData.cidade}/${eventoFormData.estado}</div>
                </div>
            </div>

            <div class="card mb-3" style="background: var(--bg-secondary);">
                <h5 style="color: var(--red-primary); margin-bottom: 12px;">Contratante</h5>
                <div class="grid grid-2" style="gap: 12px; font-size: 14px;">
                    <div><strong>Tipo:</strong> ${eventoFormData.tipo_contratante === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}</div>
                    ${eventoFormData.tipo_contratante === 'PJ' ? `
                        <div><strong>Razão Social:</strong> ${eventoFormData.razao_social || '-'}</div>
                        <div><strong>CNPJ:</strong> ${eventoFormData.cnpj ? Utils.formatCNPJ(eventoFormData.cnpj) : '-'}</div>
                    ` : `
                        <div><strong>Nome:</strong> ${eventoFormData.nome_contratante || '-'}</div>
                        <div><strong>CPF:</strong> ${eventoFormData.cpf_contratante ? Utils.formatCPF(eventoFormData.cpf_contratante) : '-'}</div>
                    `}
                    <div><strong>Telefone:</strong> ${Utils.formatPhone(eventoFormData.telefone_contratante) || '-'}</div>
                    <div><strong>Email:</strong> ${eventoFormData.email_contratante || '-'}</div>
                </div>
            </div>

            <div class="card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, var(--bg-secondary) 100%); border: 1px solid var(--success);">
                <h5 style="color: var(--success); margin-bottom: 12px;">Receita</h5>
                <div class="grid grid-3" style="gap: 12px; font-size: 14px;">
                    <div>
                        <strong>Cachê Bruto:</strong><br>
                        <span style="font-size: 20px; color: var(--success);">${Utils.formatCurrency(eventoFormData.cache_bruto)}</span>
                    </div>
                    <div>
                        <strong>Comissão:</strong><br>
                        <span style="font-size: 20px; color: var(--warning);">${Utils.formatCurrency(parseFloat(eventoFormData.comissao) || 0)}</span>
                    </div>
                    <div>
                        <strong>Valor Líquido:</strong><br>
                        <span style="font-size: 20px; color: var(--success); font-weight: 700;">${Utils.formatCurrency(eventoFormData.valor_liquido)}</span>
                    </div>
                </div>
            </div>

            <div style="margin-top: 24px; padding: 20px; background: rgba(225, 6, 0, 0.1); border-radius: 12px; border: 1px solid var(--red-primary); text-align: center;">
                <i class="fas fa-lightbulb" style="font-size: 24px; color: var(--red-primary); margin-bottom: 12px;"></i>
                <p style="margin: 0; color: var(--text-secondary);">
                    Após criar o evento, você poderá <strong style="color: var(--red-primary);">adicionar despesas</strong> 
                    para calcular o <strong>lucro líquido real</strong> do evento.
                </p>
            </div>
        </div>
    `;
};

// Funções de navegação
Modals.nextEventoStep = function() {
    // Validar etapa atual
    const form = document.getElementById(`eventoStep${currentStep}Form`);
    if (form && !form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Salvar dados da etapa atual
    if (form) {
        const formData = new FormData(form);
        for (let [key, value] of formData.entries()) {
            if (key === 'alimentacao_inclusa') {
                eventoFormData[key] = formData.get(key) === 'on';
            } else {
                eventoFormData[key] = value;
            }
        }

        // Calcular valor líquido
        if (currentStep === 3) {
            const cacheBruto = parseFloat(eventoFormData.cache_bruto) || 0;
            const comissao = parseFloat(eventoFormData.comissao) || 0;
            eventoFormData.valor_liquido = cacheBruto - comissao;
        }
    }

    currentStep++;
    this.showEventoMultiStepModal(eventoFormData.id, true);
};

Modals.previousEventoStep = function() {
    currentStep--;
    this.showEventoMultiStepModal(eventoFormData.id, true);
};

// Toggle campos contratante
Modals.toggleContratanteFieldsMultiStep = function() {
    const tipo = document.getElementById('tipoContratanteSelect').value;
    document.getElementById('camposPJMulti').style.display = tipo === 'PJ' ? 'block' : 'none';
    document.getElementById('camposPFMulti').style.display = tipo === 'PF' ? 'block' : 'none';
};

// Calcular valor líquido
Modals.calcularValorLiquidoMulti = function() {
    const cacheBruto = parseFloat(document.getElementById('cacheBrutoMulti')?.value) || 0;
    const comissao = parseFloat(document.getElementById('comissaoMulti')?.value) || 0;
    const valorLiquido = cacheBruto - comissao;
    const elem = document.getElementById('valorLiquidoMulti');
    if (elem) {
        elem.value = valorLiquido.toFixed(2);
    }
};

// Submeter formulário final
Modals.submitEventoMultiStep = async function(eventoId) {
    if (this._isSubmitting) return;
    this._isSubmitting = true;
    
    Utils.showLoading();

    try {
        let result;
        if (eventoId) {
            result = await EventosDB.atualizar(eventoId, eventoFormData);
        } else {
            result = await EventosDB.criar(eventoFormData);
            // Gerar contrato automaticamente
            if (result) {
                await Modals.gerarContratoEvento(result.id, eventoFormData.artista_id);
            }
        }

        Utils.hideLoading();

        if (result) {
            Utils.showToast(`Evento ${eventoId ? 'atualizado' : 'cadastrado'} com sucesso!`, 'success');
            this.close();
            Pages.renderEventos();
        } else {
            throw new Error('Erro ao salvar evento');
        }
    } catch (error) {
        Utils.hideLoading();
        Utils.showToast(error.message || 'Erro ao salvar evento', 'error');
    }
};