/* ========================================
   GIBSON MANAGER PRO - PRESTAÇÃO DE CONTAS DE SHOWS
   Fechamento financeiro por evento/cidade
   Modelo híbrido: categorias padrão + itens extras
======================================== */

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIAS_PADRAO = [
    'Transporte',
    'Diária de Alimentação',
    'Camarim',
    'Hotel',
    'Vans',
    'Aéreas',
    'Combustível',
    'Alimentação',
    'Outros'
];

// Ícones por categoria de despesa
const CATEGORIA_ICONS = {
    'Transporte':           'fa-car',
    'Diária de Alimentação':'fa-utensils',
    'Camarim':              'fa-door-open',
    'Hotel':                'fa-hotel',
    'Vans':                 'fa-shuttle-van',
    'Aéreas':               'fa-plane',
    'Combustível':          'fa-gas-pump',
    'Alimentação':          'fa-utensils',
    'Outros':               'fa-ellipsis-h'
};

const CHECKLIST_PADRAO = [
    { nome: 'Carregadores',        resp: 'contratante' },
    { nome: 'Seguranças',          resp: 'contratante' },
    { nome: 'Rider Técnico',       resp: 'contratante' },
    { nome: 'Palco / Estrutura',   resp: 'contratante' },
    { nome: 'Som e Iluminação',    resp: 'contratante' },
    { nome: 'Alimentação Equipe',  resp: 'contratante' },
    { nome: 'Hospedagem Equipe',   resp: 'contratante' },
    { nome: 'Transfer Aeroporto',  resp: 'artista' },
    { nome: 'Passagens Aéreas',    resp: 'artista' },
];

// ─── DB helpers ───────────────────────────────────────────────────────────────

// Contador global para IDs únicos de linha (evita colisão ao adicionar/remover)
Pages._pcRowIdx = 0;

const PrestacaoDB = {
    // Reusar o sbClient do database-optimized.js em vez de criar novo cliente a cada operação
    _sb() {
        if (typeof sbClient !== 'undefined' && sbClient) return sbClient;
        // Fallback se sbClient não estiver disponível
        return window.supabase
            ? window.supabase.createClient(Config.SUPABASE_URL, Config.SUPABASE_KEY)
            : null;
    },

    async listar(artista_id) {
        const sb = this._sb();
        let q = sb.from('prestacao_contas').select('*').order('data_show', { ascending: false });
        if (artista_id && artista_id !== 'todos') q = q.eq('artista_id', artista_id);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    },

    async buscarPorId(id) {
        const sb = this._sb();
        const { data, error } = await sb.from('prestacao_contas').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return data;
    },

    async salvar(dados) {
        const sb = this._sb();
        const now = new Date().toISOString();
        if (dados.id) {
            const { id, created_at, ...upd } = dados;
            const { data, error } = await sb.from('prestacao_contas')
                .update({ ...upd, updated_at: now }).eq('id', id).select().maybeSingle();
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await sb.from('prestacao_contas')
                .insert([{ ...dados, updated_at: now }]).select().maybeSingle();
            if (error) throw error;
            return data;
        }
    },

    async excluir(id) {
        const sb = this._sb();
        const { error } = await sb.from('prestacao_contas').delete().eq('id', id);
        if (error) throw error;
    },

    // ─── Despesas ──────────────────────────────────────────────────────────────

    async listarDespesas(prestacao_id) {
        const sb = this._sb();
        const { data, error } = await sb.from('prestacao_despesas')
            .select('*').eq('prestacao_id', prestacao_id).order('ordem');
        if (error) throw error;
        return data || [];
    },

    async salvarDespesas(prestacao_id, itens) {
        const sb = this._sb();
        // Apaga tudo e reinserimos (mais simples que diff)
        await sb.from('prestacao_despesas').delete().eq('prestacao_id', prestacao_id);
        if (!itens.length) return;
        const rows = itens.map((it, i) => ({
            prestacao_id,
            categoria_nome: it.categoria_nome,
            tipo:           it.tipo || 'padrao',
            valor_cobrado:  parseFloat(it.valor_cobrado) || 0,
            valor_gasto:    parseFloat(it.valor_gasto)   || 0,
            ordem:          i
        }));
        const { error } = await sb.from('prestacao_despesas').insert(rows);
        if (error) throw error;
    },

    // ─── Checklist ─────────────────────────────────────────────────────────────

    async listarChecklist(prestacao_id) {
        const sb = this._sb();
        const { data, error } = await sb.from('prestacao_contratante')
            .select('*').eq('prestacao_id', prestacao_id).order('created_at');
        if (error) throw error;
        return data || [];
    },

    async salvarChecklist(prestacao_id, itens) {
        const sb = this._sb();
        await sb.from('prestacao_contratante').delete().eq('prestacao_id', prestacao_id);
        if (!itens.length) return;
        const rows = itens.map(it => ({
            prestacao_id,
            item_nome:       it.item_nome,
            responsabilidade: it.responsabilidade || 'contratante',
            status:          it.status || 'pendente'
        }));
        const { error } = await sb.from('prestacao_contratante').insert(rows);
        if (error) throw error;
    }
};

// ─── Renderização: lista de prestações ────────────────────────────────────────

