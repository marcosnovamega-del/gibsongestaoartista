/* ========================================
   GIBSON MANAGER PRO - MODALS
   Sistema de modais e formulários
======================================== */

const Modals = {
    container: null,

    init() {
        this.container = document.getElementById('modalContainer');
    },

    close() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    },

    // Modal de Artista
    async showArtistaModal(artistaId = null) {
        const artista = artistaId ? await ArtistasDB.buscarPorId(artistaId) : null;
        const isEdit = !!artistaId;

        const html = `
            <div class="modal-overlay" onclick="if(event.target === this) Modals.close()">
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">
                            <i class="fas fa-microphone"></i> ${isEdit ? 'Editar' : 'Novo'} Artista
                        </h3>
                        <button class="modal-close" onclick="Modals.close()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="artistaForm" onsubmit="Modals.submitArtistaForm(event, '${artistaId || ''}')">
                            <div class="form-group">
                                <label>Nome Artístico *</label>
                                <input type="text" name="nome" value="${artista?.nome || ''}" required>
                            </div>
                            ${Storage.renderUploadInput('foto', artista?.foto || '', 'Foto do Artista')}
                            <div class="form-group">
                                <label>Status *</label>
                                <select name="status" required>
                                    <option value="Ativo" ${artista?.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                                    <option value="Pausado" ${artista?.status === 'Pausado' ? 'selected' : ''}>Pausado</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Comissão Padrão (R$)</label>
                                <input type="number" name="comissao_padrao" value="${artista?.comissao_padrao || 0}" min="0" step="0.01" placeholder="0.00">
                            </div>
                            <div class="grid grid-2">
                                ${Storage.renderUploadInput('midia_kit_url', artista?.midia_kit_url || '', 'Mídia Kit (PDF)')}
                                ${Storage.renderUploadInput('rider_tecnico_url', artista?.rider_tecnico_url || '', 'Rider Técnico (PDF)')}
                            </div>

                            <!-- DADOS BANCÁRIOS DO ARTISTA -->
                            <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:10px;padding:16px;margin-top:8px;">
                                <label style="font-size:13px;font-weight:700;color:var(--text-primary);display:block;margin-bottom:12px;">
                                    <i class="fas fa-university" style="color:var(--brand-primary)"></i> Dados para Pagamento (Proposta)
                                    <span style="font-size:11px;font-weight:400;color:var(--text-muted);margin-left:6px;">Pré-preenchido na geração da proposta</span>
                                </label>
                                <div class="grid grid-2">
                                    <div class="form-group" style="margin-bottom:8px;">
                                        <label style="font-size:11px;">Razão Social</label>
                                        <input type="text" id="art_banco_razao" value="${(() => { try { const b = typeof artista?.dados_bancarios === 'string' ? JSON.parse(artista.dados_bancarios) : (artista?.dados_bancarios || {}); return b.razao || ''; } catch(e) { return ''; } })()}" placeholder="Razão social ou nome" style="font-size:12px;">
                                    </div>
                                    <div class="form-group" style="margin-bottom:8px;">
                                        <label style="font-size:11px;">CNPJ / CPF</label>
                                        <input type="text" id="art_banco_cnpj" value="${(() => { try { const b = typeof artista?.dados_bancarios === 'string' ? JSON.parse(artista.dados_bancarios) : (artista?.dados_bancarios || {}); return b.cnpj || ''; } catch(e) { return ''; } })()}" placeholder="CNPJ ou CPF" style="font-size:12px;">
                                    </div>
                                    <div class="form-group" style="margin-bottom:8px;">
                                        <label style="font-size:11px;">Banco</label>
                                        <input type="text" id="art_banco_nome" value="${(() => { try { const b = typeof artista?.dados_bancarios === 'string' ? JSON.parse(artista.dados_bancarios) : (artista?.dados_bancarios || {}); return b.banco || ''; } catch(e) { return ''; } })()}" placeholder="Nome do banco" style="font-size:12px;">
                                    </div>
                                    <div class="form-group" style="margin-bottom:8px;">
                                        <label style="font-size:11px;">Agência</label>
                                        <input type="text" id="art_banco_ag" value="${(() => { try { const b = typeof artista?.dados_bancarios === 'string' ? JSON.parse(artista.dados_bancarios) : (artista?.dados_bancarios || {}); return b.agencia || ''; } catch(e) { return ''; } })()}" placeholder="Agência" style="font-size:12px;">
                                    </div>
                                    <div class="form-group" style="margin-bottom:8px;">
                                        <label style="font-size:11px;">Conta C/C</label>
                                        <input type="text" id="art_banco_cc" value="${(() => { try { const b = typeof artista?.dados_bancarios === 'string' ? JSON.parse(artista.dados_bancarios) : (artista?.dados_bancarios || {}); return b.conta || ''; } catch(e) { return ''; } })()}" placeholder="Conta corrente" style="font-size:12px;">
                                    </div>
                                    <div class="form-group" style="margin-bottom:8px;">
                                        <label style="font-size:11px;">Chave PIX</label>
                                        <input type="text" id="art_banco_pix" value="${(() => { try { const b = typeof artista?.dados_bancarios === 'string' ? JSON.parse(artista.dados_bancarios) : (artista?.dados_bancarios || {}); return b.pix || ''; } catch(e) { return ''; } })()}" placeholder="Chave PIX" style="font-size:12px;">
                                    </div>
                                    <div class="form-group" style="margin-bottom:8px;">
                                        <label style="font-size:11px;">Titular PIX</label>
                                        <input type="text" id="art_banco_pix_titular" value="${(() => { try { const b = typeof artista?.dados_bancarios === 'string' ? JSON.parse(artista.dados_bancarios) : (artista?.dados_bancarios || {}); return b.pixTitular || ''; } catch(e) { return ''; } })()}" placeholder="Nome do titular" style="font-size:12px;">
                                    </div>
                                    <div class="form-group" style="margin-bottom:8px;">
                                        <label style="font-size:11px;">CPF Titular</label>
                                        <input type="text" id="art_banco_pix_cpf" value="${(() => { try { const b = typeof artista?.dados_bancarios === 'string' ? JSON.parse(artista.dados_bancarios) : (artista?.dados_bancarios || {}); return b.pixCpf || ''; } catch(e) { return ''; } })()}" placeholder="CPF do titular" style="font-size:12px;">
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="Modals.close()">Cancelar</button>
                        <button class="btn-primary" onclick="document.getElementById('artistaForm').requestSubmit()">
                            <i class="fas fa-save"></i> Salvar
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
    },

    async submitArtistaForm(event, artistaId) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const data = {
            nome: formData.get('nome'),
            foto: document.getElementById('url-foto')?.value || formData.get('foto') || '',
            midia_kit_url: document.getElementById('url-midia_kit_url')?.value || '',
            rider_tecnico_url: document.getElementById('url-rider_tecnico_url')?.value || '',
            status: formData.get('status'),
            comissao_padrao: parseFloat(formData.get('comissao_padrao')),
            dados_bancarios: {
                razao:       document.getElementById('art_banco_razao')?.value || '',
                cnpj:        document.getElementById('art_banco_cnpj')?.value || '',
                banco:       document.getElementById('art_banco_nome')?.value || '',
                agencia:     document.getElementById('art_banco_ag')?.value || '',
                conta:       document.getElementById('art_banco_cc')?.value || '',
                pix:         document.getElementById('art_banco_pix')?.value || '',
                pixTitular:  document.getElementById('art_banco_pix_titular')?.value || '',
                pixCpf:      document.getElementById('art_banco_pix_cpf')?.value || '',
            }
        };

        Utils.showLoading();
        let result;
        if (artistaId) {
            result = await ArtistasDB.atualizar(artistaId, data);
        } else {
            result = await ArtistasDB.criar(data);
        }
        Utils.hideLoading();

        if (result) {
            Utils.showToast(`Artista ${artistaId ? 'atualizado' : 'cadastrado'} com sucesso!`, 'success');
            this.close();
            Pages.renderArtistas();
        } else {
            Utils.showToast('Erro ao salvar artista', 'error');
        }
    },

    // Modal de Equipe
    async showEquipeModal(membroId = null, artistaIdDefault = null) {
        const membro = membroId ? await EquipeDB.buscarPorId(membroId) : null;
        const isEdit = !!membroId;
        const artistas = await ArtistasDB.listar();

        const html = `
            <div class="modal-overlay" onclick="if(event.target === this) Modals.close()">
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">
                            <i class="fas fa-user-plus"></i> ${isEdit ? 'Editar' : 'Novo'} Membro da Equipe
                        </h3>
                        <button class="modal-close" onclick="Modals.close()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="equipeForm" onsubmit="Modals.submitEquipeForm(event, '${membroId || ''}')">
                            <div class="form-group">
                                <label>Artista *</label>
                                <select name="artista_id" required ${isEdit ? 'disabled' : ''}>
                                    <option value="">Selecione o artista</option>
                                    ${artistas.map(a => `
                                        <option value="${a.id}" ${(membro?.artista_id || artistaIdDefault) === a.id ? 'selected' : ''}>
                                            ${a.nome}
                                        </option>
                                    `).join('')}
                                </select>
                                ${isEdit ? `<input type="hidden" name="artista_id" value="${membro.artista_id}">` : ''}
                            </div>
                            <div class="form-group">
                                <label>Nome Completo *</label>
                                <input type="text" name="nome" value="${membro?.nome || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>Função *</label>
                                <input type="text" name="funcao" value="${membro?.funcao || ''}" placeholder="Ex: Músico, Produtor, Técnico de Som" required>
                            </div>
                            <div class="grid grid-2">
                                <div class="form-group">
                                    <label>CPF *</label>
                                    <input type="text" name="cpf" value="${membro?.cpf || ''}" placeholder="000.000.000-00" required>
                                </div>
                                <div class="form-group">
                                    <label>Telefone *</label>
                                    <input type="text" name="telefone" value="${membro?.telefone || ''}" placeholder="(00) 00000-0000" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" name="email" value="${membro?.email || ''}">
                            </div>
                            <div class="form-group">
                                <label>Tipo de Vínculo *</label>
                                <select name="tipo_vinculo" id="tipoVinculo" onchange="Modals.toggleVinculoFields()" required>
                                    <option value="Fixo" ${membro?.tipo_vinculo === 'Fixo' ? 'selected' : ''}>Fixo</option>
                                    <option value="Por show" ${membro?.tipo_vinculo === 'Por show' ? 'selected' : ''}>Por show</option>
                                </select>
                            </div>
                            <div class="grid grid-2">
                                <div class="form-group">
                                    <label>Valor Fixo por Show (R$)</label>
                                    <input type="number" name="valor_fixo" id="valorFixo" value="${membro?.valor_fixo || ''}" min="0" step="0.01">
                                </div>
                                <div class="form-group">
                                    <label>Percentual (%)</label>
                                    <input type="number" name="percentual" id="percentual" value="${membro?.percentual || ''}" min="0" max="100" step="0.5">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Observações</label>
                                <textarea name="observacoes" rows="3">${membro?.observacoes || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        ${isEdit ? `
                            <button class="btn-secondary" onclick="Pages.deletarMembroEquipe('${membroId}')" style="color:var(--danger);margin-right:auto;">
                                <i class="fas fa-trash"></i> Excluir
                            </button>
                        ` : ''}
                        <button class="btn-secondary" onclick="Modals.close()">Cancelar</button>
                        <button class="btn-primary" onclick="document.getElementById('equipeForm').requestSubmit()">
                            <i class="fas fa-save"></i> Salvar
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
    },

    toggleVinculoFields() {
        const tipo = document.getElementById('tipoVinculo').value;
        // Ambos os campos sempre visíveis, apenas sugestão de uso
    },

    async submitEquipeForm(event, membroId) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const data = {
            artista_id: formData.get('artista_id'),
            nome: formData.get('nome'),
            funcao: formData.get('funcao'),
            cpf: formData.get('cpf'),
            telefone: formData.get('telefone'),
            email: formData.get('email'),
            tipo_vinculo: formData.get('tipo_vinculo'),
            valor_fixo: parseFloat(formData.get('valor_fixo')) || 0,
            percentual: parseFloat(formData.get('percentual')) || 0,
            observacoes: formData.get('observacoes')
        };

        Utils.showLoading();
        let result;
        if (membroId) {
            result = await EquipeDB.atualizar(membroId, data);
        } else {
            result = await EquipeDB.criar(data);
        }
        Utils.hideLoading();

        if (result) {
            Utils.showToast(`Membro ${membroId ? 'atualizado' : 'cadastrado'} com sucesso!`, 'success');
            this.close();
            
            // Atualizar a página atual
            const currentPage = document.querySelector('.nav-item.active').dataset.page;
            if (currentPage === 'equipe') {
                Pages.renderEquipe();
            } else {
                Pages.renderArtistaProfile(data.artista_id);
            }
        } else {
            Utils.showToast('Erro ao salvar membro', 'error');
        }
    },

    // Modal de Evento (continua na próxima parte devido ao tamanho)
    async showEventoModal(eventoId = null, dadosPreenchidos = null) {
        const evento = eventoId ? await EventosDB.buscarPorId(eventoId) : (dadosPreenchidos || null);
        const isEdit = !!eventoId;
        const artistas = await ArtistasDB.listarAtivos();

        // Se for edição, buscar despesas existentes
        let despesas = [];
        if (isEdit) {
            despesas = await DespesasDB.buscarPorEvento(eventoId);
        }

        const html = `
            <div class="modal-overlay" onclick="if(event.target === this) Modals.close()" style="overflow-y: auto;">
                <div class="modal" style="max-width: 900px; margin: 40px auto;">
                    <div class="modal-header">
                        <h3 class="modal-title">
                            <i class="fas fa-ticket-alt"></i> ${isEdit ? 'Editar' : 'Novo'} Evento
                        </h3>
                        <button class="modal-close" onclick="Modals.close()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="eventoForm" onsubmit="Modals.submitEventoForm(event, '${eventoId || ''}')">
                            <!-- Informações Gerais -->
                            <h4 style="margin-bottom: 16px; color: var(--red-primary);">
                                <i class="fas fa-info-circle"></i> Informações Gerais
                            </h4>
                            
                            <div class="grid grid-2">
                                <div class="form-group">
                                    <label>Artista *</label>
                                    <select name="artista_id" required>
                                        <option value="">Selecione o artista</option>
                                        ${artistas.map(a => `
                                            <option value="${a.id}" ${evento?.artista_id === a.id ? 'selected' : ''}>
                                                ${a.nome}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Status *</label>
                                    <select name="status" required>
                                        <option value="Confirmado" ${evento?.status === 'Confirmado' ? 'selected' : ''}>Confirmado</option>
                                        <option value="Reserva" ${evento?.status === 'Reserva' || evento?.status === 'Reservado' ? 'selected' : ''}>Reserva</option>
                                        <option value="Realizado" ${evento?.status === 'Realizado' ? 'selected' : ''}>Realizado</option>
                                        <option value="Cancelado" ${evento?.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                                    </select>
                                </div>
                            </div>

                            <div class="grid grid-2">
                                <div class="form-group">
                                    <label>Data do Evento *</label>
                                    <input type="date" name="data" value="${evento ? Utils.formatDateInput(evento.data) : ''}" required>
                                </div>
                                <div class="form-group">
                                    <label>Horário *</label>
                                    <input type="time" name="horario" value="${evento?.horario || ''}" required>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Local do Evento *</label>
                                <input type="text" name="local" value="${evento?.local || ''}" placeholder="Nome do local" required>
                            </div>

                            <div class="grid grid-2">
                                <div class="form-group">
                                    <label>Cidade *</label>
                                    <input type="text" name="cidade" value="${evento?.cidade || ''}" required>
                                </div>
                                <div class="form-group">
                                    <label>Estado *</label>
                                    <input type="text" name="estado" value="${evento?.estado || ''}" placeholder="UF" maxlength="2" required>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Tipo de Evento</label>
                                <input type="text" name="tipo_evento" value="${evento?.tipo_evento || ''}" placeholder="Ex: Show, Festa, Festival">
                            </div>

                            <!-- Dados do Contratante -->
                            <h4 style="margin: 24px 0 16px; color: var(--red-primary);">
                                <i class="fas fa-user-tie"></i> Dados do Contratante
                            </h4>

                            <div class="form-group">
                                <label>Tipo de Contratante *</label>
                                <select name="tipo_contratante" id="tipoContratante" onchange="Modals.toggleContratanteFields()" required>
                                    <option value="PJ" ${evento?.tipo_contratante === 'PJ' ? 'selected' : ''}>Pessoa Jurídica (PJ)</option>
                                    <option value="PF" ${evento?.tipo_contratante === 'PF' ? 'selected' : ''}>Pessoa Física (PF)</option>
                                </select>
                            </div>

                            <!-- Campos PJ -->
                            <div id="camposPJ" style="display: ${evento?.tipo_contratante === 'PJ' || !evento ? 'block' : 'none'};">
                                <div class="form-group">
                                    <label>Razão Social</label>
                                    <input type="text" name="razao_social" value="${evento?.razao_social || ''}">
                                </div>
                                <div class="grid grid-2">
                                    <div class="form-group">
                                        <label>Nome Fantasia</label>
                                        <input type="text" name="nome_fantasia" value="${evento?.nome_fantasia || ''}">
                                    </div>
                                    <div class="form-group">
                                        <label>CNPJ</label>
                                        <input type="text" name="cnpj" value="${evento?.cnpj || ''}" placeholder="00.000.000/0000-00">
                                    </div>
                                </div>
                            </div>

                            <!-- Campos PF -->
                            <div id="camposPF" style="display: ${evento?.tipo_contratante === 'PF' ? 'block' : 'none'};">
                                <div class="grid grid-2">
                                    <div class="form-group">
                                        <label>Nome Completo</label>
                                        <input type="text" name="nome_contratante" value="${evento?.nome_contratante || ''}">
                                    </div>
                                    <div class="form-group">
                                        <label>CPF</label>
                                        <input type="text" name="cpf_contratante" value="${evento?.cpf_contratante || ''}" placeholder="000.000.000-00">
                                    </div>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Endereço Completo</label>
                                <input type="text" name="endereco" value="${evento?.endereco || ''}">
                            </div>

                            <div class="grid grid-2">
                                <div class="form-group">
                                    <label>Responsável</label>
                                    <input type="text" name="responsavel" value="${evento?.responsavel || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Telefone *</label>
                                    <input type="text" name="telefone_contratante" value="${evento?.telefone_contratante || ''}" placeholder="(00) 00000-0000" required>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Email do Contratante</label>
                                <input type="email" name="email_contratante" value="${evento?.email_contratante || ''}">
                            </div>

                            <!-- Receita do Evento -->
                            <h4 style="margin: 24px 0 16px; color: var(--red-primary);">
                                <i class="fas fa-dollar-sign"></i> Receita do Evento
                            </h4>

                            <div class="grid grid-3">
                                <div class="form-group">
                                    <label>Cachê Bruto (R$) *</label>
                                    <input type="number" name="cache_bruto" id="cacheBruto" value="${evento?.cache_bruto || ''}" min="0" step="0.01" onchange="Modals.calcularValorLiquido()" required>
                                </div>
                                <div class="form-group">
                                    <label>Comissão (R$)</label>
                                    <input type="number" name="comissao" id="comissao" value="${evento?.comissao || 0}" min="0" step="0.01" onchange="Modals.calcularValorLiquido()" placeholder="0.00">
                                </div>
                                <div class="form-group">
                                    <label>Valor Líquido (R$)</label>
                                    <input type="number" id="valorLiquido" value="${evento?.valor_liquido || ''}" readonly style="background: var(--bg-secondary); color: var(--success); font-weight: 700;">
                                </div>
                            </div>

                            <div class="form-group">
                                <label style="display: flex; align-items: center; gap: 8px;">
                                    <input type="checkbox" name="alimentacao_inclusa" ${evento?.alimentacao_inclusa ? 'checked' : ''}>
                                    Alimentação inclusa pelo contratante
                                </label>
                            </div>

                            <!-- Botão Avançar para Despesas -->
                            ${isEdit ? `
                                <div style="margin-top: 24px; padding: 20px; background: var(--bg-secondary); border-radius: 8px; text-align: center;">
                                    <p style="color: var(--text-secondary); margin-bottom: 12px;">
                                        Para gerenciar despesas, clique no botão abaixo após salvar
                                    </p>
                                    <button type="button" class="btn-primary" onclick="Modals.showDespesasModal('${eventoId}')">
                                        <i class="fas fa-money-bill-wave"></i> Gerenciar Despesas
                                    </button>
                                </div>
                            ` : ''}
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="Modals.close()">Cancelar</button>
                        <button class="btn-primary" onclick="document.getElementById('eventoForm').requestSubmit()">
                            <i class="fas fa-save"></i> Salvar Evento
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        
        // Calcular valor líquido inicial se for edição
        if (isEdit) {
            this.calcularValorLiquido();
        }
    },

    toggleContratanteFields() {
        const tipo = document.getElementById('tipoContratante').value;
        document.getElementById('camposPJ').style.display = tipo === 'PJ' ? 'block' : 'none';
        document.getElementById('camposPF').style.display = tipo === 'PF' ? 'block' : 'none';
    },

    calcularValorLiquido() {
        const cacheBruto = parseFloat(document.getElementById('cacheBruto').value) || 0;
        const comissao = parseFloat(document.getElementById('comissao').value) || 0;
        const valorLiquido = cacheBruto - comissao;   // comissao agora é R$, não %
        document.getElementById('valorLiquido').value = valorLiquido.toFixed(2);
    },

    async submitEventoForm(event, eventoId) {
        event.preventDefault();
        if (this._isSubmitting) return;
        this._isSubmitting = true;

        const form = event.target;
        const formData = new FormData(form);

        const data = {
            artista_id: formData.get('artista_id'),
            data: formData.get('data'),
            horario: formData.get('horario'),
            local: formData.get('local'),
            cidade: formData.get('cidade'),
            estado: formData.get('estado')?.toUpperCase() || '',
            tipo_evento: formData.get('tipo_evento'),
            tipo_contratante: formData.get('tipo_contratante'),
            razao_social: formData.get('razao_social'),
            nome_fantasia: formData.get('nome_fantasia'),
            cnpj: formData.get('cnpj'),
            nome_contratante: formData.get('nome_contratante'),
            cpf_contratante: formData.get('cpf_contratante'),
            endereco: formData.get('endereco'),
            responsavel: formData.get('responsavel'),
            email_contratante: formData.get('email_contratante'),
            telefone_contratante: formData.get('telefone_contratante'),
            cache_bruto: parseFloat(formData.get('cache_bruto')) || 0,
            comissao: parseFloat(formData.get('comissao')) || 0,
            alimentacao_inclusa: formData.get('alimentacao_inclusa') === 'on',
            status: formData.get('status') || 'Confirmado'
        };

        Utils.showLoading();
        try {
            let result;
            if (eventoId) {
                result = await EventosDB.atualizar(eventoId, data);
            } else {
                result = await EventosDB.criar(data);
                // Gerar contrato automaticamente
                if (result) {
                    await this.gerarContratoEvento(result.id, data.artista_id);
                }
            }
            Utils.hideLoading();

            if (result) {
                Utils.showToast(`Evento ${eventoId ? 'atualizado' : 'cadastrado'} com sucesso!`, 'success');
                this.close();
                Pages.renderEventos();
            } else {
                Utils.showToast('Erro ao salvar evento', 'error');
            }
        } catch (error) {
            Utils.hideLoading();
            Utils.showToast('Erro ao salvar evento', 'error');
        } finally {
            this._isSubmitting = false;
        }
    },

    async gerarContratoEvento(eventoId, artistaId) {
        try {
            const artista  = await ArtistasDB.buscarPorId(artistaId);
            const evento   = await EventosDB.buscarPorId(eventoId);
            // Buscar proposta para usar dados de contrato com entidade diferente
            const proposta = evento?.proposta_id ? await PropostasDB.buscarPorId(evento.proposta_id) : null;

            if (!artista || !evento) {
                console.error('gerarContratoEvento: artista ou evento não encontrado', { artistaId, eventoId });
                return null;
            }

            // Não duplicar
            const existente = await ContratosDB.buscarPorEvento(eventoId);
            if (existente) return existente;

            // Determinar dados do contratante para o contrato
            const usarEntidadeDiferente = proposta?.contrato_entidade_diferente;
            const nomeContrato = usarEntidadeDiferente
                ? (proposta.contrato_tipo === 'PF' ? proposta.contrato_nome : proposta.contrato_razao_social) || evento.razao_social || evento.nome_contratante || ''
                : (evento.razao_social || evento.nome_contratante || '');
            const cnpjContrato = usarEntidadeDiferente
                ? (proposta.contrato_tipo === 'PF' ? proposta.contrato_cpf : proposta.contrato_cnpj) || evento.cnpj || evento.cpf_contratante || ''
                : (evento.cnpj || evento.cpf_contratante || '');
            const representanteContrato = usarEntidadeDiferente && proposta.contrato_representante
                ? `\nRepresentante: ${proposta.contrato_representante}${proposta.contrato_cargo ? ' (' + proposta.contrato_cargo + ')' : ''}`
                : '';
            const enderecoContrato = usarEntidadeDiferente && proposta.contrato_endereco
                ? `\nEndereço: ${proposta.contrato_endereco}, ${proposta.contrato_cidade || ''}/${proposta.contrato_estado || ''}`
                : '';

            let conteudo = artista.modelo_contrato ||
`CONTRATO DE PRESTAÇÃO DE SERVIÇOS ARTÍSTICOS

Pelo presente instrumento, as partes:

CONTRATANTE: {{razao_social}}
CNPJ/CPF: {{cnpj_cpf}}{{representante}}{{endereco_contrato}}

CONTRATADO: {{nome_artista}}

Acordam o seguinte:

1. O CONTRATADO se compromete a realizar apresentação artística na data de {{data_evento}}, no local {{local_evento}} - {{cidade_evento}}.

2. O valor total dos serviços é de {{valor_total}}, a ser pago conforme condições negociadas.

3. Este contrato entra em vigor na data de sua assinatura.


_______________________________        _______________________________
       CONTRATANTE                              CONTRATADO`;

            conteudo = conteudo.replace(/{{razao_social}}/g,       nomeContrato);
            conteudo = conteudo.replace(/{{cnpj_cpf}}/g,           cnpjContrato);
            conteudo = conteudo.replace(/{{representante}}/g,       representanteContrato);
            conteudo = conteudo.replace(/{{endereco_contrato}}/g,   enderecoContrato);
            conteudo = conteudo.replace(/{{nome_artista}}/g,        artista.nome);
            conteudo = conteudo.replace(/{{data_evento}}/g,         Utils.formatDate(evento.data));
            conteudo = conteudo.replace(/{{local_evento}}/g,        evento.local  || '');
            conteudo = conteudo.replace(/{{cidade_evento}}/g,       `${evento.cidade || ''}/${evento.estado || ''}`);
            conteudo = conteudo.replace(/{{valor_total}}/g,         Utils.formatCurrency(evento.cache_bruto || 0));

            const result = await ContratosDB.criar({
                evento_id:     eventoId,
                artista_id:    artistaId,
                conteudo:      conteudo,
                status:        'Pendente',
                data_geracao:  new Date().toISOString()
            });

            if (result) {
                console.log('Contrato gerado com sucesso:', result.id);
            } else {
                console.error('gerarContratoEvento: falha ao inserir no banco');
            }
            return result;
        } catch (err) {
            console.error('gerarContratoEvento erro:', err);
            return null;
        }
    }
};
