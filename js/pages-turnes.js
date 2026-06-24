/* ========================================
   GIBSON MANAGER PRO - CENTRAL DE TURNÊ
   Lógica de Interface Operacional
   ======================================== */

Pages.renderTurnes = async function() {
    document.getElementById('pageContent').innerHTML = 
        '<div class="loading-container"><div class="loading-spinner"></div></div>';

    const [turnes, eventos, artistas] = await Promise.all([
        TurnesDB.listar(true),
        EventosDB.listar(),
        ArtistasDB.listar()
    ]);

    const html = `
        <div class="turnes-container fade-in">
            <div class="turnes-header">
                <div>
                    <h2 style="font-size: 28px; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;">
                        <i class="fas fa-route" style="color: var(--gold-primary);"></i> Central de Turnê
                    </h2>
                    <p style="color: var(--text-muted); font-size: 14px;">Gestão operacional e logística em tempo real</p>
                </div>
            </div>

            <div class="turnes-grid">
                ${turnes.length > 0 ? turnes.sort((a,b) => new Date(a.data_saida) - new Date(b.data_saida)).map(t => {
                    const evento = eventos.find(e => e.id === t.evento_id);
                    const artista = evento ? artistas.find(a => a.id === evento.artista_id) : null;
                    const isActive = t.status !== 'TURNÊ FINALIZADA' && t.status !== 'RETORNO';
                    const progresso = Pages._getProgressoTurne(t.status);

                    return `
                        <div class="turne-card ${isActive ? 'active' : ''}" onclick="Pages.renderTurneDetalhes('${t.id}')">
                            <div class="turne-status-badge">${t.status}</div>
                            <h3 class="turne-title">${artista ? artista.nome : 'Sem Artista'}</h3>
                            <div class="turne-info">
                                <span><i class="fas fa-map-marker-alt"></i> ${evento ? evento.cidade : '—'} ${evento?.local ? '· ' + evento.local : ''}</span>
                                <span><i class="fas fa-calendar-day"></i> Show: ${evento ? Utils.formatDate(evento.data) : '—'}</span>
                                <span><i class="fas fa-clock"></i> Saída: ${t.data_saida ? Utils.formatDate(t.data_saida) : '—'}</span>
                            </div>
                            <div style="margin-top: 16px;">
                                <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:4px">
                                    <span>Progresso</span><span>${progresso}%</span>
                                </div>
                                <div style="height: 5px; background: var(--border-color); border-radius: 3px; overflow: hidden;">
                                    <div style="width: ${progresso}%; height: 100%; background: var(--gold-primary); border-radius: 3px; transition: width 0.4s;"></div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('') : `
                    <div style="grid-column: 1/-1;">
                        <div style="
                            text-align: center;
                            padding: 64px 40px;
                            background: var(--op-card);
                            border-radius: 20px;
                            border: 2px dashed var(--op-border);
                        ">
                            <div style="
                                width: 80px; height: 80px; border-radius: 50%;
                                background: rgba(212,175,55,0.08);
                                display: flex; align-items: center; justify-content: center;
                                margin: 0 auto 20px;
                            ">
                                <i class="fas fa-route" style="font-size: 32px; color: var(--gold-primary);"></i>
                            </div>
                            <h3 style="font-size:18px; font-weight:700; color:var(--text-primary); margin-bottom:8px;">
                                Nenhuma turnê ativa
                            </h3>
                            <p style="color: var(--text-muted); font-size:14px; max-width:340px; margin:0 auto 20px;">
                                As turnês são criadas automaticamente quando um contrato é assinado.
                            </p>
                            <button class="btn-secondary" onclick="Pages.changePage('contratos')">
                                <i class="fas fa-file-contract"></i> Ver Contratos
                            </button>
                        </div>
                    </div>
                `}
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
};