Pages.renderPrestacao = async function(filtroArtistaId) {
    const pageContent = document.getElementById('pageContent');
    pageContent.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';

    try {
        // Artista context: filtroArtistaId (passado explicitamente) > selecionado no dropdown > primeiro da lista
        const artistas = await ArtistasDB.listar();
        const artMap = {};
        artistas.forEach(a => { artMap[a.id] = a.nome; });

        const selectedGlobal = Auth.getSelectedArtistaId ? Auth.getSelectedArtistaId() : (Auth.selectedArtistaId || 'todos');

        // Determinar artista ativo para este módulo
        let artistaAtivo = filtroArtistaId
            || (selectedGlobal !== 'todos' ? selectedGlobal : null)
            || (artistas.length ? artistas[0].id : null);

        const lista = await PrestacaoDB.listar(artistaAtivo);
        const artistaAtualNome = artistaAtivo ? (artMap[artistaAtivo] || 'Artista') : 'Todos';
        const artAtivo = artistas.find(a => a.id === artistaAtivo);
        const artAtivoFoto = artAtivo?.foto
            || `https://ui-avatars.com/api/?name=${encodeURIComponent(artistaAtualNome)}&background=D4AF37&color=000&bold=true&size=80`;

        pageContent.innerHTML = `
            <div class="prestacao-container">
                <div class="page-header flex-between mb-3">
                    <div>
                        <h2><i class="fas fa-receipt" style="color:var(--brand-primary)"></i> Prestação de Contas</h2>
                        <p class="text-muted">Fechamento financeiro por show</p>
                    </div>
                    <button class="btn-primary" onclick="Pages.renderPrestacaoForm(null, '${artistaAtivo || ''}')">
                        <i class="fas fa-plus"></i> Novo Fechamento
                    </button>
                </div>

                <!-- Card artista refinado -->
                <div class="pc-artista-card mb-3">
                    <div class="pc-artista-inner">
                        <img class="pc-artista-avatar"
                             src="${artAtivoFoto}"
                             alt="${artistaAtualNome}"
                             onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(artistaAtualNome)}&background=D4AF37&color=000&bold=true&size=80'">
                        <div class="pc-artista-info">
                            <div class="pc-artista-label"><i class="fas fa-microphone"></i> Artista</div>
                            <div class="pc-artista-nome">${artistaAtualNome}</div>
                            <div class="pc-artista-count">
                                <i class="fas fa-receipt"></i>
                                ${lista.length} fechamento${lista.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                        <div class="pc-artista-select-wrap">
                            <label class="pc-artista-select-label">Trocar artista</label>
                            <select id="prestacaoFiltroArtista" class="pc-artista-select"
                                onchange="Pages.renderPrestacao(this.value)">
                                ${artistas.map(a =>
                                    `<option value="${a.id}" ${a.id === artistaAtivo ? 'selected' : ''}>${a.nome}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                ${lista.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-receipt" style="font-size:3rem;color:var(--text-muted);margin-bottom:1rem"></i>
                        <h3>Nenhum fechamento para ${artistaAtualNome}</h3>
                        <p class="text-muted">Crie o primeiro fechamento financeiro deste artista.</p>
                        <button class="btn-primary mt-2" onclick="Pages.renderPrestacaoForm(null, '${artistaAtivo || ''}')">
                            <i class="fas fa-plus"></i> Novo Fechamento
                        </button>
                    </div>
                ` : `
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Show / Evento</th>
                                    <th>Cidade</th>
                                    <th>Data</th>
                                    <th>Cachê</th>
                                    <th>Valor Contrato</th>
                                    <th>Líquido Artista</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${lista.map(p => {
                                    const statusClass = {
                                        'rascunho': 'badge-warning',
                                        'fechado':  'badge-info',
                                        'aprovado': 'badge-success'
                                    }[p.status] || 'badge-default';
                                    const statusLabel = {
                                        'rascunho': 'Rascunho',
                                        'fechado':  'Fechado',
                                        'aprovado': 'Aprovado'
                                    }[p.status] || p.status;
                                    return `
                                    <tr>
                                        <td><strong>${p.evento_nome || '—'}</strong></td>
                                        <td>${p.cidade || '—'}</td>
                                        <td>${p.data_show ? Utils.formatDate(p.data_show) : '—'}</td>
                                        <td>${Utils.formatCurrency(p.cache_artista || 0)}</td>
                                        <td id="contrato-${p.id}">—</td>
                                        <td id="liquido-${p.id}">—</td>
                                        <td><span class="badge ${statusClass}">${statusLabel}</span></td>
                                        <td>
                                            <button class="btn-icon" title="Editar" onclick="Pages.renderPrestacaoForm('${p.id}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="btn-icon btn-danger" title="Excluir" onclick="Pages.confirmarExcluirPrestacao('${p.id}', '${artistaAtivo}')">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        `;

        // Preencher totais assincronamente
        for (const p of lista) {
            Pages._calcularTotaisPrestacao(p.id).then(totais => {
                const elC = document.getElementById(`contrato-${p.id}`);
                const elL = document.getElementById(`liquido-${p.id}`);
                if (elC) elC.textContent = Utils.formatCurrency(totais.valorContrato);
                if (elL) elL.textContent = Utils.formatCurrency(totais.valorLiquido);
            }).catch(() => {});
        }

    } catch (err) {
        console.error('[Prestacao]', err);
        pageContent.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Erro ao carregar prestações: ${err.message}</div>`;
    }
};

// Calcula totais buscando as despesas no banco
Pages._calcularTotaisPrestacao = async function(prestacaoId) {
    const pc = await PrestacaoDB.buscarPorId(prestacaoId);
    const despesas = await PrestacaoDB.listarDespesas(prestacaoId);
    return Pages._calcularTotais(pc, despesas);
};

// Cálculo puro (sem I/O) — recebe objetos já carregados
Pages._calcularTotais = function(pc, despesas) {
    const nf         = parseFloat(pc.nf_valor)       || 0;
    const comissao   = parseFloat(pc.comissao_valor)  || 0;
    const cache      = parseFloat(pc.cache_artista)   || 0;

    const totalCobradoFisico = despesas.reduce((s, d) => s + (parseFloat(d.valor_cobrado) || 0), 0);
    const totalGastoFisico   = despesas.reduce((s, d) => s + (parseFloat(d.valor_gasto)   || 0), 0);

    const totalCobrado = totalCobradoFisico + nf + comissao;  // Total Cobrado Despesas
    const totalGasto   = totalGastoFisico   + nf + comissao;  // Total Gasto Real

    const valorContrato = cache + totalCobrado;
    const lucro         = totalCobrado - totalGasto;          // = totalCobradoFisico - totalGastoFisico
    const valorLiquido  = cache + lucro;

    return { totalCobrado, totalGasto, totalCobradoFisico, totalGastoFisico, valorContrato, lucro, valorLiquido, cache, nf, comissao };
};

// ─── Formulário: criar / editar ───────────────────────────────────────────────

Pages.renderPrestacaoForm = async function(id, presetArtistaId) {
    const pageContent = document.getElementById('pageContent');
    pageContent.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';

    try {
        // Reiniciar counter de IDs para esta abertura do formulário
        Pages._pcRowIdx = 0;

        // Normalizar id: 'null' (string) → null
        if (id === 'null' || id === '') id = null;

        // Dados existentes ou defaults
        let pc = id ? await PrestacaoDB.buscarPorId(id) : null;
        let despesas = id ? await PrestacaoDB.listarDespesas(id) : [];
        let checklist = id ? await PrestacaoDB.listarChecklist(id) : [];

        // Artistas disponíveis para seleção (admin vê todos, gestor vê os permitidos)
        const artistas = await ArtistasDB.listar();
        // Prioridade: artista já salvo > passado como param > selecionado no dropdown > primeiro da lista
        const selectedGlobal = Auth.getSelectedArtistaId ? Auth.getSelectedArtistaId() : (Auth.selectedArtistaId || 'todos');
        const artistaId = pc?.artista_id
            || presetArtistaId
            || (selectedGlobal !== 'todos' ? selectedGlobal : null)
            || (artistas.length ? artistas[0].id : '');

        // Se não há despesas salvas ainda, pré-carregar categorias padrão (zeradas)
        if (!despesas.length) {
            despesas = CATEGORIAS_PADRAO.map((cat, i) => ({
                id: null, categoria_nome: cat, tipo: 'padrao',
                valor_cobrado: 0, valor_gasto: 0, ordem: i
            }));
        }

        // Se não há checklist salvo, pré-carregar padrão
        if (!checklist.length) {
            checklist = CHECKLIST_PADRAO.map(it => ({
                id: null,
                item_nome: it.nome,
                responsabilidade: it.resp,
                status: 'pendente'
            }));
        }

        pageContent.innerHTML = `
            <div class="prestacao-form-container">

                <!-- Cabeçalho -->
                <div class="page-header flex-between mb-3">
                    <div>
                        <button class="btn-secondary btn-sm" onclick="Pages.renderPrestacao('${artistaId || ''}')">
                            <i class="fas fa-arrow-left"></i> Voltar
                        </button>
                        <h2 style="margin-top:0.5rem">
                            ${id ? '<i class="fas fa-edit"></i> Editar Fechamento' : '<i class="fas fa-plus-circle"></i> Novo Fechamento'}
                        </h2>
                    </div>
                    <div style="display:flex;gap:8px">
                        <button class="btn-secondary" onclick="Pages.salvarPrestacao(${id ? `'${id}'` : 'null'}, '${artistaId || ''}')">
                            <i class="fas fa-save"></i> Salvar
                        </button>
                        ${id ? `<button class="btn-secondary" onclick="Pages.gerarPdfPrestacao('${id}')">
                            <i class="fas fa-file-pdf"></i> PDF
                        </button>` : ''}
                    </div>
                </div>

                <!-- Informações Gerais -->
                <div class="card mb-3">
                    <div class="card-header"><h3><i class="fas fa-info-circle"></i> Informações do Show</h3></div>
                    <div class="card-body">
                        <div class="grid grid-3" style="gap:1rem">
                            <div class="form-group">
                                <label>Artista *</label>
                                <select id="pc_artista_id" class="form-control" required>
                                    <option value="">Selecionar...</option>
                                    ${artistas.map(a =>
                                        `<option value="${a.id}" ${a.id === artistaId ? 'selected' : ''}>${a.nome}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Nome do Evento / Show *</label>
                                <input type="text" id="pc_evento_nome" class="form-control" placeholder="Ex: Show Forró do Dino"
                                    value="${pc?.evento_nome || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>Cidade</label>
                                <input type="text" id="pc_cidade" class="form-control" placeholder="Ex: Dores de Campos - MG"
                                    value="${pc?.cidade || ''}">
                            </div>
                            <div class="form-group">
                                <label>Data do Show</label>
                                <input type="date" id="pc_data_show" class="form-control"
                                    value="${pc?.data_show || ''}">
                            </div>
                            <div class="form-group">
                                <label>Cachê do Artista (R$)</label>
                                <input type="number" id="pc_cache" class="form-control" min="0" step="0.01"
                                    value="${pc?.cache_artista || 0}" oninput="Pages._atualizarResumo()">
                            </div>
                            <div class="form-group">
                                <label>Status</label>
                                <select id="pc_status" class="form-control">
                                    <option value="rascunho" ${(!pc || pc.status==='rascunho') ? 'selected' : ''}>Rascunho</option>
                                    <option value="fechado"  ${pc?.status==='fechado'  ? 'selected' : ''}>Fechado</option>
                                    <option value="aprovado" ${pc?.status==='aprovado' ? 'selected' : ''}>Aprovado</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group mt-2">
                            <label>Observações</label>
                            <textarea id="pc_observacoes" class="form-control" rows="2"
                                placeholder="Informações adicionais sobre o show...">${pc?.observacoes || ''}</textarea>
                        </div>
                    </div>
                </div>

                <!-- Despesas -->
                <div class="card mb-3">
                    <div class="card-header flex-between">
                        <h3><i class="fas fa-list-ul"></i> Despesas do Show</h3>
                        <button class="btn-secondary btn-sm" onclick="Pages._adicionarLinhaDespesa()">
                            <i class="fas fa-plus"></i> Adicionar Item Extra
                        </button>
                    </div>
                    <div class="card-body" style="padding:0">
                        <table class="data-table" id="tabelaDespesas">
                            <thead>
                                <tr>
                                    <th style="width:27%">Categoria</th>
                                    <th style="width:17%">Valor Cobrado (R$)</th>
                                    <th style="width:17%">Valor Gasto (R$)</th>
                                    <th style="width:10%">Lucro</th>
                                    <th style="width:23%">Responsável</th>
                                    <th style="width:6%"></th>
                                </tr>
                            </thead>
                            <tbody id="despesasBody">
                                ${despesas.map((d, i) => Pages._htmlLinhaDespesa(d, i)).join('')}
                                <!-- NF — pass-through: cobrado = gasto, lucro = 0 -->
                                <tr class="pc-desp-row pc-desp-special" data-tipo="nf">
                                    <td class="pc-desp-cat-cell">
                                        <div class="pc-desp-cat-fixed">
                                            <i class="fas fa-file-invoice pc-cat-icon" style="color:#3b82f6"></i>
                                            <span class="pc-cat-nome">NF (Nota Fiscal)</span>
                                        </div>
                                    </td>
                                    <td class="pc-desp-val-cell">
                                        <div class="pc-val-wrap">
                                            <span class="pc-val-prefix">R$</span>
                                            <input type="number" id="pc_nf" class="pc-input pc-val-input" min="0" step="0.01"
                                                value="${pc?.nf_valor || 0}"
                                                oninput="document.getElementById('pc_nf_gasto').value=this.value; Pages._atualizarResumo()">
                                        </div>
                                    </td>
                                    <td class="pc-desp-val-cell">
                                        <div class="pc-val-wrap">
                                            <span class="pc-val-prefix">R$</span>
                                            <input type="number" id="pc_nf_gasto" class="pc-input pc-val-input" min="0" step="0.01"
                                                value="${pc?.nf_valor || 0}" readonly style="opacity:0.55;cursor:not-allowed">
                                        </div>
                                    </td>
                                    <td class="pc-desp-lucro-cell">
                                        <span class="pc-lucro-badge pc-lucro-pos">R$ 0,00</span>
                                    </td>
                                    <td class="pc-desp-resp-cell">
                                        <select class="pc-select desp-responsavel">
                                            <option value="contratante" selected>🏢 Contratante</option>
                                            <option value="artista">🎤 Artista</option>
                                        </select>
                                    </td>
                                    <td class="pc-desp-action-cell">
                                        <button class="pc-btn-remove" onclick="Pages._removerLinha(this)" title="Remover">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </td>
                                </tr>
                                <!-- Comissão — pass-through: cobrado = gasto, lucro = 0 -->
                                <tr class="pc-desp-row pc-desp-special" data-tipo="comissao">
                                    <td class="pc-desp-cat-cell">
                                        <div class="pc-desp-cat-fixed">
                                            <i class="fas fa-percent pc-cat-icon" style="color:#8b5cf6"></i>
                                            <span class="pc-cat-nome">Comissão</span>
                                        </div>
                                    </td>
                                    <td class="pc-desp-val-cell">
                                        <div class="pc-val-wrap">
                                            <span class="pc-val-prefix">R$</span>
                                            <input type="number" id="pc_comissao" class="pc-input pc-val-input" min="0" step="0.01"
                                                value="${pc?.comissao_valor || 0}"
                                                oninput="document.getElementById('pc_comissao_gasto').value=this.value; Pages._atualizarResumo()">
                                        </div>
                                    </td>
                                    <td class="pc-desp-val-cell">
                                        <div class="pc-val-wrap">
                                            <span class="pc-val-prefix">R$</span>
                                            <input type="number" id="pc_comissao_gasto" class="pc-input pc-val-input" min="0" step="0.01"
                                                value="${pc?.comissao_valor || 0}" readonly style="opacity:0.55;cursor:not-allowed">
                                        </div>
                                    </td>
                                    <td class="pc-desp-lucro-cell">
                                        <span class="pc-lucro-badge pc-lucro-pos">R$ 0,00</span>
                                    </td>
                                    <td class="pc-desp-resp-cell">
                                        <select class="pc-select desp-responsavel">
                                            <option value="contratante" selected>🏢 Contratante</option>
                                            <option value="artista">🎤 Artista</option>
                                        </select>
                                    </td>
                                    <td class="pc-desp-action-cell">
                                        <button class="pc-btn-remove" onclick="Pages._removerLinha(this)" title="Remover">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Resumo Financeiro -->
                <div class="card mb-3" id="resumoCard">
                    <div class="card-header"><h3><i class="fas fa-calculator"></i> Resumo Financeiro</h3></div>
                    <div class="card-body" id="resumoBody">
                        ${Pages._htmlResumo({ totalCobrado:0, totalGasto:0, valorContrato:0, lucro:0, valorLiquido:0,
                            cache: parseFloat(pc?.cache_artista||0), nf:parseFloat(pc?.nf_valor||0), comissao:parseFloat(pc?.comissao_valor||0) })}
                    </div>
                </div>

                <!-- Checklist Contratante -->
                <div class="card mb-3">
                    <div class="card-header flex-between">
                        <h3><i class="fas fa-clipboard-check"></i> Checklist do Contratante</h3>
                        <button class="btn-secondary btn-sm" onclick="Pages._adicionarLinhaChecklist()">
                            <i class="fas fa-plus"></i> Adicionar Item
                        </button>
                    </div>
                    <div class="card-body" style="padding:0">
                        <table class="data-table" id="tabelaChecklist">
                            <thead>
                                <tr>
                                    <th style="width:50%">Item</th>
                                    <th style="width:25%">Responsável</th>
                                    <th style="width:20%">Status</th>
                                    <th style="width:5%"></th>
                                </tr>
                            </thead>
                            <tbody id="checklistBody">
                                ${checklist.map((c, i) => Pages._htmlLinhaChecklist(c, i)).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Botões finais -->
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:2rem">
                    <button class="btn-secondary" onclick="Pages.renderPrestacao('${artistaId || ''}')">Cancelar</button>
                    <button class="btn-primary" onclick="Pages.salvarPrestacao(${id ? `'${id}'` : 'null'}, '${artistaId || ''}')">
                        <i class="fas fa-save"></i> Salvar Fechamento
                    </button>
                </div>

            </div>
        `;

        // Calcular resumo inicial
        Pages._atualizarResumo();

    } catch (err) {
        console.error('[Prestacao Form]', err);
        pageContent.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Erro: ${err.message}</div>`;
    }
};

// ─── Helpers de linha ─────────────────────────────────────────────────────────

Pages._htmlLinhaDespesa = function(d, i) {
    const uid = (i !== undefined && i !== null) ? i : (++Pages._pcRowIdx);
    const lucroLinha = (parseFloat(d.valor_cobrado) || 0) - (parseFloat(d.valor_gasto) || 0);
    const lucroClass = lucroLinha >= 0 ? 'pc-lucro-pos' : 'pc-lucro-neg';
    const nomeEscapado = (d.categoria_nome || '').replace(/"/g, '&quot;');
    const icone = CATEGORIA_ICONS[d.categoria_nome] || 'fa-tag';
    const resp = d.responsavel || 'contratante';
    return `
        <tr id="desp-row-${uid}" data-tipo="${d.tipo || 'padrao'}" class="pc-desp-row">
            <td class="pc-desp-cat-cell">
                <div class="pc-desp-cat-custom">
                    <i class="fas ${icone} pc-cat-icon"></i>
                    <input type="text" class="pc-input desp-nome" value="${nomeEscapado}" placeholder="Nome da despesa">
                </div>
            </td>
            <td class="pc-desp-val-cell">
                <div class="pc-val-wrap">
                    <span class="pc-val-prefix">R$</span>
                    <input type="number" class="pc-input pc-val-input desp-cobrado" min="0" step="0.01"
                        value="${parseFloat(d.valor_cobrado) || 0}" oninput="Pages._atualizarResumo()">
                </div>
            </td>
            <td class="pc-desp-val-cell">
                <div class="pc-val-wrap">
                    <span class="pc-val-prefix">R$</span>
                    <input type="number" class="pc-input pc-val-input desp-gasto" min="0" step="0.01"
                        value="${parseFloat(d.valor_gasto) || 0}" oninput="Pages._atualizarResumo()">
                </div>
            </td>
            <td class="pc-desp-lucro-cell">
                <span class="desp-lucro pc-lucro-badge ${lucroClass}">
                    ${Utils.formatCurrency(lucroLinha)}
                </span>
            </td>
            <td class="pc-desp-resp-cell">
                <select class="pc-select desp-responsavel">
                    <option value="contratante" ${resp === 'contratante' ? 'selected' : ''}>🏢 Contratante</option>
                    <option value="artista"     ${resp === 'artista'     ? 'selected' : ''}>🎤 Artista</option>
                </select>
            </td>
            <td class="pc-desp-action-cell">
                <button class="pc-btn-remove" onclick="Pages._removerLinha(this)" title="Remover">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        </tr>`;
};

Pages._htmlLinhaChecklist = function(c, i) {
    const uid = (i !== undefined && i !== null) ? i : (++Pages._pcRowIdx);
    const nomeEscapado = (c.item_nome || '').replace(/"/g, '&quot;');
    const statusIcon = { 'ok': 'fa-check-circle', 'pendente': 'fa-clock', 'nao_se_aplica': 'fa-minus-circle' };
    return `
        <tr id="check-row-${uid}" class="pc-check-row">
            <td class="pc-check-nome-cell">
                <div class="pc-check-nome-wrap">
                    <i class="fas fa-clipboard-check pc-check-icon"></i>
                    <input type="text" class="pc-input check-nome"
                        value="${nomeEscapado}" placeholder="Nome do item">
                </div>
            </td>
            <td class="pc-check-resp-cell">
                <select class="pc-select check-resp">
                    <option value="contratante" ${c.responsabilidade==='contratante' ? 'selected' : ''}>🎪 Contratante</option>
                    <option value="artista"     ${c.responsabilidade==='artista'     ? 'selected' : ''}>🎤 Artista</option>
                </select>
            </td>
            <td class="pc-check-status-cell">
                <select class="pc-select check-status pc-status-select">
                    <option value="pendente"      ${(c.status||'pendente')==='pendente'      ? 'selected' : ''}>⏳ Pendente</option>
                    <option value="ok"            ${c.status==='ok'                           ? 'selected' : ''}>✅ Concluído</option>
                    <option value="nao_se_aplica" ${c.status==='nao_se_aplica'                ? 'selected' : ''}>— Não se aplica</option>
                </select>
            </td>
            <td class="pc-desp-action-cell">
                <button class="pc-btn-remove" onclick="Pages._removerLinha(this)" title="Remover">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        </tr>`;
};

Pages._htmlResumo = function(t) {
    const fmt = v => Utils.formatCurrency(v);
    const lucroColor = t.lucro >= 0 ? '#22c55e' : '#ef4444';
    return `
        <div class="grid grid-3" style="gap:1rem">

            <div style="background:var(--bg-secondary);border-radius:8px;padding:1rem">
                <p class="text-muted" style="margin:0 0 0.5rem">Despesas Cobradas</p>
                <table style="width:100%;font-size:0.9rem">
                    <tr><td>Despesas (físicas)</td><td align="right"><strong>${fmt(t.totalCobradoFisico||0)}</strong></td></tr>
                    <tr><td>NF</td>               <td align="right"><strong>${fmt(t.nf)}</strong></td></tr>
                    <tr><td>Comissão</td>          <td align="right"><strong>${fmt(t.comissao)}</strong></td></tr>
                    <tr style="border-top:1px solid var(--border-color)"><td><strong>Total Cobrado</strong></td>
                        <td align="right"><strong style="color:#3b82f6">${fmt(t.totalCobrado)}</strong></td></tr>
                </table>
            </div>

            <div style="background:var(--bg-secondary);border-radius:8px;padding:1rem">
                <p class="text-muted" style="margin:0 0 0.5rem">Despesas Gastas</p>
                <table style="width:100%;font-size:0.9rem">
                    <tr><td>Despesas (físicas)</td><td align="right"><strong>${fmt(t.totalGastoFisico||0)}</strong></td></tr>
                    <tr><td>NF</td>               <td align="right"><strong>${fmt(t.nf)}</strong></td></tr>
                    <tr><td>Comissão</td>          <td align="right"><strong>${fmt(t.comissao)}</strong></td></tr>
                    <tr style="border-top:1px solid var(--border-color)"><td><strong>Total Gasto</strong></td>
                        <td align="right"><strong style="color:#ef4444">${fmt(t.totalGasto)}</strong></td></tr>
                </table>
            </div>

            <div style="background:var(--bg-secondary);border-radius:8px;padding:1rem">
                <p class="text-muted" style="margin:0 0 0.5rem">Resultado</p>
                <table style="width:100%;font-size:0.9rem">
                    <tr><td>Cachê Artista</td>    <td align="right"><strong>${fmt(t.cache)}</strong></td></tr>
                    <tr><td>Total Cobrado</td>     <td align="right"><strong>${fmt(t.totalCobrado)}</strong></td></tr>
                    <tr style="border-top:1px solid var(--border-color)">
                        <td><strong>Valor Contrato</strong></td>
                        <td align="right"><strong style="color:#3b82f6;font-size:1.05rem">${fmt(t.valorContrato)}</strong></td>
                    </tr>
                    <tr><td>Lucro Operacional</td><td align="right">
                        <strong style="color:${lucroColor}">${fmt(t.lucro)}</strong></td></tr>
                    <tr style="border-top:2px solid var(--primary);margin-top:4px">
                        <td><strong style="font-size:1rem">Líquido Artista</strong></td>
                        <td align="right">
                            <strong style="color:var(--primary);font-size:1.1rem">${fmt(t.valorLiquido)}</strong>
                        </td>
                    </tr>
                </table>
            </div>

        </div>`;
};

// ─── Interação no formulário ──────────────────────────────────────────────────

Pages._adicionarLinhaDespesa = function() {
    const tbody = document.getElementById('despesasBody');
    if (!tbody) { console.error('[Prestacao] despesasBody não encontrado'); return; }
    const uid = ++Pages._pcRowIdx;
    const novaLinha = Pages._htmlLinhaDespesa({
        categoria_nome: '', tipo: 'personalizado', valor_cobrado: 0, valor_gasto: 0
    }, uid);
    // Inserir antes da linha NF para manter Outros + extras acima de NF/Comissão
    const nfRow = tbody.querySelector('tr[data-tipo="nf"]');
    if (nfRow) {
        nfRow.insertAdjacentHTML('beforebegin', novaLinha);
    } else {
        tbody.insertAdjacentHTML('beforeend', novaLinha);
    }
    const novaLinhaTr = document.getElementById(`desp-row-${uid}`);
    if (novaLinhaTr) novaLinhaTr.querySelector('.desp-nome')?.focus();
    Pages._atualizarResumo();
};

Pages._adicionarLinhaChecklist = function() {
    const tbody = document.getElementById('checklistBody');
    if (!tbody) { console.error('[Prestacao] checklistBody não encontrado'); return; }
    // Gerar UID único incrementando o contador global
    const uid = ++Pages._pcRowIdx;
    const novaLinha = Pages._htmlLinhaChecklist({ item_nome: '', responsabilidade: 'contratante', status: 'pendente' }, uid);
    tbody.insertAdjacentHTML('beforeend', novaLinha);
    // Focar no input do novo item
    const novaLinhaTr = document.getElementById(`check-row-${uid}`);
    if (novaLinhaTr) novaLinhaTr.querySelector('.check-nome')?.focus();
};

// Função unificada de remoção — recebe o botão clicado e sobe até o <tr>
Pages._removerLinha = function(btn) {
    const row = btn.closest('tr');
    if (row) {
        row.remove();
        // Recalcular resumo se for linha de despesa
        if (document.getElementById('despesasBody')) Pages._atualizarResumo();
    }
};

// Manter compatibilidade com chamadas antigas (por índice) — agora não utilizadas mas não quebram
Pages._removerLinhaDespesa = function(i) {
    const row = document.getElementById(`desp-row-${i}`);
    if (row) { row.remove(); Pages._atualizarResumo(); }
};
Pages._removerLinhaChecklist = function(i) {
    const row = document.getElementById(`check-row-${i}`);
    if (row) row.remove();
};

Pages._lerDespesasDoForm = function() {
    const rows = document.querySelectorAll('#despesasBody tr');
    const itens = [];
    rows.forEach(row => {
        const tipo = row.dataset.tipo || 'padrao';
        // Ignorar linhas especiais de NF e Comissão — não são despesas normais
        if (tipo === 'nf' || tipo === 'comissao') return;
        const nomeEl     = row.querySelector('.desp-nome');
        const cobradoEl  = row.querySelector('.desp-cobrado');
        const gastoEl    = row.querySelector('.desp-gasto');
        const respEl     = row.querySelector('.desp-responsavel');
        const nomeFixoEl = row.querySelector('span');
        const nome       = nomeEl ? nomeEl.value.trim() : (nomeFixoEl ? nomeFixoEl.textContent.trim() : '');
        const cobrado    = parseFloat(cobradoEl?.value) || 0;
        const gasto      = parseFloat(gastoEl?.value)   || 0;
        const responsavel = respEl?.value || 'contratante';
        if (nome) itens.push({ categoria_nome: nome, tipo, valor_cobrado: cobrado, valor_gasto: gasto, responsavel });
    });
    return itens;
};

Pages._lerChecklistDoForm = function() {
    const rows = document.querySelectorAll('#checklistBody tr');
    const itens = [];
    rows.forEach(row => {
        const nome  = row.querySelector('.check-nome')?.value?.trim();
        const resp  = row.querySelector('.check-resp')?.value  || 'contratante';
        const stat  = row.querySelector('.check-status')?.value || 'pendente';
        if (nome) itens.push({ item_nome: nome, responsabilidade: resp, status: stat });
    });
    return itens;
};

Pages._atualizarResumo = function() {
    const cache    = parseFloat(document.getElementById('pc_cache')?.value)    || 0;
    const nf       = parseFloat(document.getElementById('pc_nf')?.value)       || 0;
    const comissao = parseFloat(document.getElementById('pc_comissao')?.value) || 0;

    const despesas = Pages._lerDespesasDoForm();

    // Atualizar lucro por linha
    document.querySelectorAll('#despesasBody tr').forEach((row, i) => {
        const cobEl  = row.querySelector('.desp-cobrado');
        const gasEl  = row.querySelector('.desp-gasto');
        const lucEl  = row.querySelector('.desp-lucro');
        if (!cobEl || !gasEl || !lucEl) return;
        const luc = (parseFloat(cobEl.value) || 0) - (parseFloat(gasEl.value) || 0);
        lucEl.textContent = Utils.formatCurrency(luc);
        lucEl.style.color = luc >= 0 ? '#22c55e' : '#ef4444';
    });

    const pc = { cache_artista: cache, nf_valor: nf, comissao_valor: comissao };
    const totais = Pages._calcularTotais(pc, despesas);
    totais.cache = cache;

    const resumoBody = document.getElementById('resumoBody');
    if (resumoBody) resumoBody.innerHTML = Pages._htmlResumo(totais);
};

// ─── Salvar ───────────────────────────────────────────────────────────────────

Pages.salvarPrestacao = async function(id, presetArtistaId) {
    try {
        const artistaId = document.getElementById('pc_artista_id')?.value || presetArtistaId;
        const eventoNome = document.getElementById('pc_evento_nome')?.value?.trim();
        if (!artistaId) { Utils.showToast('Selecione o artista', 'error'); return; }
        if (!eventoNome) { Utils.showToast('Informe o nome do evento', 'error'); return; }

        // Normalizar id: 'null' (string do onclick) ou falsy → undefined
        const idLimpo = (id && id !== 'null') ? id : undefined;

        const dados = {
            id:             idLimpo,
            artista_id:     artistaId,
            escritorio_id:  Auth.currentUser?.escritorio_id || null,
            evento_nome:    eventoNome,
            cidade:         document.getElementById('pc_cidade')?.value?.trim()   || '',
            data_show:      document.getElementById('pc_data_show')?.value        || null,
            cache_artista:  parseFloat(document.getElementById('pc_cache')?.value)    || 0,
            nf_valor:       parseFloat(document.getElementById('pc_nf')?.value)       || 0,
            comissao_valor: parseFloat(document.getElementById('pc_comissao')?.value) || 0,
            status:         document.getElementById('pc_status')?.value           || 'rascunho',
            observacoes:    document.getElementById('pc_observacoes')?.value?.trim() || ''
        };

        if (!dados.id) delete dados.id;

        const saved = await PrestacaoDB.salvar(dados);
        const despesas  = Pages._lerDespesasDoForm();
        const checklist = Pages._lerChecklistDoForm();
        await PrestacaoDB.salvarDespesas(saved.id, despesas);
        await PrestacaoDB.salvarChecklist(saved.id, checklist);

        Utils.showToast('Fechamento salvo com sucesso!', 'success');
        Pages.renderPrestacaoForm(saved.id, artistaId);

    } catch (err) {
        console.error('[Prestacao Salvar]', err);
        Utils.showToast('Erro ao salvar: ' + err.message, 'error');
    }
};

// ─── Excluir ──────────────────────────────────────────────────────────────────

Pages.confirmarExcluirPrestacao = function(id, artistaId) {
    if (!confirm('Excluir este fechamento? Esta ação não pode ser desfeita.')) return;
    PrestacaoDB.excluir(id)
        .then(() => { Utils.showToast('Excluído com sucesso', 'success'); Pages.renderPrestacao(artistaId || null); })
        .catch(err => Utils.showToast('Erro ao excluir: ' + err.message, 'error'));
};

// ─── PDF ──────────────────────────────────────────────────────────────────────

Pages.gerarPdfPrestacao = async function(id) {
    try {
        const pc       = await PrestacaoDB.buscarPorId(id);
        const despesas = await PrestacaoDB.listarDespesas(id);
        const checklist= await PrestacaoDB.listarChecklist(id);
        const artistas = await ArtistasDB.listar();
        const artista  = artistas.find(a => a.id === pc.artista_id);
        const totais   = Pages._calcularTotais(pc, despesas);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const fmt = v => 'R$ ' + parseFloat(v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

        let y = 20;
        const L = 14; // left margin

        // Cabeçalho
        doc.setFillColor(79, 70, 229); // indigo
        doc.rect(0, 0, 210, 14, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('GIBSON MANAGER PRO — PRESTAÇÃO DE CONTAS', L, 10);
        doc.setTextColor(0, 0, 0);

        y = 24;
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(`${artista?.nome || 'Artista'} — ${pc.evento_nome || ''}`, L, y);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        y += 6;
        doc.text(`Cidade: ${pc.cidade || '—'}    Data: ${pc.data_show ? new Date(pc.data_show + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}    Status: ${pc.status}`, L, y);

        y += 10;

        // Despesas
        doc.setFont('helvetica', 'bold');
        doc.text('DESPESAS DO SHOW', L, y);
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        // Cabeçalho tabela
        doc.setFillColor(240, 240, 250);
        doc.rect(L, y - 4, 182, 6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('Categoria',      L,   y);
        doc.text('Cobrado',       120,   y);
        doc.text('Gasto',         150,   y);
        doc.text('Lucro',         175,   y);
        doc.setFont('helvetica', 'normal');
        y += 6;

        despesas.forEach(d => {
            const luc = (d.valor_cobrado || 0) - (d.valor_gasto || 0);
            if ((d.valor_cobrado || 0) === 0 && (d.valor_gasto || 0) === 0) return;
            doc.text(d.categoria_nome, L, y);
            doc.text(fmt(d.valor_cobrado), 120, y);
            doc.text(fmt(d.valor_gasto),   150, y);
            doc.setTextColor(luc >= 0 ? 34 : 239, luc >= 0 ? 197 : 68, luc >= 0 ? 94 : 68);
            doc.text(fmt(luc),             175, y);
            doc.setTextColor(0, 0, 0);
            y += 6;
            if (y > 270) { doc.addPage(); y = 20; }
        });

        // NF e Comissão
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.text('NF (Nota Fiscal)',    L,   y);
        doc.text(fmt(pc.nf_valor),      120, y);
        doc.text(fmt(pc.nf_valor),      150, y);
        doc.text(fmt(0),                175, y);
        y += 6;
        doc.text('Comissão',            L,   y);
        doc.text(fmt(pc.comissao_valor), 120, y);
        doc.text(fmt(pc.comissao_valor), 150, y);
        doc.text(fmt(0),                 175, y);
        doc.setFont('helvetica', 'normal');
        y += 10;

        // Linha divisória
        doc.setDrawColor(200, 200, 200);
        doc.line(L, y, 196, y);
        y += 8;

        // Resumo financeiro
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('RESUMO FINANCEIRO', L, y);
        y += 7;
        doc.setFont('helvetica', 'normal');

        const resumoLinhas = [
            ['Total Cobrado Despesas', fmt(totais.totalCobrado)],
            ['Total Gasto Real',       fmt(totais.totalGasto)],
            ['Cachê Artista',          fmt(totais.cache)],
            ['Valor do Contrato',      fmt(totais.valorContrato)],
            ['Lucro Operacional',      fmt(totais.lucro)],
            ['VALOR LÍQUIDO ARTISTA',  fmt(totais.valorLiquido)],
        ];

        resumoLinhas.forEach(([label, val], i) => {
            const isLast = i === resumoLinhas.length - 1;
            if (isLast) {
                doc.setFillColor(79, 70, 229);
                doc.rect(L, y - 5, 182, 7, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
            }
            doc.text(label, L + 2, y);
            doc.text(val,   175, y, { align: 'right' });
            if (isLast) { doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal'); }
            y += 8;
        });

        // Checklist
        if (checklist.length) {
            y += 4;
            if (y > 250) { doc.addPage(); y = 20; }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('CHECKLIST DO CONTRATANTE', L, y);
            y += 7;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            checklist.forEach(c => {
                const icon = c.status === 'ok' ? '✓' : c.status === 'nao_se_aplica' ? '—' : '○';
                doc.text(`${icon}  ${c.item_nome}  (${c.responsabilidade})  [${c.status}]`, L, y);
                y += 6;
                if (y > 280) { doc.addPage(); y = 20; }
            });
        }

        // Observações
        if (pc.observacoes) {
            y += 4;
            doc.setFont('helvetica', 'bold');
            doc.text('Observações:', L, y);
            doc.setFont('helvetica', 'normal');
            y += 6;
            const lines = doc.splitTextToSize(pc.observacoes, 182);
            lines.forEach(l => { doc.text(l, L, y); y += 5; });
        }

        // Rodapé
        const now = new Date().toLocaleString('pt-BR');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Gerado em ${now} — Gibson Manager Pro`, L, 290);

        doc.save(`prestacao-${(artista?.nome||'artista').replace(/\s+/g,'-')}-${pc.evento_nome||id}.pdf`);
        Utils.showToast('PDF gerado com sucesso!', 'success');

    } catch (err) {
        console.error('[Prestacao PDF]', err);
        Utils.showToast('Erro ao gerar PDF: ' + err.message, 'error');
    }
};
