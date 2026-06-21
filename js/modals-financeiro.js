/* ========================================
   GIBSON MANAGER PRO - MODAIS FINANCEIROS
   Receita, Despesa e Modelo de Despesa
======================================== */

// ---- MODAL RECEITA ----
Modals.showReceitaModal = function(receitaId = null) {
    const cats = CATEGORIAS_RECEITA.map(c =>
        `<option value="${c.id}">${c.nome}</option>`).join('');

    const html = `
    <div class="modal-overlay" onclick="if(event.target===this)Modals.close()">
        <div class="modal" style="max-width:480px;">
            <div class="modal-header" style="background:linear-gradient(135deg,#0d0d0d,#001a0a);">
                <h3 class="modal-title" style="color:#10B981;">
                    <i class="fas fa-arrow-up"></i> Nova Receita
                </h3>
                <button class="modal-close" onclick="Modals.close()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Descrição *</label>
                    <input type="text" id="rec_desc" placeholder="Ex: Patrocínio Marca X" required>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Categoria *</label>
                        <select id="rec_cat">${cats}</select>
                    </div>
                    <div class="form-group">
                        <label>Valor (R$) *</label>
                        <input type="number" id="rec_valor" min="0" step="0.01" placeholder="0,00">
                    </div>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Data de Recebimento *</label>
                        <input type="date" id="rec_data" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select id="rec_status">
                            <option value="Pendente">Pendente</option>
                            <option value="Recebido">Recebido</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Observações</label>
                    <textarea id="rec_obs" rows="2" placeholder="Detalhes adicionais..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="Modals.close()">Cancelar</button>
                <button class="btn-primary" style="background:#10B981;border-color:#10B981;" onclick="Modals.salvarReceita()">
                    <i class="fas fa-save"></i> Salvar Receita
                </button>
            </div>
        </div>
    </div>`;
    this.container.innerHTML = html;
};

Modals.salvarReceita = async function() {
    const desc  = document.getElementById('rec_desc')?.value?.trim();
    const cat   = document.getElementById('rec_cat')?.value;
    const valor = parseFloat(document.getElementById('rec_valor')?.value);
    const data  = document.getElementById('rec_data')?.value;

    if (!desc || !cat || !valor || !data) {
        Utils.showToast('Preencha todos os campos obrigatórios.', 'error');
        return;
    }

    Utils.showLoading();
    const r = await ReceitasDB.criar({
        descricao:        desc,
        categoria:        cat,
        valor,
        data_recebimento: data,
        status:           document.getElementById('rec_status')?.value || 'Pendente',
        observacoes:      document.getElementById('rec_obs')?.value || '',
    });
    Utils.hideLoading();

    if (r) {
        await AuditDB.registrar({ acao: 'CRIAR', modulo: 'financeiro', descricao: `Receita criada: ${desc} — ${Utils.formatCurrency(valor)}` });
        Utils.showToast('Receita salva!', 'success');
        Modals.close();
        Pages.renderGestaoFinanceira();
    } else {
        Utils.showToast('Erro ao salvar receita.', 'error');
    }
};

// ---- MODAL DESPESA ----
Modals.showDespesaModal = async function(despesaId = null) {
    let desp = null;
    if (despesaId) {
        const lista = await DespesasDB.listar();
        desp = lista.find(d => d.id === despesaId);
    }

    const cats = CATEGORIAS_DESPESA.map(c =>
        `<option value="${c.id}" ${desp?.categoria === c.id ? 'selected' : ''}>${c.icon ? '' : ''}${c.nome}</option>`).join('');

    const html = `
    <div class="modal-overlay" onclick="if(event.target===this)Modals.close()">
        <div class="modal" style="max-width:520px;">
            <div class="modal-header" style="background:linear-gradient(135deg,#0d0d0d,#1a0000);">
                <h3 class="modal-title" style="color:#EF4444;">
                    <i class="fas fa-arrow-down"></i> ${despesaId ? 'Editar' : 'Nova'} Despesa
                </h3>
                <button class="modal-close" onclick="Modals.close()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Descrição *</label>
                    <input type="text" id="desp_desc" value="${desp?.descricao||''}" placeholder="Ex: Aluguel escritório Janeiro" required>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Categoria *</label>
                        <select id="desp_cat">${cats}</select>
                    </div>
                    <div class="form-group">
                        <label>Valor (R$) *</label>
                        <input type="number" id="desp_valor" value="${desp?.valor||''}" min="0" step="0.01" placeholder="0,00">
                    </div>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Data de Vencimento *</label>
                        <input type="date" id="desp_venc" value="${desp?.data_vencimento||new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select id="desp_status">
                            <option value="Pendente" ${desp?.status==='Pendente'?'selected':''}>Pendente</option>
                            <option value="Pago"     ${desp?.status==='Pago'?'selected':''}>Pago</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                        <input type="checkbox" id="desp_rec" ${desp?.recorrente?'checked':''} style="width:16px;height:16px;accent-color:var(--red-primary);">
                        É uma despesa recorrente (mensal)?
                    </label>
                </div>
                <div class="form-group">
                    <label>Observações</label>
                    <textarea id="desp_obs" rows="2" placeholder="Detalhes adicionais...">${desp?.observacoes||''}</textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="Modals.close()">Cancelar</button>
                <button class="btn-primary" style="background:#EF4444;border-color:#EF4444;" onclick="Modals.salvarDespesa('${despesaId||''}')">
                    <i class="fas fa-save"></i> Salvar Despesa
                </button>
            </div>
        </div>
    </div>`;
    this.container.innerHTML = html;
};

