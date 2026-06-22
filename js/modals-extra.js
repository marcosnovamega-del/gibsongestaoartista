/* ========================================
   GIBSON MANAGER PRO - MODALS EXTRAS
   Modals adicionais (Despesas, Usuário, Contrato Preview)
======================================== */

// Modal de Despesas do Evento
Modals.showDespesasModal = async function(eventoId) {
    const evento = await EventosDB.buscarPorId(eventoId);
    if (!evento) return;

    const despesas = await DespesasDB.buscarPorEvento(eventoId);
    const equipe = await EquipeDB.buscarPorArtista(evento.artista_id);
    const totalDespesas = despesas.reduce((sum, d) => sum + (d.valor || 0), 0);
    const lucro = evento.valor_liquido - totalDespesas;

    const html = `
        <div class="modal-overlay" onclick="if(event.target === this) Modals.close()">
            <div class="modal" style="max-width: 900px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-money-bill-wave"></i> Despesas do Evento
                    </h3>
                    <button class="modal-close" onclick="Modals.close()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <!-- Resumo Financeiro -->
                    <div class="grid grid-3 mb-3">
                        <div style="padding: 16px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; text-align: center;">
                            <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 4px;">Receita Líquida</p>
                            <h3 style="color: var(--success); margin: 0;">${Utils.formatCurrency(evento.valor_liquido)}</h3>
                        </div>
                        <div style="padding: 16px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; text-align: center;">
                            <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 4px;">Total Despesas</p>
                            <h3 style="color: var(--danger); margin: 0;">${Utils.formatCurrency(totalDespesas)}</h3>
                        </div>
                        <div style="padding: 16px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; text-align: center;">
                            <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 4px;">Lucro Líquido</p>
                            <h3 style="color: ${lucro >= 0 ? 'var(--success)' : 'var(--danger)'}; margin: 0;">${Utils.formatCurrency(lucro)}</h3>
                        </div>
                    </div>

                    <!-- Adicionar Despesa -->
                    <button class="btn-primary mb-3" onclick="Modals.showAddDespesaForm('${eventoId}')">
                        <i class="fas fa-plus"></i> Adicionar Despesa
                    </button>

                    <!-- Lista de Despesas -->
                    ${despesas.length > 0 ? `
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Tipo</th>
                                        <th>Descrição</th>
                                        <th>Valor</th>
                                        <th>Status</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${despesas.map(d => `
                                        <tr>
                                            <td><strong>${d.tipo}</strong></td>
                                            <td>${d.descricao || '-'}</td>
                                            <td>${Utils.formatCurrency(d.valor)}</td>
                                            <td>
                                                <span class="badge badge-${d.status === 'Pago' ? 'success' : 'warning'}">
                                                    ${d.status}
                                                </span>
                                            </td>
                                            <td>
                                                <button class="btn-secondary btn-sm" onclick="Modals.showEditDespesaForm('${d.id}')">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn-secondary btn-sm" onclick="Modals.deleteDespesa('${d.id}', '${eventoId}')" style="color: var(--danger);">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<p class="text-muted">Nenhuma despesa cadastrada.</p>'}

                    <!-- Sugestões da Equipe -->
                    ${equipe.length > 0 ? `
                        <div style="margin-top: 24px; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                            <h4 style="margin-bottom: 12px; color: var(--red-primary);">
                                <i class="fas fa-lightbulb"></i> Equipe do Artista
                            </h4>
                            <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 12px;">
                                Membros da equipe vinculados a este artista:
                            </p>
                            <div class="grid grid-2" style="gap: 8px;">
                                ${equipe.map(m => `
                                    <div style="padding: 8px; background: var(--bg-primary); border-radius: 6px; font-size: 13px;">
                                        <strong>${m.nome}</strong> - ${m.funcao}
                                        ${m.valor_fixo ? `<span style="color: var(--success);">(${Utils.formatCurrency(m.valor_fixo)})</span>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="Modals.close()">Fechar</button>
                </div>
            </div>
        </div>
    `;

    this.container.innerHTML = html;
};

Modals.showAddDespesaForm = function(eventoId) {
    const html = `
        <div class="modal-overlay" onclick="if(event.target === this) Modals.showDespesasModal('${eventoId}')">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-plus"></i> Nova Despesa
                    </h3>
                    <button class="modal-close" onclick="Modals.showDespesasModal('${eventoId}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="despesaForm" onsubmit="Modals.submitDespesaForm(event, '${eventoId}', null)">
                        <div class="form-group">
                            <label>Tipo de Despesa *</label>
                            <select name="tipo" required>
                                <option value="">Selecione...</option>
                                <option value="Músicos">Pagamento Músicos</option>
                                <option value="Produtor">Pagamento Produtor</option>
                                <option value="Técnico">Pagamento Técnico</option>
                                <option value="Staff/Roadie">Staff / Roadie</option>
                                <option value="Hotel">Hotel</option>
                                <option value="Aéreo">Aéreo</option>
                                <option value="Transfer">Transfer</option>
                                <option value="Alimentação">Alimentação</option>
                                <option value="Backline">Backline</option>
                                <option value="Estrutura">Estrutura Adicional</option>
                                <optgroup label="Produção / Estrada">
                                    <option value="Combustível">Combustível</option>
                                    <option value="Pedágio">Pedágio</option>
                                    <option value="Estacionamento">Estacionamento</option>
                                    <option value="Manutenção">Manutenção</option>
                                </optgroup>
                                <option value="Outros">Outros Custos</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Descrição</label>
                            <input type="text" name="descricao" placeholder="Detalhes da despesa">
                        </div>
                        <div class="form-group">
                            <label>Valor (R$) *</label>
                            <input type="number" name="valor" min="0" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label>Status *</label>
                            <select name="status" required>
                                <option value="Pendente">Pendente (Prestação de Contas)</option>
                                <option value="Pago" ${Auth.isProdutor() ? 'disabled' : ''}>Pago</option>
                            </select>
                        </div>
                        <div class="form-group">
                            ${Storage.renderUploadInput('comprovante_url', '', 'Comprovante / Nota Fiscal')}
                        </div>
                        <div class="form-group">
                            <label>Observações</label>
                            <textarea name="observacao" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="Modals.showDespesasModal('${eventoId}')">Cancelar</button>
                    <button class="btn-primary" onclick="document.getElementById('despesaForm').requestSubmit()">
                        <i class="fas fa-save"></i> Salvar
                    </button>
                </div>
            </div>
        </div>
    `;

    this.container.innerHTML = html;
};

Modals.showEditDespesaForm = async function(despesaId) {
    const despesa = await DB.getById('despesas_evento', despesaId);
    if (!despesa) return;

    const html = `
        <div class="modal-overlay" onclick="if(event.target === this) Modals.showDespesasModal('${despesa.evento_id}')">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-edit"></i> Editar Despesa
                    </h3>
                    <button class="modal-close" onclick="Modals.showDespesasModal('${despesa.evento_id}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="despesaForm" onsubmit="Modals.submitDespesaForm(event, '${despesa.evento_id}', '${despesaId}')">
                        <div class="form-group">
                            <label>Tipo de Despesa *</label>
                            <select name="tipo" required>
                                <option value="">Selecione...</option>
                                <option value="Músicos" ${despesa.tipo === 'Músicos' ? 'selected' : ''}>Pagamento Músicos</option>
                                <option value="Produtor" ${despesa.tipo === 'Produtor' ? 'selected' : ''}>Pagamento Produtor</option>
                                <option value="Técnico" ${despesa.tipo === 'Técnico' ? 'selected' : ''}>Pagamento Técnico</option>
                                <option value="Staff/Roadie" ${despesa.tipo === 'Staff/Roadie' ? 'selected' : ''}>Staff / Roadie</option>
                                <option value="Hotel" ${despesa.tipo === 'Hotel' ? 'selected' : ''}>Hotel</option>
                                <option value="Aéreo" ${despesa.tipo === 'Aéreo' ? 'selected' : ''}>Aéreo</option>
                                <option value="Transfer" ${despesa.tipo === 'Transfer' ? 'selected' : ''}>Transfer</option>
                                <option value="Alimentação" ${despesa.tipo === 'Alimentação' ? 'selected' : ''}>Alimentação</option>
                                <option value="Backline" ${despesa.tipo === 'Backline' ? 'selected' : ''}>Backline</option>
                                <option value="Estrutura" ${despesa.tipo === 'Estrutura' ? 'selected' : ''}>Estrutura Adicional</option>
                                <optgroup label="Produção / Estrada">
                                    <option value="Combustível" ${despesa.tipo === 'Combustível' ? 'selected' : ''}>Combustível</option>
                                    <option value="Pedágio" ${despesa.tipo === 'Pedágio' ? 'selected' : ''}>Pedágio</option>
                                    <option value="Estacionamento" ${despesa.tipo === 'Estacionamento' ? 'selected' : ''}>Estacionamento</option>
                                    <option value="Manutenção" ${despesa.tipo === 'Manutenção' ? 'selected' : ''}>Manutenção</option>
                                </optgroup>
                                <option value="Outros" ${despesa.tipo === 'Outros' ? 'selected' : ''}>Outros Custos</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Descrição</label>
                            <input type="text" name="descricao" value="${despesa.descricao || ''}">
                        </div>
                        <div class="form-group">
                            <label>Valor (R$) *</label>
                            <input type="number" name="valor" value="${despesa.valor}" min="0" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label>Status *</label>
                            <select name="status" required>
                                <option value="Pendente" ${despesa.status === 'Pendente' ? 'selected' : ''}>Pendente (Prestação de Contas)</option>
                                <option value="Pago" ${despesa.status === 'Pago' ? 'selected' : ''} ${Auth.isProdutor() ? 'disabled' : ''}>Pago</option>
                            </select>
                        </div>
                        <div class="form-group">
                            ${Storage.renderUploadInput('comprovante_url', despesa.comprovante_url || '', 'Comprovante / Nota Fiscal')}
                        </div>
                        <div class="form-group">
                            <label>Observações</label>
                            <textarea name="observacao" rows="3">${despesa.observacao || ''}</textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="Modals.showDespesasModal('${despesa.evento_id}')">Cancelar</button>
                    <button class="btn-primary" onclick="document.getElementById('despesaForm').requestSubmit()">
                        <i class="fas fa-save"></i> Salvar
                    </button>
                </div>
            </div>
        </div>
    `;

    this.container.innerHTML = html;
};

Modals.submitDespesaForm = async function(event, eventoId, despesaId) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    const data = {
        evento_id: eventoId,
        tipo: formData.get('tipo'),
        descricao: formData.get('descricao'),
        valor: parseFloat(formData.get('valor')),
        status: formData.get('status'),
        observacao: formData.get('observacao'),
        comprovante_url: formData.get('comprovante_url') || null
    };

    if (!despesaId && Auth.currentUser) {
        data.criado_por = Auth.currentUser.id;
        data.data_hora_registro = new Date().toISOString();
    }

    Utils.showLoading();
    let result;
    if (despesaId) {
        result = await DespesasDB.atualizar(despesaId, data);
    } else {
        result = await DespesasDB.criar(data);
    }
    Utils.hideLoading();

    if (result) {
        Utils.showToast(`Despesa ${despesaId ? 'atualizada' : 'cadastrada'} com sucesso!`, 'success');
        Modals.showDespesasModal(eventoId);
    } else {
        Utils.showToast('Erro ao salvar despesa', 'error');
    }
};

Modals.deleteDespesa = async function(despesaId, eventoId) {
    const confirmed = await Utils.confirm('Tem certeza que deseja deletar esta despesa?');
    if (!confirmed) return;

    Utils.showLoading();
    const result = await DespesasDB.deletar(despesaId);
    Utils.hideLoading();

    if (result) {
        Utils.showToast('Despesa deletada com sucesso!', 'success');
        Modals.showDespesasModal(eventoId);
    } else {
        Utils.showToast('Erro ao deletar despesa', 'error');
    }
};

// Modal de Usuário
Modals.showUsuarioModal = async function(usuarioId = null) {
    const usuario = usuarioId ? await UsuariosDB.buscarPorId(usuarioId) : null;
    const isEdit = !!usuarioId;
    const artistas = await ArtistasDB.listar();

    const html = `
        <div class="modal-overlay" onclick="if(event.target === this) Modals.close()">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-user-plus"></i> ${isEdit ? 'Editar' : 'Novo'} Usuário
                    </h3>
                    <button class="modal-close" onclick="Modals.close()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="usuarioForm" onsubmit="Modals.submitUsuarioForm(event, '${usuarioId || ''}')">
                        <div class="form-group">
                            <label>Nome Completo *</label>
                            <input type="text" name="nome" value="${usuario?.nome || ''}" required>
                        </div>
                        <div class="grid grid-2">
                            <div class="form-group">
                                <label>Usuário (login) *</label>
                                <input type="text" name="username" value="${usuario?.username || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>${isEdit ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}</label>
                                <input type="password" name="password" ${isEdit ? '' : 'required'}>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Email *</label>
                            <input type="email" name="email" value="${usuario?.email || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Nível de Acesso *</label>
                            <select name="nivel" id="nivelUsuario" onchange="Modals.toggleArtistaVinculado()" required>
                                <option value="">Selecione...</option>
                                <option value="Admin Master" ${usuario?.nivel === 'Admin Master' ? 'selected' : ''}>Admin Master</option>
                                <option value="Manager" ${usuario?.nivel === 'Manager' ? 'selected' : ''}>Manager</option>
                                <option value="Produtor" ${usuario?.nivel === 'Produtor' ? 'selected' : ''}>Produtor (Road Manager)</option>
                                <option value="Financeiro" ${usuario?.nivel === 'Financeiro' ? 'selected' : ''}>Financeiro</option>
                                <option value="Produção/Técnico" ${usuario?.nivel === 'Produção/Técnico' ? 'selected' : ''}>Produção/Técnico</option>
                            </select>
                        </div>
                        <div class="form-group" id="artistaVinculadoGroup" style="display: ${['Manager', 'Produtor'].includes(usuario?.nivel) ? 'block' : 'none'};">
                            <label>Artista Vinculado *</label>
                            <select name="artista_vinculado">
                                <option value="">Selecione o artista</option>
                                ${artistas.map(a => `
                                    <option value="${a.id}" ${usuario?.artista_vinculado === a.id ? 'selected' : ''}>
                                        ${a.nome}
                                    </option>
                                `).join('')}
                            </select>
                            <small style="color: var(--text-muted); display: block; margin-top: 4px;">
                                Managers e Produtores só acessarão dados do artista vinculado.
                            </small>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="Modals.close()">Cancelar</button>
                    <button class="btn-primary" onclick="document.getElementById('usuarioForm').requestSubmit()">
                        <i class="fas fa-save"></i> Salvar
                    </button>
                </div>
            </div>
        </div>
    `;

    this.container.innerHTML = html;
};

Modals.toggleArtistaVinculado = function() {
    const nivel = document.getElementById('nivelUsuario').value;
    const group = document.getElementById('artistaVinculadoGroup');
    group.style.display = ['Manager', 'Produtor'].includes(nivel) ? 'block' : 'none';
};

Modals.submitUsuarioForm = async function(event, usuarioId) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    const data = {
        nome: formData.get('nome'),
        username: formData.get('username'),
        email: formData.get('email'),
        nivel: formData.get('nivel'),
        artista_vinculado: formData.get('artista_vinculado') || null
    };

    const password = formData.get('password');
    if (password || !usuarioId) {
        if (!password && !usuarioId) {
            Utils.showToast('A senha é obrigatória para novos usuários.', 'error');
            return;
        }
        if (password) {
            const validacao = Utils.validatePassword(password, data.username);
            if (!validacao.ok) {
                Utils.showToast(validacao.msg, 'error');
                return;
            }
            data.password = password; // será hasheada em UsuariosDB.criar/atualizar()
        }
    }

    Utils.showLoading();
    let result;
    if (usuarioId) {
        result = await UsuariosDB.atualizar(usuarioId, data);
    } else {
        result = await UsuariosDB.criar(data);
    }
    Utils.hideLoading();

    if (result) {
        Utils.showToast(`Usuário ${usuarioId ? 'atualizado' : 'cadastrado'} com sucesso!`, 'success');
        this.close();
        Pages.renderUsuarios();
    } else {
        Utils.showToast('Erro ao salvar usuário', 'error');
    }
};

// Modal de Preview de Contrato
Modals.showContratoPreview = async function(contratoId) {
    const contrato = await ContratosDB.buscarPorEvento(contratoId) || await DB.getById('contratos', contratoId);
    if (!contrato) {
        Utils.showToast('Contrato não encontrado', 'error');
        return;
    }

    const evento = await EventosDB.buscarPorId(contrato.evento_id);
    const artista = evento ? await ArtistasDB.buscarPorId(evento.artista_id) : null;

    const html = `
        <div class="modal-overlay" onclick="if(event.target === this) Modals.close()">
            <div class="modal" style="max-width: 900px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-file-contract"></i> Preview do Contrato
                    </h3>
                    <button class="modal-close" onclick="Modals.close()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 20px; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div class="grid grid-2" style="gap: 16px; font-size: 13px; color: var(--text-secondary);">
                            <div>
                                <strong>Artista:</strong> ${artista ? artista.nome : '-'}
                            </div>
                            <div>
                                <strong>Evento:</strong> ${evento ? evento.local : '-'}
                            </div>
                            <div>
                                <strong>Data de Geração:</strong> ${Utils.formatDate(contrato.data_geracao)}
                            </div>
                            <div>
                                <strong>Status:</strong>
                                <span class="badge badge-${contrato.status === 'Assinado' ? 'success' : contrato.status === 'Pendente' ? 'warning' : 'danger'}">
                                    ${contrato.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div style="padding: 24px; background: white; color: #000; border-radius: 8px; min-height: 400px; white-space: pre-wrap; font-family: 'Times New Roman', serif; line-height: 1.8;">
                        ${contrato.conteudo || 'Conteúdo do contrato não disponível'}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="Modals.close()">Fechar</button>
                    ${contrato.status === 'Pendente' ? `
                        <button class="btn-primary" onclick="Pages.assinarContrato('${contrato.id}'); Modals.close();">
                            <i class="fas fa-signature"></i> Assinar Contrato
                        </button>
                    ` : ''}
                    <button class="btn-primary" onclick="Modals.exportContratoPDF('${contrato.id}')">
                        <i class="fas fa-file-pdf"></i> Exportar PDF
                    </button>
                </div>
            </div>
        </div>
    `;

    this.container.innerHTML = html;
};

Modals.exportContratoPDF = async function(contratoId) {
    const contrato = await DB.getById('contratos', contratoId);
    if (!contrato) return;

    const evento = await EventosDB.buscarPorId(contrato.evento_id);
    const artista = evento ? await ArtistasDB.buscarPorId(evento.artista_id) : null;

    Utils.showToast('Funcionalidade de exportação PDF será implementada em versão futura', 'info');
};