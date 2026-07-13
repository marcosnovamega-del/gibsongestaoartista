/* ========================================
   GIBSON MANAGER PRO - MODAL DE PERMISSÕES
======================================== */

// Definição dos módulos e ações do sistema
const MODULOS_SISTEMA = [
    { id: 'dashboard',    nome: 'Dashboard',    icon: 'fa-chart-line'     },
    { id: 'artistas',     nome: 'Artistas',     icon: 'fa-microphone'     },
    { id: 'eventos',      nome: 'Eventos',      icon: 'fa-calendar-alt'   },
    { id: 'contratos',    nome: 'Contratos',    icon: 'fa-file-contract'  },
    { id: 'vendas',       nome: 'Vendas',       icon: 'fa-route'          },
    { id: 'financeiro',   nome: 'Financeiro',   icon: 'fa-money-bill-wave'},
    { id: 'equipe',       nome: 'Equipe',       icon: 'fa-users'          },
    { id: 'alertas',      nome: 'Alertas',      icon: 'fa-bell'           },
    { id: 'usuarios',     nome: 'Usuários',     icon: 'fa-user-shield'    },
    { id: 'configuracoes',nome: 'Configurações',icon: 'fa-cog'            },
];

const ACOES_SISTEMA = [
    { id: 'ver',    nome: 'Ver'    },
    { id: 'criar',  nome: 'Criar'  },
    { id: 'editar', nome: 'Editar' },
    { id: 'excluir',nome: 'Excluir'},
];

// Permissões padrão por nível
const PERMS_PADRAO = {
    'Admin / Master': Object.fromEntries(
        MODULOS_SISTEMA.map(m => [m.id, { ver: true, criar: true, editar: true, excluir: true }])
    ),
    'Manager': {
        dashboard: { ver: true,  criar: false, editar: false, excluir: false },
        artistas:  { ver: true,  criar: true,  editar: true,  excluir: false },
        eventos:   { ver: true,  criar: true,  editar: true,  excluir: false },
        contratos: { ver: true,  criar: true,  editar: false, excluir: false },
        vendas:    { ver: true,  criar: true,  editar: true,  excluir: false },
        financeiro:{ ver: false, criar: false, editar: false, excluir: false },
        equipe:    { ver: true,  criar: false, editar: false, excluir: false },
        alertas:   { ver: true,  criar: false, editar: false, excluir: false },
        usuarios:  { ver: false, criar: false, editar: false, excluir: false },
        configuracoes: { ver: false, criar: false, editar: false, excluir: false },
    },
    'Financeiro': {
        dashboard: { ver: true,  criar: false, editar: false, excluir: false },
        artistas:  { ver: true,  criar: false, editar: false, excluir: false },
        eventos:   { ver: true,  criar: false, editar: false, excluir: false },
        contratos: { ver: true,  criar: false, editar: false, excluir: false },
        vendas:    { ver: false, criar: false, editar: false, excluir: false },
        financeiro:{ ver: true,  criar: true,  editar: true,  excluir: false },
        equipe:    { ver: false, criar: false, editar: false, excluir: false },
        alertas:   { ver: true,  criar: false, editar: false, excluir: false },
        usuarios:  { ver: false, criar: false, editar: false, excluir: false },
        configuracoes: { ver: false, criar: false, editar: false, excluir: false },
    },
    'Produção/Técnico': {
        dashboard: { ver: true,  criar: false, editar: false, excluir: false },
        artistas:  { ver: true,  criar: false, editar: false, excluir: false },
        eventos:   { ver: true,  criar: false, editar: false, excluir: false },
        contratos: { ver: false, criar: false, editar: false, excluir: false },
        vendas:    { ver: false, criar: false, editar: false, excluir: false },
        financeiro:{ ver: false, criar: false, editar: false, excluir: false },
        equipe:    { ver: true,  criar: false, editar: false, excluir: false },
        alertas:   { ver: true,  criar: false, editar: false, excluir: false },
        usuarios:  { ver: false, criar: false, editar: false, excluir: false },
        configuracoes: { ver: false, criar: false, editar: false, excluir: false },
    }
};

