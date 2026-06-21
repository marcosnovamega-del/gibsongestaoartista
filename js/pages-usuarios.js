/* ========================================
   KSHOW MANAGER - PAGES (USUARIOS E CONFIGURAÇÕES)
   Páginas de Usuários e Configurações
======================================== */

Pages.renderUsuarios = async function() {
    if (!Auth.isAdmin()) {
        document.getElementById('pageContent').innerHTML = `
            <div class="card text-center" style="padding: 60px;">
                <i class="fas fa-lock" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
                <h3 style="color: var(--text-secondary);">Acesso Restrito</h3>
                <p class="text-muted">Apenas administradores podem acessar esta página.</p>
            </div>
        `;
        return;
    }

    let usuarios = await UsuariosDB.listar();

    // Filtrar por termo de busca
    if (Pages.currentSearchTerm) {
        usuarios = usuarios.filter(u => 
            u.nome.toLowerCase().includes(Pages.currentSearchTerm) ||
            u.username.toLowerCase().includes(Pages.currentSearchTerm) ||
            u.email.toLowerCase().includes(Pages.currentSearchTerm) ||
            u.nivel.toLowerCase().includes(Pages.currentSearchTerm)
        );
    }

    const html = `
        <div class="usuarios-container">
            <div class="page-header flex-between mb-3">
                <div>
                    <h2>Usuários</h2>
                    <p class="text-muted">${usuarios.length} usuário(s) cadastrado(s)</p>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button class="btn-secondary" onclick="Utils.exportToExcel(usuarios, 'lista_usuarios')">
                        <i class="fas fa-file-excel"></i> Exportar
                    </button>
                    <button class="btn-primary" onclick="Modals.showUsuarioModal()">
                        <i class="fas fa-plus"></i> Novo Usuário
                    </button>
                </div>
            </div>

            <div class="grid grid-4 mb-3">
                <div class="stat-card">
                    <div class="stat-icon brand">
                        <i class="fas fa-user-shield"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${usuarios.filter(u => u.nivel === 'Admin Master').length}</h3>
                        <p>Admin Master</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">
                        <i class="fas fa-user-tie"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${usuarios.filter(u => u.nivel === 'Manager').length}</h3>
                        <p>Managers</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">
                        <i class="fas fa-user-check"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${usuarios.filter(u => u.ativo).length}</h3>
                        <p>Ativos</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon yellow">
                        <i class="fas fa-user-clock"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${usuarios.filter(u => !u.ativo).length}</h3>
                        <p>Inativos</p>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Usuário</th>
                                <th>Email</th>
                                <th>Nível de Acesso</th>
                                <th>Artista Vinculado</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${await this.renderUsuariosTableRows(usuarios)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
};

Pages.renderUsuariosTableRows = async function(usuarios) {
    let html = '';
    
    for (const usuario of usuarios) {
        let artistaNome = '-';
        if (usuario.artista_vinculado) {
            const artista = await ArtistasDB.buscarPorId(usuario.artista_vinculado);
            artistaNome = artista ? artista.nome : 'Não encontrado';
        }
        
        html += `
            <tr>
                <td><strong>${usuario.nome}</strong></td>
                <td>${usuario.username}</td>
                <td>${usuario.email}</td>
                <td>
                    <span class="badge badge-${
                        usuario.nivel === 'Admin Master' ? 'danger' :
                        usuario.nivel === 'Manager' ? 'info' :
                        usuario.nivel === 'Financeiro' ? 'success' : 'warning'
                    }">
                        ${usuario.nivel}
                    </span>
                </td>
                <td>${artistaNome}</td>
                <td>
                    <span class="badge badge-${usuario.ativo ? 'success' : 'danger'}">
                        ${usuario.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td>
                    <button class="btn-secondary btn-sm" onclick="Modals.showUsuarioModal('${usuario.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${usuario.id !== Auth.currentUser.id ? `
                        <button class="btn-secondary btn-sm" onclick="Pages.toggleUsuarioStatus('${usuario.id}', ${!usuario.ativo})" style="color: ${usuario.ativo ? 'var(--danger)' : 'var(--success)'};">
                            <i class="fas fa-${usuario.ativo ? 'ban' : 'check'}"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }
    
    return html;
};

Pages.toggleUsuarioStatus = async function(usuarioId, novoStatus) {
    const texto = novoStatus ? 'ativar' : 'desativar';
    const confirmed = await Utils.confirm(`Tem certeza que deseja ${texto} este usuário?`);
    if (!confirmed) return;

    Utils.showLoading();
    const result = await UsuariosDB.atualizar(usuarioId, { ativo: novoStatus });
    Utils.hideLoading();

    if (result) {
        Utils.showToast(`Usuário ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`, 'success');
        this.renderUsuarios();
    } else {
        Utils.showToast('Erro ao atualizar usuário', 'error');
    }
};

