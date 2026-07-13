/* ========================================
   GIBSON MANAGER PRO - COMISSÃO VENDEDOR
======================================== */

Pages.renderComissaoVendedor = async function () {
    const pc = document.getElementById('pageContent');
    pc.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';

    let propostas = [];
    let artistas  = [];

    try { propostas = await PropostasDB.listar(false); } catch(e) { propostas = []; }
    try { artistas  = await ArtistasDB.listar();       } catch(e) { artistas  = []; }

    const isAdmin  = Auth.isAdmin();
    const meuNome  = Auth.currentUser?.nome || '';

    // Filtrar propostas com comissão de vendedor
    const minhas = propostas
        .filter(p => (parseFloat(p.vendedor_comissao_valor) || 0) > 0)
        .filter(p => isAdmin || p.vendedor_nome === meuNome)
        .sort((a, b) => new Date(b.data_evento || 0) - new Date(a.data_evento || 0));

    // KPIs
    const total     = minhas.reduce((s, p) => s + (parseFloat(p.vendedor_comissao_valor) || 0), 0);
    const pendente  = minhas.filter(p => p.status !== 'Aceita').reduce((s, p) => s + (parseFloat(p.vendedor_comissao_valor) || 0), 0);
    const realizado = minhas.filter(p => p.status === 'Aceita').reduce((s, p) => s + (parseFloat(p.vendedor_comissao_valor) || 0), 0);

    const statusBadge = (p) => {
        if (p.status === 'Aceita')   return '<span class="badge badge-success">Fechado</span>';
        if (p.status === 'Enviada')  return '<span class="badge badge-warning">Em negociação</span>';
        if (p.status === 'Recusada') return '<span class="badge badge-danger">Recusada</span>';
        return '<span class="badge badge-secondary">Rascunho</span>';
    };

    const comBadge = (p) => {
        if (p.status === 'Aceita') return '<span class="badge badge-warning">Pendente</span>';
        return '<span class="badge badge-secondary">—</span>';
    };

    const rows = minhas.map(p => {
        const art = artistas.find(a => a.id === p.artista_id);
        const val = parseFloat(p.vendedor_comissao_valor) || 0;
        return `
        <tr>
            <td><strong>${p.data_evento ? Utils.formatDate(p.data_evento) : '—'}</strong></td>
            ${isAdmin ? `<td>${p.vendedor_nome || '—'}</td>` : ''}
            <td>${art?.nome || '—'}</td>
            <td>
                ${p.local_evento || '—'}
                ${p.cidade_evento ? `<small style="display:block;color:var(--text-muted)">${p.cidade_evento}</small>` : ''}
            </td>
            <td style="color:var(--success);font-weight:600">${Utils.formatCurrency(p.cache_bruto || 0)}</td>
            <td><strong style="color:var(--brand-primary);font-size:15px">${Utils.formatCurrency(val)}</strong></td>
            <td>${statusBadge(p)}</td>
            <td>${comBadge(p)}</td>
        </tr>`;
    }).join('');

    pc.innerHTML = `
    <div class="fade-in">
        <div class="page-header flex-between mb-3">
            <div>
                <h2 style="display:flex;align-items:center;gap:10px;">
                    <i class="fas fa-hand-holding-usd" style="color:var(--brand-primary)"></i>
                    ${isAdmin ? 'Comissões de Vendedores' : 'Minhas Comissões'}
                </h2>
                <p class="text-muted">Shows fechados e comissões geradas</p>
            </div>
        </div>

        <div class="grid grid-3 mb-3">
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(212,175,55,0.15)">
                    <i class="fas fa-handshake" style="color:var(--brand-primary)"></i>
                </div>
                <div class="stat-content"><h3>${minhas.length}</h3><p>Shows com Comissão</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(245,158,11,0.15)">
                    <i class="fas fa-clock" style="color:var(--warning)"></i>
                </div>
                <div class="stat-content"><h3>${Utils.formatCurrency(realizado)}</h3><p>A Receber (Shows Fechados)</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(212,175,55,0.15)">
                    <i class="fas fa-coins" style="color:var(--brand-primary)"></i>
                </div>
                <div class="stat-content"><h3>${Utils.formatCurrency(total)}</h3><p>Total Geral</p></div>
            </div>
        </div>

        ${minhas.length === 0 ? `
        <div class="card" style="text-align:center;padding:3rem">
            <i class="fas fa-hand-holding-usd" style="font-size:3rem;color:var(--text-muted);margin-bottom:1rem;display:block"></i>
            <h3>Nenhuma comissão encontrada</h3>
            <p class="text-muted">Crie propostas com comissão de vendedor para elas aparecerem aqui.</p>
        </div>
        ` : `
        <div class="card" style="padding:0;overflow:hidden">
            <div style="padding:16px 20px;border-bottom:1px solid var(--border-color)">
                <strong><i class="fas fa-list" style="color:var(--brand-primary);margin-right:8px"></i>Detalhamento</strong>
            </div>
            <div class="table-container" style="margin:0">
                <table>
                    <thead>
                        <tr>
                            <th>Data do Show</th>
                            ${isAdmin ? '<th>Vendedor</th>' : ''}
                            <th>Artista</th>
                            <th>Local</th>
                            <th>Cachê Bruto</th>
                            <th>Comissão</th>
                            <th>Status Proposta</th>
                            <th>Comissão</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
        `}
    </div>`;
};
