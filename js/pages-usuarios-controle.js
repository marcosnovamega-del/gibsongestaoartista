/* ========================================
   GIBSON MANAGER PRO - PÁGINA DE USUÁRIOS
   Controle de acesso, permissões e auditoria
======================================== */

Pages.renderUsuarios = async function() {
    document.getElementById('pageContent').innerHTML =
        '<div class="loading-container"><div class="loading-spinner"></div></div>';

    const [usuarios, logs] = await Promise.all([
        UsuariosDB.listar(true),
        AuditDB.listar({ dataInicio: new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0] })
    ]);

    const ativos   = usuarios.filter(u => u.ativo !== false).length;
    const inativos = usuarios.length - ativos;

    const html = `
    <div class="usuarios-page">

        <!-- Header -->
        <div class="page-header flex-between mb-3">
            <div>
                <h2 style="display:flex;align-items:center;gap:10px;">
                    <i class="fas fa-user-shield" style="color:var(--red-primary)"></i> Controle de Usuários
                </h2>
                <p class="text-muted">Gerencie permissões, acessos e histórico de ações</p>
            </div>
            <button class="btn-primary" onclick="Modals.showUsuarioModal()">
                <i class="fas fa-plus"></i> Novo Usuário
            </button>
        </div>

        <!-- KPIs -->
        <div class="grid grid-3 mb-3">
            <div class="stat-card">
                <div class="stat-icon green"><i class="fas fa-users"></i></div>
                <div class="stat-content"><h3>${ativos}</h3><p>Usuários Ativos</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(107,114,128,0.15);">
                    <i class="fas fa-user-slash" style="color:#6B7280"></i>
                </div>
                <div class="stat-content"><h3>${inativos}</h3><p>Inativos</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon yellow"><i class="fas fa-clipboard-list"></i></div>
                <div class="stat-content"><h3>${logs.length}</h3><p>Ações (7 dias)</p></div>
            </div>
        </div>

        <!-- Lista de usuários -->
        <div class="card mb-3">
            <div class="card-header flex-between">
                <h3 class="card-title">
                    <i class="fas fa-users" style="color:var(--red-primary)"></i> Usuários do Sistema
                </h3>
            </div>
            <div class="card-body">
                <div class="usuarios-grid">
                    ${usuarios.map(u => Pages._renderUsuarioRow(u)).join('')}
                </div>
            </div>
        </div>

        <!-- Log de Auditoria Global -->
        <div class="card">
            <div class="card-header flex-between">
                <h3 class="card-title">
                    <i class="fas fa-clipboard-list" style="color:var(--red-primary)"></i>
                    Log de Auditoria
                </h3>
                <button class="btn-secondary btn-sm" onclick="Pages.carregarAuditCompleto()">
                    <i class="fas fa-sync"></i> Atualizar
                </button>
            </div>
            <div class="card-body">
                <!-- Filtros -->
                <div class="audit-filtros">
                    <select id="filtroAuditUsuario" onchange="Pages.filtrarAudit()">
                        <option value="">Todos os usuários</option>
                        ${usuarios.map(u => `<option value="${u.id}">${u.nome}</option>`).join('')}
                    </select>
                    <select id="filtroAuditModulo" onchange="Pages.filtrarAudit()">
                        <option value="">Todos os módulos</option>
                        ${['artistas','eventos','contratos','vendas','financeiro','usuarios'].map(m =>
                            `<option value="${m}">${m.charAt(0).toUpperCase()+m.slice(1)}</option>`
                        ).join('')}
                    </select>
                    <select id="filtroAuditAcao" onchange="Pages.filtrarAudit()">
                        <option value="">Todas as ações</option>
                        ${['LOGIN','LOGOUT','CRIAR','EDITAR','EXCLUIR','ASSINAR'].map(a =>
                            `<option value="${a}">${a}</option>`
                        ).join('')}
                    </select>
                    <input type="date" id="filtroAuditData" onchange="Pages.filtrarAudit()"
                           placeholder="Data" style="min-width:130px;">
                </div>

                <!-- Timeline -->
                <div id="auditContainer">
                    ${Pages._renderAuditTimeline(logs)}
                </div>
            </div>
        </div>

    </div>`;

    document.getElementById('pageContent').innerHTML = html;
    Pages._logsCache = logs;
};

