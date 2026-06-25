/* ============================================================
   GIBSON MANAGER PRO — GESTÃO DE VEÍCULOS
   pages-veiculos.js
   ============================================================ */

// ─── DB: Veículos ──────────────────────────────────────────────────────────────
const VeiculosDB = {
    _sb() {
        if (typeof sbClient !== 'undefined' && sbClient) return sbClient;
        return window.supabase
            ? window.supabase.createClient(Config.SUPABASE_URL, Config.SUPABASE_KEY)
            : null;
    },

    async listar() {
        const { data, error } = await this._sb().from('veiculos').select('*').order('nome');
        if (error) throw error;
        return data || [];
    },

    async buscarPorId(id) {
        const { data, error } = await this._sb().from('veiculos').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return data;
    },

    async salvar(dados) {
        const sb = this._sb();
        const now = new Date().toISOString();
        if (dados.id) {
            const { id, created_at, ...upd } = dados;
            const { data, error } = await sb.from('veiculos').update({ ...upd, updated_at: now }).eq('id', id).select().maybeSingle();
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await sb.from('veiculos').insert([{ ...dados, updated_at: now }]).select().maybeSingle();
            if (error) throw error;
            return data;
        }
    },

    async excluir(id) {
        const { error } = await this._sb().from('veiculos').delete().eq('id', id);
        if (error) throw error;
    }
};