Modals.showPermissoesModal = async function(usuarioId) {
    const usuario = (await UsuariosDB.listar()).find(u => u.id === usuarioId);
    if (!usuario) return;

    const permsAtuais = usuario.permissoes_granulares || PERMS_PADRAO[usuario.nivel] || {};

    const html = `
        <div class="modal-overlay" onclick="if(event.target===this) Modals.close()">
            <div class="modal" style="max-width:720px;">
                <div class="modal-header" style="background:linear-gradient(135deg,#0d0d0d,#1a0500);border-bottom:1px solid var(--red-primary);">
                    <h3 class="modal-title">
                        <i class="fas fa-shield-alt" style="color:var(--red-primary)"></i>
                        Permissões — ${usuario.nome}
                    </h3>
                    <button class="modal-close" onclick="Modals.close()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <!-- Preset por nível -->
                    <div style="margin-bottom:16px;padding:12px;background:var(--bg-secondary);border-radius:8px;">
                        <label style="font-size:12px;color:var(--text-muted);margin-bottom:8px;display:block;">
                            <i class="fas fa-magic"></i> Carregar permissões padrão por nível:
                        </label>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            ${Object.keys(PERMS_PADRAO).map(nivel => `
                                <button class="btn-secondary btn-sm" onclick="Modals.carregarPermsPadrao('${nivel}')">
                                    ${nivel}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Matriz de permissões -->
                    <div style="overflow-x:auto;">
                        <table class="perm-matrix" id="permMatrix">
                            <thead>
                                <tr>
                                    <th>Módulo</th>
                                    ${ACOES_SISTEMA.map(a => `<th>${a.nome}</th>`).join('')}
                                    <th>Tudo</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${MODULOS_SISTEMA.map(m => {
                                    const p = permsAtuais[m.id] || {};
                                    return `
                                    <tr>
                                        <td>
                                            <div class="perm-module-icon"><i class="fas ${m.icon}"></i></div>
                                            ${m.nome}
                                        </td>
                                        ${ACOES_SISTEMA.map(a => `
                                            <td>
                                                <input type="checkbox" class="perm-checkbox"
                                                    id="perm_${m.id}_${a.id}"
                                                    ${p[a.id] ? 'checked' : ''}
                                                    onchange="Modals.atualizarToggleAll('${m.id}')">
                                            </td>
                                        `).join('')}
                                        <td>
                                            <input type="checkbox" class="perm-checkbox"
                                                id="perm_${m.id}_all"
                                                ${ACOES_SISTEMA.every(a => p[a.id]) ? 'checked' : ''}
                                                onchange="Modals.toggleModuloAll('${m.id}', this.checked)">
                                        </td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="Modals.close()">Cancelar</button>
                    <button class="btn-primary" onclick="Modals.salvarPermissoes('${usuarioId}')">
                        <i class="fas fa-save"></i> Salvar Permissões
                    </button>
                </div>
            </div>
        </div>`;

    this.container.innerHTML = html;
};

Modals.toggleModuloAll = function(moduloId, checked) {
    ACOES_SISTEMA.forEach(a => {
        const el = document.getElementById(`perm_${moduloId}_${a.id}`);
        if (el) el.checked = checked;
    });
};

Modals.atualizarToggleAll = function(moduloId) {
    const todas = ACOES_SISTEMA.every(a => {
        const el = document.getElementById(`perm_${moduloId}_${a.id}`);
        return el && el.checked;
    });
    const allEl = document.getElementById(`perm_${moduloId}_all`);
    if (allEl) allEl.checked = todas;
};

Modals.carregarPermsPadrao = function(nivel) {
    const perms = PERMS_PADRAO[nivel] || {};
    MODULOS_SISTEMA.forEach(m => {
        const p = perms[m.id] || {};
        ACOES_SISTEMA.forEach(a => {
            const el = document.getElementById(`perm_${m.id}_${a.id}`);
            if (el) el.checked = !!p[a.id];
        });
        Modals.atualizarToggleAll(m.id);
    });
    Utils.showToast(`Permissões de "${nivel}" carregadas. Salve para confirmar.`, 'info');
};

Modals.salvarPermissoes = async function(usuarioId) {
    const perms = {};
    MODULOS_SISTEMA.forEach(m => {
        perms[m.id] = {};
        ACOES_SISTEMA.forEach(a => {
            const el = document.getElementById(`perm_${m.id}_${a.id}`);
            perms[m.id][a.id] = el ? el.checked : false;
        });
    });

    // Calcular quais módulos o usuário pode VER (para menu)
    const modulosPermitidos = MODULOS_SISTEMA
        .filter(m => perms[m.id]?.ver)
        .map(m => m.nome.replace('ões', 'oes').replace('á', 'a'));

    Utils.showLoading();
    const r = await UsuariosDB.atualizar(usuarioId, {
        permissoes_granulares: perms,
        permissoes: modulosPermitidos
    });
    Utils.hideLoading();

    if (r) {
        await AuditDB.registrar({
            acao: 'EDITAR',
            modulo: 'usuarios',
            registroId: usuarioId,
            descricao: `Permissões atualizadas para o usuário`,
            dadosNovos: perms
        });
        Utils.showToast('Permissões salvas com sucesso!', 'success');
        Modals.close();
        if (typeof Pages.renderUsuarios === 'function') Pages.renderUsuarios();
    } else {
        Utils.showToast('Erro ao salvar permissões.', 'error');
    }
};

// Modal de histórico do usuário
Modals.showHistoricoUsuario = async function(usuarioId, usuarioNome) {
    this.container.innerHTML = `
        <div class="modal-overlay" onclick="if(event.target===this) Modals.close()">
            <div class="modal" style="max-width:640px;">
                <div class="modal-header" style="background:linear-gradient(135deg,#0d0d0d,#1a0500);">
                    <h3 class="modal-title">
                        <i class="fas fa-history" style="color:var(--red-primary)"></i>
                        Histórico — ${usuarioNome}
                    </h3>
                    <button class="modal-close" onclick="Modals.close()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="loading-container"><div class="loading-spinner"></div></div>
                </div>
            </div>
        </div>`;

    const logs = await AuditDB.buscarPorUsuario(usuarioId);

    const body = document.querySelector('#modalContainer .modal-body');
    if (!body) return;

    if (logs.length === 0) {
        body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">
            <i class="fas fa-history" style="font-size:40px;opacity:0.3;display:block;margin-bottom:12px;"></i>
            Nenhuma ação registrada ainda.
        </div>`;
        return;
    }

    body.innerHTML = `
        <div style="max-height:500px;overflow-y:auto;padding-right:4px;">
            <div class="audit-timeline">
                ${logs.map(l => Modals._renderAuditItem(l)).join('')}
            </div>
        </div>`;
};

Modals._renderAuditItem = function(log) {
    const acaoLower = (log.acao || '').toLowerCase();
    let iconClass = 'audit-icon-default';
    let icon = 'fa-info-circle';

    if (acaoLower === 'login')   { iconClass = 'audit-icon-login';   icon = 'fa-sign-in-alt'; }
    if (acaoLower === 'logout')  { iconClass = 'audit-icon-login';   icon = 'fa-sign-out-alt'; }
    if (acaoLower === 'criar')   { iconClass = 'audit-icon-criar';   icon = 'fa-plus'; }
    if (acaoLower === 'editar')  { iconClass = 'audit-icon-editar';  icon = 'fa-edit'; }
    if (acaoLower === 'excluir') { iconClass = 'audit-icon-excluir'; icon = 'fa-trash'; }
    if (acaoLower === 'assinar') { iconClass = 'audit-icon-assinar'; icon = 'fa-file-signature'; }

    const dataHora = log.created_at
        ? new Date(log.created_at).toLocaleString('pt-BR')
        : '—';

    return `
        <div class="audit-item">
            <div class="audit-icon ${iconClass}">
                <i class="fas ${icon}"></i>
            </div>
            <div class="audit-content">
                <div class="audit-acao">
                    <span style="color:var(--text-muted);font-weight:400;font-size:11px;">${log.acao}</span>
                    ${log.modulo ? `<span style="color:var(--red-primary);margin-left:6px;">${log.modulo}</span>` : ''}
                </div>
                <div class="audit-descricao">${log.descricao || '—'}</div>
            </div>
            <div class="audit-time">${dataHora}</div>
        </div>`;
};