Modals.salvarDespesa = async function(despesaId) {
    const desc  = document.getElementById('desp_desc')?.value?.trim();
    const cat   = document.getElementById('desp_cat')?.value;
    const valor = parseFloat(document.getElementById('desp_valor')?.value);
    const venc  = document.getElementById('desp_venc')?.value;

    if (!desc || !cat || !valor || !venc) {
        Utils.showToast('Preencha todos os campos obrigatórios.', 'error');
        return;
    }

    const data = {
        descricao:       desc,
        categoria:       cat,
        valor,
        data_vencimento: venc,
        status:          document.getElementById('desp_status')?.value || 'Pendente',
        recorrente:      document.getElementById('desp_rec')?.checked || false,
        observacoes:     document.getElementById('desp_obs')?.value || '',
    };

    Utils.showLoading();
    let r = despesaId ? await DespesasDB.atualizar(despesaId, data) : await DespesasDB.criar(data);

    // Fallback: se falhou, tenta sem campos opcionais que podem não existir no banco
    if (!r) {
        const dataMinima = {
            descricao:       desc,
            categoria:       cat,
            valor,
            data_vencimento: venc,
            status:          document.getElementById('desp_status')?.value || 'Pendente',
        };
        r = despesaId ? await DespesasDB.atualizar(despesaId, dataMinima) : await DespesasDB.criar(dataMinima);
    }
    Utils.hideLoading();

    if (r) {
        await AuditDB.registrar({ acao: despesaId ? 'EDITAR' : 'CRIAR', modulo: 'financeiro', descricao: `Despesa ${despesaId?'editada':'criada'}: ${desc} — ${Utils.formatCurrency(valor)}` });
        Utils.showToast(`Despesa ${despesaId?'atualizada':'salva'}!`, 'success');
        Modals.close();
        Pages.renderGestaoFinanceira();
    } else {
        Utils.showToast('Erro ao salvar despesa.', 'error');
    }
};

// ---- MODAL MODELO DE DESPESA ----
Modals.showModeloModal = function() {
    const cats = CATEGORIAS_DESPESA.map(c =>
        `<option value="${c.id}">${c.nome}</option>`).join('');

    const html = `
    <div class="modal-overlay" onclick="if(event.target===this)Modals.close()">
        <div class="modal" style="max-width:460px;">
            <div class="modal-header" style="background:linear-gradient(135deg,#0d0d0d,#1a0500);">
                <h3 class="modal-title">
                    <i class="fas fa-clone" style="color:var(--red-primary)"></i> Novo Modelo de Despesa
                </h3>
                <button class="modal-close" onclick="Modals.close()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
                    Modelos são despesas recorrentes (aluguel, energia, folha...) que você pode gerar com 1 clique todo mês.
                </p>
                <div class="form-group">
                    <label>Nome do Modelo *</label>
                    <input type="text" id="mod_nome" placeholder="Ex: Aluguel do Escritório">
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Categoria *</label>
                        <select id="mod_cat">${cats}</select>
                    </div>
                    <div class="form-group">
                        <label>Valor Padrão (R$)</label>
                        <input type="number" id="mod_valor" min="0" step="0.01" placeholder="0,00">
                    </div>
                </div>
                <div class="form-group">
                    <label>Dia de Vencimento *</label>
                    <input type="number" id="mod_dia" min="1" max="31" placeholder="Ex: 5 (todo dia 5 do mês)">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="Modals.close()">Cancelar</button>
                <button class="btn-primary" onclick="Modals.salvarModelo()">
                    <i class="fas fa-save"></i> Salvar Modelo
                </button>
            </div>
        </div>
    </div>`;
    this.container.innerHTML = html;
};

Modals.salvarModelo = async function() {
    const nome  = document.getElementById('mod_nome')?.value?.trim();
    const cat   = document.getElementById('mod_cat')?.value;
    const valor = parseFloat(document.getElementById('mod_valor')?.value) || 0;
    const dia   = parseInt(document.getElementById('mod_dia')?.value);

    if (!nome || !cat || !dia) {
        Utils.showToast('Preencha nome, categoria e dia de vencimento.', 'error');
        return;
    }

    Utils.showLoading();
    const r = await ModelosDespesaDB.criar({ nome, categoria: cat, valor, dia_vencimento: dia });
    Utils.hideLoading();

    if (r) {
        Utils.showToast('Modelo criado! Use "Gerar" para criar a despesa do mês.', 'success');
        Modals.close();
        // Recarregar a página atual (Configurações ou Gestão Financeira)
        if (typeof Pages.renderConfiguracoes === 'function' && document.querySelector('.configuracoes-container')) {
            Pages.renderConfiguracoes();
        } else if (typeof Pages.renderGestaoFinanceira === 'function') {
            Pages.renderGestaoFinanceira();
        }
    } else {
        Utils.showToast('Erro ao salvar modelo.', 'error');
    }
};