Pages._renderUsuarioRow = function(u) {
    const nivelClass = {
        'Admin / Master':    'nivel-admin',
        'Manager':           'nivel-manager',
        'Financeiro':        'nivel-fin',
        'Produção/Técnico':  'nivel-prod',
    }[u.nivel] || 'nivel-prod';

    const ultimoAcesso = u.ultimo_acesso
        ? new Date(u.ultimo_acesso).toLocaleString('pt-BR')
        : 'Nunca acessou';

    const totalAcessos = u.total_acessos || 0;

    return `
        <div class="usuario-row">
            <div class="usuario-row-left">
                <div class="usuario-status-dot ${u.ativo !== false ? 'dot-ativo' : 'dot-inativo'}" title="${u.ativo !== false ? 'Ativo' : 'Inativo'}"></div>
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(u.nome)}&background=E10600&color=fff&size=80"
                     class="usuario-avatar-sm" alt="">
                <div>
                    <div class="usuario-info-nome">${u.nome}</div>
                    <div class="usuario-info-sub">@${u.username} · ${u.email || 'Sem e-mail'}</div>
                    <div class="usuario-info-meta">
                        <span><i class="fas fa-clock"></i> ${ultimoAcesso}</span>
                        <span><i class="fas fa-sign-in-alt"></i> ${totalAcessos} acessos</span>
                    </div>
                </div>
            </div>
            <div class="usuario-row-right">
                <span class="nivel-badge ${nivelClass}">${u.nivel}</span>
                <button class="btn-secondary btn-sm" onclick="Modals.showHistoricoUsuario('${u.id}','${u.nome}')" title="Ver histórico">
                    <i class="fas fa-history"></i>
                </button>
                <button class="btn-secondary btn-sm" onclick="Modals.showPermissoesModal('${u.id}')" title="Permissões">
                    <i class="fas fa-shield-alt"></i>
                </button>
                <button class="btn-secondary btn-sm" onclick="Modals.showUsuarioModal('${u.id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-secondary btn-sm" onclick="Pages.toggleUsuarioStatus('${u.id}', ${u.ativo !== false})"
                        title="${u.ativo !== false ? 'Desativar' : 'Ativar'}"
                        style="color:${u.ativo !== false ? 'var(--danger)' : 'var(--success)'}">
                    <i class="fas fa-${u.ativo !== false ? 'ban' : 'check-circle'}"></i>
                </button>
            </div>
        </div>`;
};

Pages._renderAuditTimeline = function(logs) {
    if (!logs.length) return `
        <div style="text-align:center;padding:40px;color:var(--text-muted);">
            <i class="fas fa-clipboard-list" style="font-size:36px;opacity:0.3;display:block;margin-bottom:10px;"></i>
            Nenhuma ação registrada no período.
        </div>`;

    const iconeAcao = {
        'LOGIN':   { cls: 'audit-icon-login',   icon: 'fa-sign-in-alt'    },
        'LOGOUT':  { cls: 'audit-icon-login',   icon: 'fa-sign-out-alt'   },
        'CRIAR':   { cls: 'audit-icon-criar',   icon: 'fa-plus'           },
        'EDITAR':  { cls: 'audit-icon-editar',  icon: 'fa-edit'           },
        'EXCLUIR': { cls: 'audit-icon-excluir', icon: 'fa-trash'          },
        'ASSINAR': { cls: 'audit-icon-assinar', icon: 'fa-file-signature' },
    };

    return `<div class="audit-timeline">
        ${logs.map(l => {
            const cfg = iconeAcao[l.acao] || { cls: 'audit-icon-default', icon: 'fa-info-circle' };
            const dt  = l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : '—';
            return `
            <div class="audit-item">
                <div class="audit-icon ${cfg.cls}">
                    <i class="fas ${cfg.icon}"></i>
                </div>
                <div class="audit-content">
                    <div class="audit-acao">
                        <strong>${l.usuario_nome || '—'}</strong>
                        <span style="color:var(--text-muted);font-weight:400;margin:0 6px;">·</span>
                        <span style="color:var(--red-primary);font-size:11px;font-weight:700;">${l.acao}</span>
                        ${l.modulo ? `<span style="color:var(--text-muted);font-size:11px;margin-left:4px;">em ${l.modulo}</span>` : ''}
                    </div>
                    <div class="audit-descricao">${l.descricao || '—'}</div>
                </div>
                <div class="audit-time">${dt}</div>
            </div>`;
        }).join('')}
    </div>`;
};

Pages.filtrarAudit = async function() {
    const usuario = document.getElementById('filtroAuditUsuario')?.value;
    const modulo  = document.getElementById('filtroAuditModulo')?.value;
    const acao    = document.getElementById('filtroAuditAcao')?.value;
    const data    = document.getElementById('filtroAuditData')?.value;

    const container = document.getElementById('auditContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';

    const logs = await AuditDB.listar({
        usuario_id: usuario || undefined,
        modulo:     modulo  || undefined,
        acao:       acao    || undefined,
        dataInicio: data    || undefined,
        dataFim:    data    || undefined,
    });

    container.innerHTML = Pages._renderAuditTimeline(logs);
};

Pages.carregarAuditCompleto = async function() {
    const container = document.getElementById('auditContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';
    const logs = await AuditDB.listar();
    container.innerHTML = Pages._renderAuditTimeline(logs);
};

Pages.toggleUsuarioStatus = async function(id, atualAtivo) {
    const acao = atualAtivo ? 'desativar' : 'ativar';
    const ok = await Utils.confirm(`Deseja ${acao} este usuário?`);
    if (!ok) return;
    const r = await UsuariosDB.atualizar(id, { ativo: !atualAtivo });
    if (r) {
        await AuditDB.registrar({
            acao: 'EDITAR',
            modulo: 'usuarios',
            registroId: id,
            descricao: `Usuário ${atualAtivo ? 'desativado' : 'ativado'}`,
        });
        Utils.showToast(`Usuário ${atualAtivo ? 'desativado' : 'ativado'}!`, 'success');
        Pages.renderUsuarios();
    }
};