// ─── DB: Viagens ───────────────────────────────────────────────────────────────
const ViagemDB = {
    _sb() {
        if (typeof sbClient !== 'undefined' && sbClient) return sbClient;
        return window.supabase
            ? window.supabase.createClient(Config.SUPABASE_URL, Config.SUPABASE_KEY)
            : null;
    },

    async listar() {
        const { data, error } = await this._sb().from('viagens').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async buscarPorId(id) {
        const { data, error } = await this._sb().from('viagens').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return data;
    },

    async salvar(dados) {
        const sb = this._sb();
        const now = new Date().toISOString();
        if (dados.id) {
            const { id, created_at, ...upd } = dados;
            const { data, error } = await sb.from('viagens').update({ ...upd, updated_at: now }).eq('id', id).select().maybeSingle();
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await sb.from('viagens').insert([{ ...dados, updated_at: now }]).select().maybeSingle();
            if (error) throw error;
            return data;
        }
    },

    async excluir(id) {
        const sb = this._sb();
        await sb.from('viagem_trechos').delete().eq('viagem_id', id);
        await sb.from('viagem_despesas').delete().eq('viagem_id', id);
        const { error } = await sb.from('viagens').delete().eq('id', id);
        if (error) throw error;
    },

    // ─── Trechos ────────────────────────────────────────────────────────────────
    async listarTrechos(viagem_id) {
        const { data, error } = await this._sb().from('viagem_trechos').select('*').eq('viagem_id', viagem_id).order('ordem');
        if (error) throw error;
        return data || [];
    },

    async salvarTrechos(viagem_id, trechos) {
        const sb = this._sb();
        await sb.from('viagem_trechos').delete().eq('viagem_id', viagem_id);
        if (!trechos.length) return;
        const rows = trechos.map((t, i) => ({ ...t, viagem_id, ordem: i }));
        const { error } = await sb.from('viagem_trechos').insert(rows);
        if (error) throw error;
    },

    // ─── Despesas ────────────────────────────────────────────────────────────────
    async listarDespesas(viagem_id) {
        const { data, error } = await this._sb().from('viagem_despesas').select('*').eq('viagem_id', viagem_id).order('tipo');
        if (error) throw error;
        return data || [];
    },

    async salvarDespesas(viagem_id, despesas) {
        const sb = this._sb();
        await sb.from('viagem_despesas').delete().eq('viagem_id', viagem_id);
        if (!despesas.length) return;
        const rows = despesas.map(d => ({ ...d, viagem_id }));
        const { error } = await sb.from('viagem_despesas').insert(rows);
        if (error) throw error;
    }
};

// ─── RENDER PRINCIPAL ──────────────────────────────────────────────────────────
Pages.renderVeiculos = async function () {
    const pc = document.getElementById('pageContent');
    pc.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';

    try {
        const [viagens, veiculos, eventos, artistas] = await Promise.all([
            ViagemDB.listar(),
            VeiculosDB.listar(),
            EventosDB.listar(),
            ArtistasDB.listar()
        ]);

        const evMap  = {};  eventos.forEach(e => evMap[e.id]  = e);
        const artMap = {};  artistas.forEach(a => artMap[a.id] = a);
        const veiMap = {};  veiculos.forEach(v => veiMap[v.id] = v);

        // KPIs rápidos
        const totalViagens   = viagens.length;
        const totalReceita   = viagens.reduce((s, v) => s + (parseFloat(v.receita_transporte) || 0), 0);
        const totalDespComb  = viagens.reduce((s, v) => s + (parseFloat(v.total_combustivel)   || 0), 0);
        const totalLucro     = viagens.reduce((s, v) => s + (parseFloat(v.lucro_total)          || 0), 0);

        pc.innerHTML = `
        <div class="veiculos-page">
            <!-- KPIs -->
            <div class="stats-grid" style="margin-bottom:24px;">
                <div class="stat-card">
                    <div class="stat-icon blue"><i class="fas fa-route"></i></div>
                    <div class="stat-content"><h3>${totalViagens}</h3><p>Viagens</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green"><i class="fas fa-dollar-sign"></i></div>
                    <div class="stat-content"><h3>${Utils.formatCurrency(totalReceita)}</h3><p>Receita Transporte</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange"><i class="fas fa-gas-pump"></i></div>
                    <div class="stat-content"><h3>${Utils.formatCurrency(totalDespComb)}</h3><p>Total Combustível</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon ${totalLucro >= 0 ? 'green' : 'red'}"><i class="fas fa-chart-line"></i></div>
                    <div class="stat-content"><h3>${Utils.formatCurrency(totalLucro)}</h3><p>Lucro Transporte</p></div>
                </div>
            </div>

            <!-- Tabs -->
            <div style="display:flex; gap:12px; margin-bottom:20px; align-items:center;">
                <button class="tab-btn-vei active" data-vtab="viagens" onclick="Pages._veiTab('viagens')">
                    <i class="fas fa-road"></i> Viagens
                </button>
                <button class="tab-btn-vei" data-vtab="frota" onclick="Pages._veiTab('frota')">
                    <i class="fas fa-bus"></i> Frota
                </button>
                <div style="flex:1;"></div>
                <button class="btn-primary btn-sm" onclick="Pages._novaViagem()">
                    <i class="fas fa-plus"></i> Nova Viagem
                </button>
                <button class="btn-secondary btn-sm" onclick="Pages._novoVeiculo()">
                    <i class="fas fa-plus"></i> Novo Veículo
                </button>
            </div>

            <!-- Tab Viagens -->
            <div id="vtab-viagens" class="vtab-pane active">
                ${this._htmlListaViagens(viagens, veiMap, evMap, artMap)}
            </div>

            <!-- Tab Frota -->
            <div id="vtab-frota" class="vtab-pane" style="display:none;">
                ${this._htmlFrota(veiculos)}
            </div>
        </div>

        <!-- Modal Viagem -->
        <div id="modalViagem" class="modal-overlay" style="display:none;" onclick="if(event.target===this)Pages._fecharModalViagem()">
            <div class="modal-container" style="max-width:780px;width:95%;">
                <div class="modal-header">
                    <h3 id="modalViagemTitulo"><i class="fas fa-route"></i> Nova Viagem</h3>
                    <button class="modal-close" onclick="Pages._fecharModalViagem()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" id="modalViagemBody" style="max-height:80vh;overflow-y:auto;"></div>
            </div>
        </div>

        <!-- Modal Veículo -->
        <div id="modalVeiculo" class="modal-overlay" style="display:none;" onclick="if(event.target===this)Pages._fecharModalVeiculo()">
            <div class="modal-container" style="max-width:500px;width:95%;">
                <div class="modal-header">
                    <h3 id="modalVeiculoTitulo"><i class="fas fa-bus"></i> Cadastrar Veículo</h3>
                    <button class="modal-close" onclick="Pages._fecharModalVeiculo()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" id="modalVeiculoBody" style="max-height:80vh;overflow-y:auto;"></div>
            </div>
        </div>

        <style>
            .tab-btn-vei {
                padding: 8px 20px; border-radius: 8px; border: 1px solid var(--border-color);
                background: var(--bg-secondary); color: var(--text-secondary);
                cursor: pointer; font-size: 14px; font-weight: 600; transition: all .2s;
            }
            .tab-btn-vei.active {
                background: var(--red-primary); color: #fff; border-color: var(--red-primary);
            }
            .vtab-pane { display: none; }
            .vtab-pane.active { display: block; }

            .viagem-card {
                background: var(--bg-card); border: 1px solid var(--border-color);
                border-radius: 12px; padding: 20px; margin-bottom: 16px;
                transition: all .2s;
            }
            .viagem-card:hover { border-color: var(--red-primary); box-shadow: 0 4px 20px rgba(200,0,0,.15); }
            .viagem-card-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
            .viagem-card-title { font-size:16px; font-weight:700; color:var(--text-primary); }
            .viagem-card-sub { font-size:12px; color:var(--text-muted); margin-top:3px; }
            .viagem-financeiro {
                display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
                gap: 10px; background: var(--bg-secondary); border-radius: 10px;
                padding: 12px; margin-top: 12px;
            }
            .vf-item { text-align:center; }
            .vf-label { font-size:10px; text-transform:uppercase; letter-spacing:.5px; color:var(--text-muted); }
            .vf-value { font-size:14px; font-weight:700; color:var(--text-primary); margin-top:2px; }
            .vf-value.green { color: var(--success); }
            .vf-value.red   { color: var(--danger);  }
            .vf-value.yellow{ color: var(--warning); }

            .trecho-row {
                background: var(--bg-secondary); border-radius: 8px; padding: 14px;
                margin-bottom: 10px; border-left: 3px solid var(--red-primary);
            }
            .trecho-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }
            .trecho-grid-4 { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:10px; }
            .despesa-row {
                display:grid; grid-template-columns:140px 1fr 120px auto; gap:10px;
                align-items:end; margin-bottom:8px;
            }

            .frota-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:16px; }
            .frota-card {
                background: var(--bg-card); border: 1px solid var(--border-color);
                border-radius: 12px; padding: 20px; transition: all .2s;
            }
            .frota-card:hover { border-color: var(--red-primary); }
            .frota-card-placa {
                font-size:22px; font-weight:900; color: var(--red-primary);
                font-family: monospace; letter-spacing:2px;
            }
            .frota-card-nome { font-size:15px; font-weight:700; color:var(--text-primary); margin-top:4px; }
            .frota-card-info { font-size:12px; color:var(--text-muted); margin-top:6px; }
        </style>
        `;

        // Guarda dados para o modal
        window._veiEventos   = eventos;
        window._veiVeiculos  = veiculos;
        window._veiArtistas  = artistas;

    } catch (err) {
        console.error('[Veículos]', err);
        pc.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Erro ao carregar: ${err.message}</div>`;
    }
};

// ─── HTML: Lista de viagens ────────────────────────────────────────────────────
Pages._htmlListaViagens = function(viagens, veiMap, evMap, artMap) {
    if (!viagens.length) {
        return `<div class="empty-state" style="text-align:center;padding:60px;">
            <i class="fas fa-route" style="font-size:48px;color:var(--text-muted);margin-bottom:16px;display:block;"></i>
            <h3>Nenhuma viagem registrada</h3>
            <p style="color:var(--text-muted);">Clique em "Nova Viagem" para começar</p>
        </div>`;
    }

    return viagens.map(v => {
        const vei    = veiMap[v.veiculo_id];
        const ev     = evMap[v.evento_id];
        const art    = ev ? artMap[ev.artista_id] : null;
        const kmTotal = ((parseFloat(v.km_final)||0) - (parseFloat(v.km_inicial)||0));
        const receita = parseFloat(v.receita_transporte) || 0;
        const comb    = parseFloat(v.total_combustivel)  || 0;
        const ped     = parseFloat(v.total_pedagio)      || 0;
        const manut   = parseFloat(v.total_manutencao)   || 0;
        const outros  = parseFloat(v.total_outros)       || 0;
        const despTotal = comb + ped + manut + outros;
        const lucro     = receita - despTotal;

        const statusBadge = v.status === 'concluida'
            ? '<span class="badge badge-success">Concluída</span>'
            : '<span class="badge badge-warning">Em Andamento</span>';

        return `
        <div class="viagem-card">
            <div class="viagem-card-header">
                <div>
                    <div class="viagem-card-title">
                        <i class="fas fa-bus" style="color:var(--red-primary);margin-right:6px;"></i>
                        ${vei ? vei.nome : 'Veículo não definido'}
                        ${vei && vei.placa ? `<span style="font-size:12px;color:var(--text-muted);margin-left:8px;font-family:monospace;">${vei.placa}</span>` : ''}
                    </div>
                    ${ev ? `<div class="viagem-card-sub"><i class="fas fa-calendar-alt"></i> ${Utils.formatDate(ev.data)} — ${ev.local}${art ? ` | <i class="fas fa-microphone-alt"></i> ${art.nome}` : ''}</div>` : '<div class="viagem-card-sub">Sem evento vinculado</div>'}
                    ${v.data_inicio ? `<div class="viagem-card-sub"><i class="fas fa-road"></i> ${Utils.formatDate(v.data_inicio)}${v.data_fim && v.data_fim !== v.data_inicio ? ' → ' + Utils.formatDate(v.data_fim) : ''} | ${kmTotal > 0 ? kmTotal.toFixed(1) + ' km' : '—'}</div>` : ''}
                </div>
                <div style="display:flex;gap:8px;align-items:flex-start;">
                    ${statusBadge}
                    <button class="btn-secondary btn-sm" onclick="Pages._editarViagem('${v.id}')"><i class="fas fa-pen"></i></button>
                    <button class="btn-secondary btn-sm" style="color:var(--danger);" onclick="Pages._excluirViagem('${v.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>

            <div class="viagem-financeiro">
                <div class="vf-item">
                    <div class="vf-label">Receita</div>
                    <div class="vf-value green">${Utils.formatCurrency(receita)}</div>
                </div>
                <div class="vf-item">
                    <div class="vf-label">Combustível</div>
                    <div class="vf-value yellow">${Utils.formatCurrency(comb)}</div>
                </div>
                <div class="vf-item">
                    <div class="vf-label">Pedágio</div>
                    <div class="vf-value yellow">${Utils.formatCurrency(ped)}</div>
                </div>
                ${manut > 0 ? `<div class="vf-item"><div class="vf-label">Manutenção</div><div class="vf-value yellow">${Utils.formatCurrency(manut)}</div></div>` : ''}
                ${outros > 0 ? `<div class="vf-item"><div class="vf-label">Outros</div><div class="vf-value yellow">${Utils.formatCurrency(outros)}</div></div>` : ''}
                <div class="vf-item">
                    <div class="vf-label">Desp. Total</div>
                    <div class="vf-value red">${Utils.formatCurrency(despTotal)}</div>
                </div>
                <div class="vf-item">
                    <div class="vf-label">Lucro</div>
                    <div class="vf-value ${lucro >= 0 ? 'green' : 'red'}">${Utils.formatCurrency(lucro)}</div>
                </div>
            </div>
        </div>`;
    }).join('');
};

// ─── HTML: Frota ──────────────────────────────────────────────────────────────
Pages._htmlFrota = function(veiculos) {
    if (!veiculos.length) {
        return `<div class="empty-state" style="text-align:center;padding:60px;">
            <i class="fas fa-bus" style="font-size:48px;color:var(--text-muted);margin-bottom:16px;display:block;"></i>
            <h3>Nenhum veículo cadastrado</h3>
        </div>`;
    }
    return `<div class="frota-grid">${veiculos.map(v => `
        <div class="frota-card">
            <div class="frota-card-placa">${v.placa || '—'}</div>
            <div class="frota-card-nome">${v.nome}</div>
            <div class="frota-card-info">
                ${v.modelo ? `<span><i class="fas fa-car"></i> ${v.modelo}</span>` : ''}
                ${v.ano    ? ` | ${v.ano}` : ''}
                ${v.cor    ? ` | ${v.cor}`  : ''}
            </div>
            ${v.observacoes ? `<div class="frota-card-info" style="margin-top:8px;font-style:italic;">${v.observacoes}</div>` : ''}
            <div style="display:flex;gap:8px;margin-top:14px;">
                <button class="btn-secondary btn-sm" onclick="Pages._editarVeiculo('${v.id}')"><i class="fas fa-pen"></i> Editar</button>
                <button class="btn-secondary btn-sm" style="color:var(--danger);" onclick="Pages._excluirVeiculo('${v.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>`).join('')}</div>`;
};

// ─── Tab switch ───────────────────────────────────────────────────────────────
Pages._veiTab = function(tab) {
    document.querySelectorAll('.tab-btn-vei').forEach(b => b.classList.toggle('active', b.dataset.vtab === tab));
    document.querySelectorAll('.vtab-pane').forEach(p => {
        p.style.display = p.id === `vtab-${tab}` ? 'block' : 'none';
        p.classList.toggle('active', p.id === `vtab-${tab}`);
    });
};

// ─── Modal Viagem ─────────────────────────────────────────────────────────────
Pages._veiTrechoIdx = 0;
Pages._veiDespIdx   = 0;

Pages._novaViagem = function(viagemId) {
    const modal = document.getElementById('modalViagem');
    document.getElementById('modalViagemTitulo').innerHTML = viagemId
        ? '<i class="fas fa-route"></i> Editar Viagem'
        : '<i class="fas fa-route"></i> Nova Viagem';
    modal.style.display = 'flex';
    Pages._renderModalViagemBody(null, viagemId);
};

Pages._editarViagem = async function(id) {
    const modal = document.getElementById('modalViagem');
    document.getElementById('modalViagemTitulo').innerHTML = '<i class="fas fa-route"></i> Editar Viagem';
    modal.style.display = 'flex';
    document.getElementById('modalViagemBody').innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';
    try {
        const [viagem, trechos, despesas] = await Promise.all([
            ViagemDB.buscarPorId(id),
            ViagemDB.listarTrechos(id),
            ViagemDB.listarDespesas(id)
        ]);
        Pages._renderModalViagemBody(viagem, id, trechos, despesas);
    } catch(e) {
        document.getElementById('modalViagemBody').innerHTML = `<p style="color:var(--danger)">Erro: ${e.message}</p>`;
    }
};

Pages._renderModalViagemBody = function(viagem, editId, trechos = [], despesas = []) {
    Pages._veiTrechoIdx = trechos.length;
    Pages._veiDespIdx   = despesas.length;

    const eventos  = window._veiEventos  || [];
    const veiculos = window._veiVeiculos || [];

    const v = viagem || {};

    // Opções de veículos
    const optVei = `<option value="">— selecione —</option>` +
        veiculos.map(vei => `<option value="${vei.id}" ${v.veiculo_id === vei.id ? 'selected' : ''}>${vei.nome}${vei.placa ? ' ('+vei.placa+')' : ''}</option>`).join('');

    // Opções de eventos (próximos + passados, ordenado por data desc)
    const optEv = `<option value="">— nenhum —</option>` +
        [...eventos].sort((a,b) => b.data > a.data ? 1 : -1)
            .map(e => `<option value="${e.id}" ${v.evento_id === e.id ? 'selected' : ''}>${Utils.formatDate(e.data)} — ${e.local}</option>`).join('');

    // Trechos existentes HTML
    const trenchosHTML = trechos.map((t, i) => Pages._htmlTrecho(i, t)).join('');

    // Despesas existentes HTML (não combustível, que já está nos trechos)
    const despExtraHTML = despesas.map((d, i) => Pages._htmlDespExtra(i, d)).join('');

    document.getElementById('modalViagemBody').innerHTML = `
    <form id="formViagem" onsubmit="event.preventDefault(); Pages._salvarViagem();">
        <div class="form-grid" style="grid-template-columns:1fr 1fr; gap:14px; margin-bottom:18px;">
            <div class="form-group">
                <label class="form-label">Veículo *</label>
                <select class="form-control" name="veiculo_id" required>${optVei}</select>
            </div>
            <div class="form-group">
                <label class="form-label">Evento Vinculado</label>
                <select class="form-control" name="evento_id">${optEv}</select>
            </div>
            <div class="form-group">
                <label class="form-label">Data Início</label>
                <input type="date" class="form-control" name="data_inicio" value="${v.data_inicio || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Data Fim</label>
                <input type="date" class="form-control" name="data_fim" value="${v.data_fim || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">KM Inicial (hodômetro)</label>
                <input type="number" step="0.1" class="form-control" name="km_inicial" value="${v.km_inicial || ''}" placeholder="Ex: 793713.8">
            </div>
            <div class="form-group">
                <label class="form-label">KM Final (hodômetro)</label>
                <input type="number" step="0.1" class="form-control" name="km_final" value="${v.km_final || ''}" placeholder="Ex: 795674.3">
            </div>
            <div class="form-group">
                <label class="form-label">Receita de Transporte (R$)</label>
                <input type="number" step="0.01" class="form-control" name="receita_transporte" value="${v.receita_transporte || ''}" placeholder="0,00">
            </div>
            <div class="form-group">
                <label class="form-label">Status</label>
                <select class="form-control" name="status">
                    <option value="em_andamento" ${(v.status||'em_andamento') === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
                    <option value="concluida" ${v.status === 'concluida' ? 'selected' : ''}>Concluída</option>
                </select>
            </div>
        </div>

        <!-- Trechos / Paradas -->
        <div style="margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h4 style="margin:0; font-size:15px; color:var(--red-primary);"><i class="fas fa-map-marked-alt"></i> Trechos da Viagem</h4>
                <button type="button" class="btn-secondary btn-sm" onclick="Pages._addTrecho()">
                    <i class="fas fa-plus"></i> Adicionar Trecho
                </button>
            </div>
            <div id="trecho-list">${trenchosHTML || Pages._htmlTrecho(0)}</div>
        </div>

        <!-- Despesas Extras -->
        <div style="margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h4 style="margin:0; font-size:15px; color:var(--red-primary);"><i class="fas fa-receipt"></i> Outras Despesas</h4>
                <button type="button" class="btn-secondary btn-sm" onclick="Pages._addDespExtra()">
                    <i class="fas fa-plus"></i> Adicionar
                </button>
            </div>
            <div id="desp-extra-list">${despExtraHTML}</div>
        </div>

        <!-- Observações -->
        <div class="form-group" style="margin-bottom:20px;">
            <label class="form-label">Observações</label>
            <textarea class="form-control" name="observacoes" rows="2" placeholder="Anotações gerais da viagem...">${v.observacoes || ''}</textarea>
        </div>

        <input type="hidden" name="_editId" value="${editId || ''}">

        <div style="display:flex; justify-content:flex-end; gap:12px; padding-top:12px; border-top:1px solid var(--border-color);">
            <button type="button" class="btn-secondary" onclick="Pages._fecharModalViagem()">Cancelar</button>
            <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Salvar Viagem</button>
        </div>
    </form>`;
};

// Template de trecho
Pages._htmlTrecho = function(idx, t = {}) {
    return `
    <div class="trecho-row" id="trecho-${idx}">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-weight:700; font-size:13px; color:var(--red-primary);">
                <i class="fas fa-map-pin"></i> Trecho ${idx + 1}
            </span>
            <button type="button" class="btn-secondary btn-sm" style="color:var(--danger);" onclick="document.getElementById('trecho-${idx}').remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="trecho-grid" style="margin-bottom:10px;">
            <div class="form-group" style="margin:0;">
                <label class="form-label" style="font-size:11px;">Data</label>
                <input type="date" class="form-control" name="tr_data_${idx}" value="${t.data || ''}">
            </div>
            <div class="form-group" style="margin:0;">
                <label class="form-label" style="font-size:11px;">Cidade Origem</label>
                <input type="text" class="form-control" name="tr_origem_${idx}" value="${t.cidade_origem || ''}" placeholder="Ex: Dores de Campos">
            </div>
            <div class="form-group" style="margin:0;">
                <label class="form-label" style="font-size:11px;">Cidade Destino</label>
                <input type="text" class="form-control" name="tr_destino_${idx}" value="${t.cidade_destino || ''}" placeholder="Ex: Itaperuna">
            </div>
        </div>
        <div class="trecho-grid-4">
            <div class="form-group" style="margin:0;">
                <label class="form-label" style="font-size:11px;">KM Saída</label>
                <input type="number" step="0.1" class="form-control" name="tr_kmsaida_${idx}" value="${t.km_saida || ''}" placeholder="793713.8">
            </div>
            <div class="form-group" style="margin:0;">
                <label class="form-label" style="font-size:11px;">KM Chegada</label>
                <input type="number" step="0.1" class="form-control" name="tr_kmchegada_${idx}" value="${t.km_chegada || ''}" placeholder="794410.2">
            </div>
            <div class="form-group" style="margin:0;">
                <label class="form-label" style="font-size:11px;">KM Abastecimento</label>
                <input type="number" step="0.1" class="form-control" name="tr_kmabast_${idx}" value="${t.km_abastecimento || ''}" placeholder="793923.1">
            </div>
            <div class="form-group" style="margin:0;">
                <label class="form-label" style="font-size:11px;">Valor Abastecimento</label>
                <input type="number" step="0.01" class="form-control" name="tr_vlrabast_${idx}" value="${t.valor_abastecimento || ''}" placeholder="2649.15">
            </div>
        </div>
    </div>`;
};

Pages._addTrecho = function() {
    Pages._veiTrechoIdx++;
    const container = document.getElementById('trecho-list');
    const div = document.createElement('div');
    div.innerHTML = Pages._htmlTrecho(Pages._veiTrechoIdx);
    container.appendChild(div.firstElementChild);
};

// Template de despesa extra
Pages._htmlDespExtra = function(idx, d = {}) {
    return `
    <div class="despesa-row" id="desp-${idx}">
        <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:11px;">Tipo</label>
            <select class="form-control" name="dp_tipo_${idx}">
                <option value="pedagio"     ${(d.tipo||'pedagio') === 'pedagio'     ? 'selected' : ''}>Pedágio</option>
                <option value="manutencao"  ${d.tipo === 'manutencao'  ? 'selected' : ''}>Manutenção</option>
                <option value="outros"      ${d.tipo === 'outros'      ? 'selected' : ''}>Outros</option>
            </select>
        </div>
        <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:11px;">Descrição</label>
            <input type="text" class="form-control" name="dp_desc_${idx}" value="${d.descricao || ''}" placeholder="Descrição">
        </div>
        <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:11px;">Valor (R$)</label>
            <input type="number" step="0.01" class="form-control" name="dp_valor_${idx}" value="${d.valor || ''}" placeholder="0,00">
        </div>
        <button type="button" class="btn-secondary btn-sm" style="color:var(--danger);align-self:flex-end;" onclick="document.getElementById('desp-${idx}').remove()">
            <i class="fas fa-times"></i>
        </button>
    </div>`;
};

Pages._addDespExtra = function() {
    Pages._veiDespIdx++;
    const container = document.getElementById('desp-extra-list');
    const div = document.createElement('div');
    div.innerHTML = Pages._htmlDespExtra(Pages._veiDespIdx);
    container.appendChild(div.firstElementChild);
};

// Salvar viagem
Pages._salvarViagem = async function() {
    const form = document.getElementById('formViagem');
    const fd   = new FormData(form);
    const get  = k => (fd.get(k) || '').trim();

    const editId      = get('_editId') || null;
    const veiculo_id  = get('veiculo_id');
    const evento_id   = get('evento_id') || null;

    if (!veiculo_id) {
        Utils.showToast('Selecione um veículo', 'error');
        return;
    }

    try {
        // Coleta trechos
        const trechoEls = document.querySelectorAll('#trecho-list .trecho-row');
        const trechos = [];
        trechoEls.forEach(el => {
            const idx = el.id.replace('trecho-', '');
            const vAbast = parseFloat(form.querySelector(`[name="tr_vlrabast_${idx}"]`)?.value) || 0;
            trechos.push({
                data:              form.querySelector(`[name="tr_data_${idx}"]`)?.value    || null,
                cidade_origem:     form.querySelector(`[name="tr_origem_${idx}"]`)?.value  || null,
                cidade_destino:    form.querySelector(`[name="tr_destino_${idx}"]`)?.value || null,
                km_saida:          parseFloat(form.querySelector(`[name="tr_kmsaida_${idx}"]`)?.value)    || null,
                km_chegada:        parseFloat(form.querySelector(`[name="tr_kmchegada_${idx}"]`)?.value)  || null,
                km_abastecimento:  parseFloat(form.querySelector(`[name="tr_kmabast_${idx}"]`)?.value)    || null,
                valor_abastecimento: vAbast
            });
        });

        // Coleta despesas extras
        const despEls = document.querySelectorAll('#desp-extra-list .despesa-row');
        const despesas = [];
        despEls.forEach(el => {
            const idx = el.id.replace('desp-', '');
            const val = parseFloat(form.querySelector(`[name="dp_valor_${idx}"]`)?.value) || 0;
            if (val > 0) {
                despesas.push({
                    tipo:      form.querySelector(`[name="dp_tipo_${idx}"]`)?.value || 'outros',
                    descricao: form.querySelector(`[name="dp_desc_${idx}"]`)?.value || '',
                    valor:     val
                });
            }
        });

        // Totais calculados
        const total_combustivel = trechos.reduce((s, t) => s + (t.valor_abastecimento || 0), 0);
        const total_pedagio     = despesas.filter(d => d.tipo === 'pedagio').reduce((s, d) => s + d.valor, 0);
        const total_manutencao  = despesas.filter(d => d.tipo === 'manutencao').reduce((s, d) => s + d.valor, 0);
        const total_outros      = despesas.filter(d => d.tipo === 'outros').reduce((s, d) => s + d.valor, 0);
        const receita_transporte = parseFloat(get('receita_transporte')) || 0;
        const lucro_total        = receita_transporte - (total_combustivel + total_pedagio + total_manutencao + total_outros);

        const dadosViagem = {
            veiculo_id,
            evento_id,
            data_inicio:        get('data_inicio') || null,
            data_fim:           get('data_fim')    || null,
            km_inicial:         parseFloat(get('km_inicial'))  || null,
            km_final:           parseFloat(get('km_final'))    || null,
            receita_transporte,
            total_combustivel,
            total_pedagio,
            total_manutencao,
            total_outros,
            lucro_total,
            status:             get('status') || 'em_andamento',
            observacoes:        get('observacoes') || null
        };
        if (editId) dadosViagem.id = editId;

        const viagem = await ViagemDB.salvar(dadosViagem);
        const vid = viagem?.id || editId;

        await ViagemDB.salvarTrechos(vid, trechos);
        await ViagemDB.salvarDespesas(vid, despesas);

        Utils.showToast('Viagem salva com sucesso!', 'success');
        Pages._fecharModalViagem();
        Pages.renderVeiculos();

    } catch(e) {
        console.error('[Viagem Salvar]', e);
        Utils.showToast('Erro ao salvar: ' + e.message, 'error');
    }
};

// Excluir viagem
Pages._excluirViagem = async function(id) {
    if (!confirm('Excluir esta viagem e todos os seus trechos/despesas?')) return;
    try {
        await ViagemDB.excluir(id);
        Utils.showToast('Viagem excluída', 'success');
        Pages.renderVeiculos();
    } catch(e) {
        Utils.showToast('Erro: ' + e.message, 'error');
    }
};

Pages._fecharModalViagem = function() {
    document.getElementById('modalViagem').style.display = 'none';
};

// ─── Modal Veículo ─────────────────────────────────────────────────────────────
Pages._novoVeiculo = function(id) {
    document.getElementById('modalVeiculoTitulo').innerHTML = id
        ? '<i class="fas fa-bus"></i> Editar Veículo'
        : '<i class="fas fa-bus"></i> Cadastrar Veículo';
    document.getElementById('modalVeiculo').style.display = 'flex';
    Pages._renderModalVeiculoBody(null, id);
};

Pages._editarVeiculo = async function(id) {
    document.getElementById('modalVeiculoTitulo').innerHTML = '<i class="fas fa-bus"></i> Editar Veículo';
    document.getElementById('modalVeiculo').style.display = 'flex';
    document.getElementById('modalVeiculoBody').innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';
    try {
        const vei = await VeiculosDB.buscarPorId(id);
        Pages._renderModalVeiculoBody(vei, id);
    } catch(e) {
        document.getElementById('modalVeiculoBody').innerHTML = `<p style="color:var(--danger)">Erro: ${e.message}</p>`;
    }
};

Pages._renderModalVeiculoBody = function(vei, editId) {
    const v = vei || {};
    document.getElementById('modalVeiculoBody').innerHTML = `
    <form id="formVeiculo" onsubmit="event.preventDefault(); Pages._salvarVeiculo();">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:16px;">
            <div class="form-group" style="grid-column:span 2;">
                <label class="form-label">Nome / Apelido *</label>
                <input type="text" class="form-control" name="nome" value="${v.nome || ''}" placeholder="Ex: Ônibus Principal" required>
            </div>
            <div class="form-group">
                <label class="form-label">Placa</label>
                <input type="text" class="form-control" name="placa" value="${v.placa || ''}" placeholder="ABC-1234" style="text-transform:uppercase;">
            </div>
            <div class="form-group">
                <label class="form-label">Modelo</label>
                <input type="text" class="form-control" name="modelo" value="${v.modelo || ''}" placeholder="Ex: Mercedes Benz 1621">
            </div>
            <div class="form-group">
                <label class="form-label">Ano</label>
                <input type="text" class="form-control" name="ano" value="${v.ano || ''}" placeholder="2015">
            </div>
            <div class="form-group">
                <label class="form-label">Cor</label>
                <input type="text" class="form-control" name="cor" value="${v.cor || ''}" placeholder="Branco">
            </div>
            <div class="form-group" style="grid-column:span 2;">
                <label class="form-label">Observações</label>
                <textarea class="form-control" name="observacoes" rows="2" placeholder="Capacidade, características...">${v.observacoes || ''}</textarea>
            </div>
        </div>
        <input type="hidden" name="_editId" value="${editId || ''}">
        <div style="display:flex; justify-content:flex-end; gap:12px; padding-top:12px; border-top:1px solid var(--border-color);">
            <button type="button" class="btn-secondary" onclick="Pages._fecharModalVeiculo()">Cancelar</button>
            <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Salvar</button>
        </div>
    </form>`;
};

Pages._salvarVeiculo = async function() {
    const form = document.getElementById('formVeiculo');
    const fd   = new FormData(form);
    const get  = k => (fd.get(k) || '').trim();
    const editId = get('_editId') || null;

    const dados = {
        nome:        get('nome'),
        placa:       get('placa').toUpperCase(),
        modelo:      get('modelo'),
        ano:         get('ano'),
        cor:         get('cor'),
        observacoes: get('observacoes') || null
    };
    if (editId) dados.id = editId;

    try {
        await VeiculosDB.salvar(dados);
        Utils.showToast('Veículo salvo!', 'success');
        Pages._fecharModalVeiculo();
        Pages.renderVeiculos();
    } catch(e) {
        Utils.showToast('Erro: ' + e.message, 'error');
    }
};

Pages._excluirVeiculo = async function(id) {
    if (!confirm('Excluir este veículo da frota?')) return;
    try {
        await VeiculosDB.excluir(id);
        Utils.showToast('Veículo excluído', 'success');
        Pages.renderVeiculos();
    } catch(e) {
        Utils.showToast('Erro: ' + e.message, 'error');
    }
};

Pages._fecharModalVeiculo = function() {
    document.getElementById('modalVeiculo').style.display = 'none';
};