// Detalhes da Turnê - Visão Profunda
Pages.renderTurneDetalhes = async function(id) {
    document.getElementById('pageContent').innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';

    const turne = await TurnesDB.buscarPorId(id);
    if (!turne) return Pages.renderTurnes();

    const evento = await EventosDB.buscarPorId(turne.evento_id);
    const artista = evento ? await ArtistasDB.buscarPorId(evento.artista_id) : null;
    const [equipe, checklist, hospedagem, transporte, despesas, voos, rooming, riders] = await Promise.all([
        TurnesDB.listarEquipe(id),
        TurnesDB.listarChecklist(id),
        TurnesDB.obterHospedagem(id),
        TurnesDB.obterTransporte(id),
        DespesasDB.listarPorEvento(turne.evento_id),
        TurnesDB.listarVoos(id),
        TurnesDB.listarRooming(id),
        TurnesDB.listarRiders(id)
    ]);

    const html = `
        <div class="turnes-container fade-in">
            <button class="btn-secondary" onclick="Pages.renderTurnes()" style="margin-bottom: 20px;">
                <i class="fas fa-arrow-left"></i> Voltar para Central
            </button>

            <div class="turne-details-header">
                <img src="${artista ? artista.foto : ''}" style="width: 100px; height: 100px; border-radius: 16px; object-fit: cover; border: 2px solid var(--gold-primary);">
                <div style="flex: 1;">
                    <div class="turne-status-badge">${turne.status}</div>
                    <h2 style="font-size: 24px; color: #fff; margin: 8px 0;">${artista ? artista.nome : 'Turnê'} — ${evento ? evento.cidade : ''}</h2>
                    <p style="color: var(--text-muted);"><i class="fas fa-calendar"></i> ${evento ? Utils.formatDate(evento.data) : ''} • ${evento ? evento.local : ''}</p>
                </div>
                <div class="turne-main-status">
                    <div style="font-size: 11px; color: var(--gold-primary); text-transform: uppercase; margin-bottom: 8px;">Status Operacional</div>
                    <select onchange="Pages._atualizarStatusTurne('${turne.id}', this.value)" style="background: #000; color: #fff; border: 1px solid var(--gold-primary); padding: 8px; border-radius: 8px; font-weight: 700;">
                        ${['PREPARANDO SAÍDA', 'EQUIPE CONFIRMADA', 'EM DESLOCAMENTO', 'CHEGANDO AO EVENTO', 'PASSAGEM DE SOM', 'SHOW EM ANDAMENTO', 'SHOW FINALIZADO', 'RETORNO', 'TURNÊ FINALIZADA'].map(s => `
                            <option value="${s}" ${turne.status === s ? 'selected' : ''}>${s}</option>
                        `).join('')}
                    </select>
                </div>
            </div>

            <div class="turne-tabs">
                <div class="turne-tab active" onclick="Pages._switchTurneTab('resumo')">Painel</div>
                <div class="turne-tab" onclick="Pages._switchTurneTab('logistica')">Logística</div>
                <div class="turne-tab" onclick="Pages._switchTurneTab('equipe')">Equipe</div>
                <div class="turne-tab" onclick="Pages._switchTurneTab('checklist')">Checklist</div>
                <div class="turne-tab" onclick="Pages._switchTurneTab('riders')">Riders e Docs</div>
                <div class="turne-tab" onclick="Pages._switchTurneTab('financeiro')">Financeiro</div>
                <div class="turne-tab" onclick="Pages._switchTurneTab('chat')">Chat Equipe</div>
            </div>

            <div id="turneTabContent">
                ${this._renderTurneResumo(turne, evento, equipe, checklist, despesas)}
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
    
    // Armazenar dados para troca de abas sem novo fetch pesado
    this._currentTurneData = { turne, evento, artista, equipe, checklist, hospedagem, transporte, despesas, voos, rooming, riders };
};

// Renderizadores de Abas
Pages._renderTurneResumo = function(turne, evento, equipe, checklist, despesas) {
    const totalDespesas = despesas.reduce((acc, d) => acc + (d.valor || 0), 0);
    const concluidoCheck = checklist.filter(c => c.status === 'concluído').length;
    const totalCheck = checklist.length;
    
    return `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
            <div class="turne-section">
                <div class="section-title"><i class="fas fa-chart-line"></i> Resumo Financeiro</div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span>Cachê Bruto:</span>
                    <span style="color: var(--success); font-weight: 700;">${Utils.formatCurrency(evento.cache_bruto || 0)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span>Despesas (Estrada):</span>
                    <span style="color: var(--red-primary); font-weight: 700;">${Utils.formatCurrency(totalDespesas)}</span>
                </div>
                <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.05); margin: 12px 0;">
                <div style="display: flex; justify-content: space-between;">
                    <span>Balanço Operacional:</span>
                    <span style="font-weight: 800; font-size: 18px;">${Utils.formatCurrency((evento.cache_bruto || 0) - totalDespesas)}</span>
                </div>
            </div>

            <div class="turne-section">
                <div class="section-title"><i class="fas fa-tasks"></i> Checklist</div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="flex: 1; height: 10px; background: rgba(255,255,255,0.05); border-radius: 5px; overflow: hidden;">
                        <div style="width: ${totalCheck ? (concluidoCheck/totalCheck)*100 : 0}%; height: 100%; background: var(--gold-primary);"></div>
                    </div>
                    <span style="font-weight: 700;">${concluidoCheck}/${totalCheck}</span>
                </div>
                <p style="color: var(--text-muted); font-size: 12px; margin-top: 10px;">Clique na aba Checklist para atualizar itens.</p>
            </div>

            <div class="turne-section">
                <div class="section-title"><i class="fas fa-users"></i> Equipe</div>
                <div class="equipe-grid">
                    ${equipe.slice(0, 4).map(m => `
                        <div style="display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.02); padding: 8px; border-radius: 8px;">
                            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${m.status_presenca === 'confirmado' ? 'var(--success)' : 'var(--warning)'};"></div>
                            <span style="font-size: 13px;">${m.funcao}</span>
                        </div>
                    `).join('')}
                    ${equipe.length > 4 ? `<div style="text-align: center; font-size: 12px; color: var(--gold-primary);">+ ${equipe.length - 4} membros</div>` : ''}
                </div>
            </div>
        </div>
    `;
};

Pages._renderTurneLogistica = function() {
    const { turne, hospedagem, transporte, voos, rooming } = this._currentTurneData;
    return `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px;">
            <div class="turne-section">
                <div class="section-title"><i class="fas fa-bus"></i> Transporte Terrestre (Van/Ônibus)</div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div class="form-group">
                        <label>Veículo / Van</label>
                        <input type="text" id="log_veiculo" value="${transporte?.veiculo || ''}" placeholder="Ex: Van Master Executiva">
                    </div>
                    <div class="form-group">
                        <label>Motorista / Placa</label>
                        <input type="text" id="log_motorista" value="${transporte?.motorista || ''}" placeholder="Nome e Placa">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div class="form-group">
                            <label>Horário Saída</label>
                            <input type="datetime-local" id="log_saida" value="${transporte?.horario_saida ? transporte.horario_saida.slice(0,16) : ''}">
                        </div>
                        <div class="form-group">
                            <label>Previsão Chegada</label>
                            <input type="datetime-local" id="log_chegada" value="${transporte?.horario_chegada_prevista ? transporte.horario_chegada_prevista.slice(0,16) : ''}">
                        </div>
                    </div>
                    <button class="btn-primary" onclick="Pages._salvarTransporte('${turne.id}')">Salvar Transporte</button>
                </div>
            </div>

            <div class="turne-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <div class="section-title" style="margin-bottom: 0;"><i class="fas fa-plane"></i> Passagens Aéreas (Voos)</div>
                    <button class="btn-primary btn-sm" onclick="Pages._modalAdicionarVoo('${turne.id}')"><i class="fas fa-plus"></i> Add Voo</button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${voos && voos.length > 0 ? voos.map(v => `
                        <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; border: 1px solid var(--op-border);">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <strong style="color: var(--gold-primary);">${v.passageiro}</strong>
                                <span style="font-size: 11px; color: var(--text-muted);">${v.documento || ''}</span>
                            </div>
                            <div style="font-size: 12px; color: #fff;">
                                <div><i class="fas fa-plane-departure" style="color: var(--text-muted);"></i> Ida: ${v.voo_ida || '—'} - ${v.data_hora_ida ? Utils.formatDate(v.data_hora_ida) : '—'}</div>
                                <div><i class="fas fa-plane-arrival" style="color: var(--text-muted);"></i> Volta: ${v.voo_volta || '—'} - ${v.data_hora_volta ? Utils.formatDate(v.data_hora_volta) : '—'}</div>
                            </div>
                            <div style="margin-top: 8px; font-size: 11px; background: #000; padding: 4px; border-radius: 4px; text-align: center;">
                                Localizador: <strong style="letter-spacing: 1px;">${v.localizador || 'PENDENTE'}</strong>
                            </div>
                        </div>
                    `).join('') : '<p style="font-size: 12px; color: var(--text-muted);">Nenhum voo cadastrado.</p>'}
                </div>
            </div>

            <div class="turne-section" style="grid-column: 1 / -1;">
                <div class="section-title"><i class="fas fa-hotel"></i> Hospedagem e Rooming List</div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div class="form-group">
                            <label>Hotel</label>
                            <input type="text" id="hosp_hotel" value="${hospedagem?.hotel || ''}" placeholder="Nome do Hotel">
                        </div>
                        <div class="form-group">
                            <label>Endereço</label>
                            <input type="text" id="hosp_endereco" value="${hospedagem?.endereco || ''}" placeholder="Rua, Número, Bairro">
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div class="form-group">
                                <label>Check-in</label>
                                <input type="datetime-local" id="hosp_checkin" value="${hospedagem?.checkin ? hospedagem.checkin.slice(0,16) : ''}">
                            </div>
                            <div class="form-group">
                                <label>Check-out</label>
                                <input type="datetime-local" id="hosp_checkout" value="${hospedagem?.checkout ? hospedagem.checkout.slice(0,16) : ''}">
                            </div>
                        </div>
                        <button class="btn-primary" onclick="Pages._salvarHospedagem('${turne.id}')">Salvar Hotel</button>
                    </div>

                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <h4 style="font-size: 14px; color: var(--gold-primary);"><i class="fas fa-bed"></i> Divisão de Quartos</h4>
                            <div style="display: flex; gap: 5px;">
                                <button class="btn-secondary btn-sm" onclick="Utils.printRoomingList('${turne.id}')"><i class="fas fa-print"></i> PDF</button>
                                <button class="btn-primary btn-sm" onclick="Pages._modalAdicionarQuarto('${turne.id}')"><i class="fas fa-plus"></i> Quarto</button>
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto;">
                            ${rooming && rooming.length > 0 ? rooming.map(q => `
                                <div style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px; border-left: 3px solid var(--gold-primary);">
                                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
                                        <span>Quarto: <strong>${q.quarto_numero || '—'}</strong></span>
                                        <span>Tipo: ${q.tipo_quarto || 'Padrão'}</span>
                                    </div>
                                    <div style="font-weight: 700; font-size: 13px; color: #fff;">${q.hospede_1}</div>
                                    ${q.hospede_2 ? `<div style="font-weight: 700; font-size: 13px; color: #fff;">${q.hospede_2}</div>` : ''}
                                    ${q.observacoes ? `<div style="font-size: 10px; color: var(--gold-primary); margin-top: 4px; font-style: italic;">Obs: ${q.observacoes}</div>` : ''}
                                </div>
                            `).join('') : '<p style="font-size: 12px; color: var(--text-muted);">Nenhum quarto distribuído (Rooming List vazio).</p>'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

Pages._renderTurneRidersTab = function() {
    const { turne, riders } = this._currentTurneData;
    const content = document.getElementById('turneTabContent');
    
    const riderTecnico = riders?.find(r => r.tipo === 'TECNICO');
    const riderCamarim = riders?.find(r => r.tipo === 'CAMARIM');
    
    content.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <div class="turne-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <div class="section-title" style="margin-bottom: 0;"><i class="fas fa-drum"></i> Rider Técnico e Mapa de Palco</div>
                    <button class="btn-secondary btn-sm" onclick="Utils.printRider('${turne.id}', 'TECNICO')"><i class="fas fa-file-pdf"></i> PDF</button>
                </div>
                <div class="form-group">
                    <label>Exigências Técnicas (Inputs, Backline, etc.)</label>
                    <textarea id="rider_tecnico" rows="10" placeholder="Ex: 1x Bateria Mapex, 2x Amps Marshall, 12 Vias de Input...">${riderTecnico?.itens || ''}</textarea>
                </div>
                <button class="btn-primary" onclick="Pages._salvarRider('${turne.id}', 'TECNICO', '${riderTecnico?.id || ''}')">Salvar Rider Técnico</button>
            </div>

            <div class="turne-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <div class="section-title" style="margin-bottom: 0;"><i class="fas fa-cocktail"></i> Rider de Camarim</div>
                    <button class="btn-secondary btn-sm" onclick="Utils.printRider('${turne.id}', 'CAMARIM')"><i class="fas fa-file-pdf"></i> PDF</button>
                </div>
                <div class="form-group">
                    <label>Alimentação, Bebidas e Estrutura</label>
                    <textarea id="rider_camarim" rows="10" placeholder="Ex: 24 Garrafas de Água, Toalhas Pretas, Frutas...">${riderCamarim?.itens || ''}</textarea>
                </div>
                <button class="btn-primary" onclick="Pages._salvarRider('${turne.id}', 'CAMARIM', '${riderCamarim?.id || ''}')">Salvar Rider Camarim</button>
            </div>
        </div>
    `;
};

// Funções Auxiliares de Navegação Interna
Pages._switchTurneTab = function(tab) {
    const tabs = document.querySelectorAll('.turne-tab');
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    const content = document.getElementById('turneTabContent');
    const d = this._currentTurneData;

    switch(tab) {
        case 'resumo': content.innerHTML = this._renderTurneResumo(d.turne, d.evento, d.equipe, d.checklist, d.despesas); break;
        case 'logistica': content.innerHTML = this._renderTurneLogistica(); break;
        case 'equipe': this._renderTurneEquipeTab(); break;
        case 'checklist': this._renderTurneChecklistTab(); break;
        case 'riders': this._renderTurneRidersTab(); break;
        case 'financeiro': this._renderTurneFinanceiroTab(); break;
        case 'chat': this._renderTurneChatTab(); break;
    }
};

// Implementação das abas de lista (Equipe, Checklist, etc)
Pages._renderTurneEquipeTab = function() {
    const { turne, equipe } = this._currentTurneData;
    const content = document.getElementById('turneTabContent');
    
    content.innerHTML = `
        <div class="turne-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div class="section-title" style="margin-bottom: 0;"><i class="fas fa-users"></i> Equipe da Turnê</div>
                <button class="btn-primary btn-sm" onclick="Pages._modalAdicionarEquipe('${turne.id}')"><i class="fas fa-plus"></i> Adicionar Membro</button>
            </div>
            <div class="equipe-grid">
                ${equipe.length > 0 ? equipe.map(m => `
                    <div class="membro-card">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(m.funcao)}&background=D4AF37&color=000" class="membro-foto">
                        <div style="font-weight: 700; color: #fff;">${m.funcao}</div>
                        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">Status: ${m.status_presenca}</div>
                        <select onchange="Pages._atualizarPresenca('${m.id}', this.value)" style="width: 100%; background: #000; color: #fff; border: 1px solid rgba(255,255,255,0.1); font-size: 12px; padding: 4px;">
                            <option value="pendente" ${m.status_presenca === 'pendente' ? 'selected' : ''}>Pendente</option>
                            <option value="confirmado" ${m.status_presenca === 'confirmado' ? 'selected' : ''}>Confirmado</option>
                            <option value="ausente" ${m.status_presenca === 'ausente' ? 'selected' : ''}>Ausente</option>
                        </select>
                    </div>
                `).join('') : '<p style="text-align: center; color: var(--text-muted);">Nenhum membro adicionado.</p>'}
            </div>
        </div>
    `;
};

Pages._renderTurneChecklistTab = function() {
    const { turne, checklist } = this._currentTurneData;
    const content = document.getElementById('turneTabContent');
    
    // Categorias padrão se o checklist estiver vazio
    const categorias = ['EQUIPAMENTOS', 'ARTISTA', 'LOGÍSTICA'];
    
    content.innerHTML = `
        <div class="turne-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div class="section-title" style="margin-bottom: 0;"><i class="fas fa-tasks"></i> Itens Operacionais</div>
                <button class="btn-primary btn-sm" onclick="Pages._modalAdicionarChecklist('${turne.id}')"><i class="fas fa-plus"></i> Novo Item</button>
            </div>
            
            ${categorias.map(cat => {
                const itens = checklist.filter(c => c.categoria === cat);
                return `
                    <div style="margin-bottom: 24px;">
                        <h4 style="font-size: 13px; color: var(--gold-primary); margin-bottom: 10px;">${cat}</h4>
                        <div style="background: rgba(255,255,255,0.02); border-radius: 8px;">
                            ${itens.length > 0 ? itens.map(item => `
                                <div class="checklist-item ${item.status === 'concluído' ? 'done' : ''}" onclick="Pages._toggleChecklistItem('${item.id}', '${item.status}')">
                                    <div class="checklist-checkbox">
                                        ${item.status === 'concluído' ? '<i class="fas fa-check"></i>' : ''}
                                    </div>
                                    <span>${item.item}</span>
                                </div>
                            `).join('') : '<p style="padding: 12px; font-size: 12px; color: var(--text-muted);">Nenhum item nesta categoria.</p>'}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
};

Pages._renderTurneFinanceiroTab = function() {
    const { despesas } = this._currentTurneData;
    const content = document.getElementById('turneTabContent');
    
    content.innerHTML = `
        <div class="turne-section">
            <div class="section-title"><i class="fas fa-receipt"></i> Despesas da Estrada</div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Categoria</th>
                            <th>Descrição</th>
                            <th>Valor</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${despesas.map(d => `
                            <tr>
                                <td>${Utils.formatDate(d.data_vencimento)}</td>
                                <td>${d.categoria}</td>
                                <td>${d.descricao}</td>
                                <td style="color: var(--red-primary); font-weight: 700;">${Utils.formatCurrency(d.valor)}</td>
                                <td><span class="badge badge-${d.status === 'Pago' ? 'success' : 'warning'}">${d.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

Pages._renderTurneChatTab = async function() {
    const { turne } = this._currentTurneData;
    const content = document.getElementById('turneTabContent');
    
    content.innerHTML = `
        <div class="turne-section">
            <div class="section-title"><i class="fas fa-comments"></i> Chat Operacional</div>
            <div class="chat-container">
                <div class="chat-messages" id="chatMessages">
                    <div style="text-align: center; color: var(--text-muted); font-size: 12px;">Carregando mensagens...</div>
                </div>
                <div style="padding: 16px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; gap: 10px;">
                    <input type="text" id="chatInput" placeholder="Digite uma mensagem para a equipe..." style="flex: 1; background: #000; color: #fff; border: 1px solid var(--op-border); border-radius: 8px; padding: 12px;">
                    <button class="btn-primary" onclick="Pages._enviarMensagemTurne('${turne.id}')">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    this._carregarMensagensChat(turne.id);
};

// Funções de Ação (DB Triggers)
Pages._atualizarStatusTurne = async function(id, novoStatus) {
    const ok = await TurnesDB.atualizar(id, { status: novoStatus });
    if (ok) {
        Utils.showToast('Status da turnê atualizado!', 'success');
        this.renderTurneDetalhes(id);
    }
};

Pages._salvarTransporte = async function(turneId) {
    const data = {
        turne_id: turneId,
        veiculo: document.getElementById('log_veiculo').value,
        motorista: document.getElementById('log_motorista').value,
        horario_saida: document.getElementById('log_saida').value,
        horario_chegada_prevista: document.getElementById('log_chegada').value
    };
    
    const transporteAtual = this._currentTurneData.transporte;
    if (transporteAtual) data.id = transporteAtual.id;
    
    const res = await TurnesDB.salvarTransporte(data);
    if (res) {
        Utils.showToast('Logística de transporte salva!', 'success');
        this.renderTurneDetalhes(turneId);
    }
};

Pages._salvarHospedagem = async function(turneId) {
    const data = {
        turne_id: turneId,
        hotel: document.getElementById('hosp_hotel').value,
        endereco: document.getElementById('hosp_endereco').value,
        checkin: document.getElementById('hosp_checkin').value,
        checkout: document.getElementById('hosp_checkout').value
    };
    
    const hospAtual = this._currentTurneData.hospedagem;
    if (hospAtual) data.id = hospAtual.id;
    
    const res = await TurnesDB.salvarHospedagem(data);
    if (res) {
        Utils.showToast('Dados de hospedagem salvos!', 'success');
        this.renderTurneDetalhes(turneId);
    }
};

Pages._toggleChecklistItem = async function(itemId, statusAtual) {
    const novoStatus = statusAtual === 'concluído' ? 'pendente' : 'concluído';
    await TurnesDB.atualizarChecklist(itemId, novoStatus);
    this.renderTurneDetalhes(this._currentTurneData.turne.id);
};

Pages._salvarRider = async function(turneId, tipo, idExistente) {
    const textareaId = tipo === 'TECNICO' ? 'rider_tecnico' : 'rider_camarim';
    const itens = document.getElementById(textareaId).value;
    
    const data = { turne_id: turneId, tipo: tipo, itens: itens };
    if (idExistente) data.id = idExistente;
    
    await TurnesDB.salvarRider(data);
    Utils.showToast(`Rider ${tipo} salvo!`, 'success');
    this.renderTurneDetalhes(turneId);
};

Pages._carregarMensagensChat = async function(turneId) {
    const msgs = await TurnesDB.listarMensagens(turneId);
    const chatBox = document.getElementById('chatMessages');
    if (!chatBox) return;
    
    chatBox.innerHTML = msgs.map(m => `
        <div class="message ${m.usuario_id === Auth.currentUser.id ? 'sent' : 'received'}">
            <div style="font-weight: 700; font-size: 11px; margin-bottom: 4px; color: ${m.usuario_id === Auth.currentUser.id ? '#000' : 'var(--gold-primary)'};">
                ${m.usuarios?.nome || 'Usuário'}
            </div>
            <div>${m.mensagem}</div>
            <div style="font-size: 9px; margin-top: 4px; opacity: 0.6; text-align: right;">
                ${new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
        </div>
    `).join('') || '<p style="text-align: center; color: var(--text-muted);">Inicie a conversa com a equipe.</p>';
    
    chatBox.scrollTop = chatBox.scrollHeight;
};

Pages._enviarMensagemTurne = async function(turneId) {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;
    
    input.value = '';
    await TurnesDB.enviarMensagem(turneId, msg);
    this._carregarMensagensChat(turneId);
};

// Utils Internos
Pages._getProgressoTurne = function(status) {
    const steps = ['PREPARANDO SAÍDA', 'EQUIPE CONFIRMADA', 'EM DESLOCAMENTO', 'CHEGANDO AO EVENTO', 'PASSAGEM DE SOM', 'SHOW EM ANDAMENTO', 'SHOW FINALIZADO', 'RETORNO', 'TURNÊ FINALIZADA'];
    const idx = steps.indexOf(status);
    return ((idx + 1) / steps.length) * 100;
};

// Modais Básicos para Turnê
Pages._modalAdicionarEquipe = function(turneId) {
    const funcao = prompt("Qual a função do membro da equipe? (Ex: Roadie, Técnico, Músico)");
    if (!funcao) return;
    
    TurnesDB.adicionarMembroEquipe({
        turne_id: turneId,
        funcao: funcao,
        status_presenca: 'pendente'
    }).then(() => this.renderTurneDetalhes(turneId));
};

Pages._modalAdicionarChecklist = function(turneId) {
    const categoria = prompt("Categoria (EQUIPAMENTOS, ARTISTA, LOGÍSTICA):").toUpperCase();
    const item = prompt("Nome do Item:");
    if (!categoria || !item) return;
    
    DB.create('turne_checklists', {
        turne_id: turneId,
        categoria: categoria,
        item: item,
        status: 'pendente'
    }).then(() => this.renderTurneDetalhes(turneId));
};

Pages._modalAdicionarVoo = function(turneId) {
    const passageiro = prompt("Nome do Passageiro:");
    if (!passageiro) return;
    const loc = prompt("Localizador (Opcional):") || '';
    
    TurnesDB.salvarVoo({
        turne_id: turneId,
        passageiro: passageiro,
        localizador: loc
    }).then(() => this.renderTurneDetalhes(turneId));
};

Pages._modalAdicionarQuarto = function(turneId) {
    const hosp1 = prompt("Nome do Hóspede 1:");
    if (!hosp1) return;
    const hosp2 = prompt("Nome do Hóspede 2 (Opcional):") || '';
    const tipo = prompt("Tipo de Quarto (Single, Double, Casal):") || 'Double';
    
    TurnesDB.salvarQuarto({
        turne_id: turneId,
        hospede_1: hosp1,
        hospede_2: hosp2,
        tipo_quarto: tipo
    }).then(() => this.renderTurneDetalhes(turneId));
};