Pages.renderConfiguracoes = async function() {
    const config = await ConfigDB.obter();

    const html = `
        <div class="configuracoes-container">
            <div class="page-header mb-3">
                <h2>Configurações</h2>
                <p class="text-muted">Configurações gerais do sistema</p>
            </div>

            <div class="grid grid-2">
                <!-- Dados da Empresa -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-building"></i> Dados da Empresa
                        </h3>
                    </div>
                    <div class="card-body">
                        ${Auth.isAdmin() ? `
                            <form id="configEmpresaForm" onsubmit="Pages.saveConfigEmpresa(event)">
                                <div class="form-group">
                                    <label>Nome da Empresa</label>
                                    <input type="text" name="nome_empresa" value="${config?.nome_empresa || 'Gibson Promoções'}" required>
                                </div>
                                <div class="form-group">
                                    <label>CNPJ</label>
                                    <input type="text" name="cnpj" value="${config?.cnpj || ''}" placeholder="00.000.000/0000-00">
                                </div>
                                <div class="form-group">
                                    <label>Endereço</label>
                                    <input type="text" name="endereco" value="${config?.endereco || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Telefone</label>
                                    <input type="text" name="telefone" value="${config?.telefone || ''}" placeholder="(00) 00000-0000">
                                </div>
                                <div class="form-group">
                                    <label>Email</label>
                                    <input type="email" name="email" value="${config?.email || ''}">
                                </div>
                                ${Storage.renderUploadInput('logo_url', config?.logo_url || '', 'Logo da Empresa')}
                                <div style="margin-top: 16px;">
                                    <button type="submit" class="btn-primary">
                                        <i class="fas fa-save"></i> Salvar
                                    </button>
                                </div>
                            </form>
                        ` : `
                            <div style="color: var(--text-secondary);">
                                <p><strong>Nome:</strong> ${config?.nome_empresa || '-'}</p>
                                <p><strong>CNPJ:</strong> ${config?.cnpj ? Utils.formatCNPJ(config.cnpj) : '-'}</p>
                                <p><strong>Endereço:</strong> ${config?.endereco || '-'}</p>
                                <p><strong>Telefone:</strong> ${config?.telefone ? Utils.formatPhone(config.telefone) : '-'}</p>
                                <p><strong>Email:</strong> ${config?.email || '-'}</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Configurações Financeiras -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-dollar-sign"></i> Configurações Financeiras
                        </h3>
                    </div>
                    <div class="card-body">
                        ${Auth.isAdmin() ? `
                            <form id="configFinanceiraForm" onsubmit="Pages.saveConfigFinanceira(event)">
                                <div class="form-group">
                                    <label>Comissão Padrão Global (%)</label>
                                    <input type="number" name="comissao_padrao" value="${config?.comissao_padrao || 10}" min="0" max="100" step="0.5" required>
                                    <small style="color: var(--text-muted); display: block; margin-top: 4px;">
                                        Esta comissão será aplicada por padrão em novos artistas
                                    </small>
                                </div>
                                <button type="submit" class="btn-primary">
                                    <i class="fas fa-save"></i> Salvar
                                </button>
                            </form>
                        ` : `
                            <div style="color: var(--text-secondary);">
                                <p><strong>Comissão Padrão:</strong> ${config?.comissao_padrao || 10}%</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Minha Conta -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-user-circle"></i> Minha Conta
                        </h3>
                    </div>
                    <div class="card-body">
                        <form id="minhaContaForm" onsubmit="Pages.updateMinhaConta(event)">
                            <div class="form-group">
                                <label>Nome Completo</label>
                                <input type="text" name="nome" value="${Auth.currentUser.nome}" required>
                            </div>
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" name="email" value="${Auth.currentUser.email}" required>
                            </div>
                            <div class="form-group">
                                <label>Nova Senha (deixe em branco para manter atual)</label>
                                <input type="password" name="password" placeholder="••••••••">
                            </div>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-save"></i> Atualizar Dados
                            </button>
                        </form>
                    </div>
                </div>

                <!-- Sobre o Sistema -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-info-circle"></i> Sobre o Sistema
                        </h3>
                    </div>
                    <div class="card-body">
                        <div style="text-align: center;">
                            <i class="fas fa-calendar-check" style="font-size: 48px; color: var(--brand-primary); margin-bottom: 16px;"></i>
                            <h3 style="margin-bottom: 8px;">GIBSON MANAGER</h3>
                            <p style="color: var(--text-secondary); margin-bottom: 16px;">
                                Sistema Profissional de Gestão Artística
                            </p>
                            <p style="font-size: 13px; color: var(--text-muted);">
                                Versão 3.0.0<br>
                                © 2026 Gibson Promoções<br>
                                Todos os direitos reservados
                            </p>
                        </div>
                    </div>
                </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
};


Pages.saveConfigEmpresa = async function(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const data = {
        nome_empresa: formData.get('nome_empresa'),
        cnpj: formData.get('cnpj'),
        endereco: formData.get('endereco'),
        telefone: formData.get('telefone'),
        email: formData.get('email'),
        logo_url: document.getElementById('url-logo_url')?.value || formData.get('logo_url') || ''
    };

    Utils.showLoading();
    const result = await ConfigDB.atualizar(data);
    Utils.hideLoading();

    if (result) {
        Utils.showToast('Configurações salvas com sucesso!', 'success');
    } else {
        Utils.showToast('Erro ao salvar configurações', 'error');
    }
};

Pages.saveConfigFinanceira = async function(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const data = {
        comissao_padrao: parseFloat(formData.get('comissao_padrao'))
    };

    Utils.showLoading();
    const result = await ConfigDB.atualizar(data);
    Utils.hideLoading();

    if (result) {
        Utils.showToast('Configurações financeiras salvas!', 'success');
    } else {
        Utils.showToast('Erro ao salvar configurações', 'error');
    }
};

Pages.updateMinhaConta = async function(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const data = {
        nome: formData.get('nome'),
        email: formData.get('email')
    };

    const password = formData.get('password');
    if (password) {
        data.password = password;
    }

    Utils.showLoading();
    const result = await UsuariosDB.atualizar(Auth.currentUser.id, data);
    Utils.hideLoading();

    if (result) {
        await Auth.updateCurrentUser();
        Utils.showToast('Dados atualizados com sucesso!', 'success');
        document.getElementById('currentUserName').textContent = data.nome;
    } else {
        Utils.showToast('Erro ao atualizar dados', 'error');
    }
};