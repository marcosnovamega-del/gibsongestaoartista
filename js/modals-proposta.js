/* ========================================
   GIBSON MANAGER PRO - MODAL DE PROPOSTA
   Formulário multi-etapa com validação completa
======================================== */

Modals.showPropostaModal = async function(propostaId = null) {
    const proposta = propostaId ? await PropostasDB.buscarPorId(propostaId) : null;
    const artistas = await ArtistasDB.listarAtivos();
    const isEdit   = !!propostaId;
    const config   = await ConfigDB.obter();

    const html = `
        <div class="modal-overlay" onclick="if(event.target===this) Modals.close()" style="overflow-y:auto;">
            <div class="modal proposta-modal" style="max-width:780px;margin:30px auto;">
                <div class="modal-header" style="background:linear-gradient(135deg,#0d0d0d,#1a0500);border-bottom:1px solid var(--red-primary);">
                    <h3 class="modal-title">
                        <i class="fas fa-file-signature" style="color:var(--red-primary)"></i>
                        ${isEdit ? 'Editar Proposta' : 'Nova Proposta Comercial'}
                    </h3>
                    <button class="modal-close" onclick="Modals.close()"><i class="fas fa-times"></i></button>
                </div>

                <!-- Steps -->
                <div class="proposta-steps">
                    <div class="proposta-step active" id="step-indicator-1">
                        <span class="step-num">1</span><span class="step-label">Artista</span>
                    </div>
                    <div class="proposta-step-line"></div>
                    <div class="proposta-step" id="step-indicator-2">
                        <span class="step-num">2</span><span class="step-label">Contratante</span>
                    </div>
                    <div class="proposta-step-line"></div>
                    <div class="proposta-step" id="step-indicator-3">
                        <span class="step-num">3</span><span class="step-label">Evento</span>
                    </div>
                    <div class="proposta-step-line"></div>
                    <div class="proposta-step" id="step-indicator-4">
                        <span class="step-num">4</span><span class="step-label">Financeiro</span>
                    </div>
                </div>

                <div class="modal-body" style="padding:0;">
                    <form id="propostaForm" novalidate>

                        <!-- ETAPA 1: Artista + Vendedor -->
                        <div class="proposta-etapa active" id="proposta-etapa-1">
                            <div style="padding:24px;">
                                <h4 class="etapa-title"><i class="fas fa-microphone"></i> Artista & Vendedor</h4>
                                <div class="form-group">
                                    <label>Artista *</label>
                                    <select name="artista_id" id="p_artista_id">
                                        <option value="">Selecione o artista</option>
                                        ${artistas.map(a => `
                                            <option value="${a.id}" ${proposta?.artista_id === a.id ? 'selected' : ''}>
                                                ${a.nome}
                                            </option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Vendedor Responsável *</label>
                                    <input type="text" name="vendedor_nome" value="${proposta?.vendedor_nome || (window.Auth?.currentUser?.nome || '')}" placeholder="Nome do vendedor">
                                </div>
                                <div class="form-group">
                                    <label>Validade da Proposta *</label>
                                    <input type="date" name="validade" value="${proposta?.validade || (() => { const d = new Date(); d.setDate(d.getDate() + 10); return d.toISOString().split('T')[0]; })()}">
                                </div>
                                <div class="form-group">
                                    <label>Observações Gerais</label>
                                    <textarea name="observacoes" rows="3" placeholder="Informações adicionais da proposta...">${proposta?.observacoes || ''}</textarea>
                                </div>
                            </div>
                        </div>

                        <!-- ETAPA 2: Contratante -->
                        <div class="proposta-etapa" id="proposta-etapa-2">
                            <div style="padding:24px;">
                                <h4 class="etapa-title"><i class="fas fa-user-tie"></i> Dados do Contratante</h4>
                                <div class="form-group">
                                    <label>Tipo de Contratante</label>
                                    <select name="tipo_contratante" id="p_tipo_contratante" onchange="Modals.togglePropostaPJ()">
                                        <option value="PJ" ${proposta?.tipo_contratante !== 'PF' ? 'selected' : ''}>Pessoa Jurídica (PJ)</option>
                                        <option value="PF" ${proposta?.tipo_contratante === 'PF' ? 'selected' : ''}>Pessoa Física (PF)</option>
                                    </select>
                                </div>
                                <div id="p_campos_pj">
                                    <div class="grid grid-2">
                                        <div class="form-group">
                                            <label>Razão Social</label>
                                            <input type="text" name="razao_social" value="${proposta?.razao_social || ''}" placeholder="Empresa Ltda" id="p_razao_social">
                                        </div>
                                        <div class="form-group">
                                            <label>Nome Fantasia</label>
                                            <input type="text" name="nome_fantasia" value="${proposta?.nome_fantasia || ''}" placeholder="Nome Fantasia">
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label>CNPJ</label>
                                        <input type="text" name="cnpj" value="${proposta?.cnpj || ''}" placeholder="00.000.000/0000-00" id="p_cnpj"
                                               oninput="Utils.maskCNPJ(this)">
                                    </div>
                                </div>
                                <div id="p_campos_pf" style="display:none;">
                                    <div class="grid grid-2">
                                        <div class="form-group">
                                            <label>Nome Completo</label>
                                            <input type="text" name="nome_contratante" value="${proposta?.nome_contratante || ''}" id="p_nome_contratante">
                                        </div>
                                        <div class="form-group">
                                            <label>CPF</label>
                                            <input type="text" name="cpf_contratante" value="${proposta?.cpf_contratante || ''}" placeholder="000.000.000-00"
                                                   oninput="Utils.maskCPF(this)">
                                        </div>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Responsável pelo Contrato</label>
                                    <input type="text" name="responsavel" value="${proposta?.responsavel || ''}" placeholder="Nome do responsável">
                                </div>
                                <div class="grid grid-2">
                                    <div class="form-group">
                                        <label>Telefone / WhatsApp</label>
                                        <input type="text" name="telefone" value="${proposta?.telefone || ''}" placeholder="(00) 00000-0000"
                                               oninput="Utils.maskPhone(this)">
                                    </div>
                                    <div class="form-group">
                                        <label>E-mail</label>
                                        <input type="email" name="email" value="${proposta?.email || ''}" placeholder="contato@empresa.com">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Endereço Completo</label>
                                    <input type="text" name="endereco" value="${proposta?.endereco || ''}" placeholder="Rua, número, bairro">
                                </div>
                                <div class="grid grid-3">
                                    <div class="form-group">
                                        <label>Cidade</label>
                                        <input type="text" name="cidade_contratante" value="${proposta?.cidade_contratante || ''}">
                                    </div>
                                    <div class="form-group">
                                        <label>Estado</label>
                                        <select name='estado_contratante'><option value=''>UF</option>
<option value='AC' ${proposta?.estado_contratante==='AC'?'selected':''}> AC</option>
<option value='AL' ${proposta?.estado_contratante==='AL'?'selected':''}> AL</option>
<option value='AP' ${proposta?.estado_contratante==='AP'?'selected':''}> AP</option>
<option value='AM' ${proposta?.estado_contratante==='AM'?'selected':''}> AM</option>
<option value='BA' ${proposta?.estado_contratante==='BA'?'selected':''}> BA</option>
<option value='CE' ${proposta?.estado_contratante==='CE'?'selected':''}> CE</option>
<option value='DF' ${proposta?.estado_contratante==='DF'?'selected':''}> DF</option>
<option value='ES' ${proposta?.estado_contratante==='ES'?'selected':''}> ES</option>
<option value='GO' ${proposta?.estado_contratante==='GO'?'selected':''}> GO</option>
<option value='MA' ${proposta?.estado_contratante==='MA'?'selected':''}> MA</option>
<option value='MT' ${proposta?.estado_contratante==='MT'?'selected':''}> MT</option>
<option value='MS' ${proposta?.estado_contratante==='MS'?'selected':''}> MS</option>
<option value='MG' ${proposta?.estado_contratante==='MG'?'selected':''}> MG</option>
<option value='PA' ${proposta?.estado_contratante==='PA'?'selected':''}> PA</option>
<option value='PB' ${proposta?.estado_contratante==='PB'?'selected':''}> PB</option>
<option value='PR' ${proposta?.estado_contratante==='PR'?'selected':''}> PR</option>
<option value='PE' ${proposta?.estado_contratante==='PE'?'selected':''}> PE</option>
<option value='PI' ${proposta?.estado_contratante==='PI'?'selected':''}> PI</option>
<option value='RJ' ${proposta?.estado_contratante==='RJ'?'selected':''}> RJ</option>
<option value='RN' ${proposta?.estado_contratante==='RN'?'selected':''}> RN</option>
<option value='RS' ${proposta?.estado_contratante==='RS'?'selected':''}> RS</option>
<option value='RO' ${proposta?.estado_contratante==='RO'?'selected':''}> RO</option>
<option value='RR' ${proposta?.estado_contratante==='RR'?'selected':''}> RR</option>
<option value='SC' ${proposta?.estado_contratante==='SC'?'selected':''}> SC</option>
<option value='SP' ${proposta?.estado_contratante==='SP'?'selected':''}> SP</option>
<option value='SE' ${proposta?.estado_contratante==='SE'?'selected':''}> SE</option>
<option value='TO' ${proposta?.estado_contratante==='TO'?'selected':''}> TO</option></select>
                                    </div>
                                    <div class="form-group">
                                        <label>CEP</label>
                                        <input type="text" name="cep" value="${proposta?.cep || ''}" placeholder="00000-000"
                                               oninput="Utils.maskCEP(this)">
                                    </div>
                                </div>

                                <!-- TOGGLE: Contrato com entidade diferente -->
                                <div style="margin-top:20px;padding:16px;border:1.5px dashed var(--border-color);border-radius:12px;background:var(--bg-secondary);">
                                    <label style="display:flex;align-items:center;gap:12px;cursor:pointer;user-select:none;">
                                        <input type="checkbox" id="p_contrato_diferente" name="contrato_entidade_diferente"
                                               ${proposta?.contrato_entidade_diferente ? 'checked' : ''}
                                               style="width:18px;height:18px;accent-color:var(--brand-primary);cursor:pointer;flex-shrink:0;"
                                               onchange="Modals.toggleContratoEntidade()">
                                        <div>
                                            <div style="font-weight:700;font-size:13px;">O contrato será assinado por entidade diferente?</div>
                                            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Ex: Prefeitura, empresa terceirizada, produtora intermediária</div>
                                        </div>
                                    </label>

                                    <div id="p_contrato_entidade_campos" style="display:${proposta?.contrato_entidade_diferente ? 'block' : 'none'};margin-top:18px;border-top:1px solid var(--border-color);padding-top:16px;">
                                        <h5 style="margin:0 0 14px;font-size:13px;color:var(--brand-primary);text-transform:uppercase;letter-spacing:.5px;">
                                            <i class="fas fa-file-signature"></i> Dados para o Contrato
                                        </h5>
                                        <div class="form-group">
                                            <label>Tipo</label>
                                            <select name="contrato_tipo" id="p_contrato_tipo" onchange="Modals.toggleContratoTipo()">
                                                <option value="PJ" ${(proposta?.contrato_tipo||'PJ')==='PJ'?'selected':''}>Pessoa Jurídica (PJ)</option>
                                                <option value="PF" ${proposta?.contrato_tipo==='PF'?'selected':''}>Pessoa Física (PF)</option>
                                            </select>
                                        </div>
                                        <div id="p_contrato_campos_pj" style="display:${proposta?.contrato_tipo==='PF'?'none':'block'};">
                                            <div class="grid grid-2">
                                                <div class="form-group">
                                                    <label>Razão Social</label>
                                                    <input type="text" name="contrato_razao_social" value="${proposta?.contrato_razao_social||''}" placeholder="Ex: Prefeitura Municipal de...">
                                                </div>
                                                <div class="form-group">
                                                    <label>CNPJ</label>
                                                    <input type="text" name="contrato_cnpj" value="${proposta?.contrato_cnpj||''}" placeholder="00.000.000/0000-00" oninput="Utils.maskCNPJ(this)">
                                                </div>
                                            </div>
                                        </div>
                                        <div id="p_contrato_campos_pf" style="display:${proposta?.contrato_tipo==='PF'?'block':'none'};">
                                            <div class="grid grid-2">
                                                <div class="form-group">
                                                    <label>Nome Completo</label>
                                                    <input type="text" name="contrato_nome" value="${proposta?.contrato_nome||''}">
                                                </div>
                                                <div class="form-group">
                                                    <label>CPF</label>
                                                    <input type="text" name="contrato_cpf" value="${proposta?.contrato_cpf||''}" placeholder="000.000.000-00" oninput="Utils.maskCPF(this)">
                                                </div>
                                            </div>
                                        </div>
                                        <div class="grid grid-2">
                                            <div class="form-group">
                                                <label>Representante Legal</label>
                                                <input type="text" name="contrato_representante" value="${proposta?.contrato_representante||''}" placeholder="Nome de quem assina">
                                            </div>
                                            <div class="form-group">
                                                <label>Cargo</label>
                                                <input type="text" name="contrato_cargo" value="${proposta?.contrato_cargo||''}" placeholder="Ex: Prefeito, Diretor...">
                                            </div>
                                        </div>
                                        <div class="form-group">
                                            <label>Endereço</label>
                                            <input type="text" name="contrato_endereco" value="${proposta?.contrato_endereco||''}" placeholder="Rua, número, bairro">
                                        </div>
                                        <div class="grid grid-3">
                                            <div class="form-group">
                                                <label>Cidade</label>
                                                <input type="text" name="contrato_cidade" value="${proposta?.contrato_cidade||''}">
                                            </div>
                                            <div class="form-group">
                                                <label>Estado</label>
                                                <select name='contrato_estado'><option value=''>UF</option>
<option value='AC' ${proposta?.contrato_estado==='AC'?'selected':''}> AC</option>
<option value='AL' ${proposta?.contrato_estado==='AL'?'selected':''}> AL</option>
<option value='AP' ${proposta?.contrato_estado==='AP'?'selected':''}> AP</option>
<option value='AM' ${proposta?.contrato_estado==='AM'?'selected':''}> AM</option>
<option value='BA' ${proposta?.contrato_estado==='BA'?'selected':''}> BA</option>
<option value='CE' ${proposta?.contrato_estado==='CE'?'selected':''}> CE</option>
<option value='DF' ${proposta?.contrato_estado==='DF'?'selected':''}> DF</option>
<option value='ES' ${proposta?.contrato_estado==='ES'?'selected':''}> ES</option>
<option value='GO' ${proposta?.contrato_estado==='GO'?'selected':''}> GO</option>
<option value='MA' ${proposta?.contrato_estado==='MA'?'selected':''}> MA</option>
<option value='MT' ${proposta?.contrato_estado==='MT'?'selected':''}> MT</option>
<option value='MS' ${proposta?.contrato_estado==='MS'?'selected':''}> MS</option>
<option value='MG' ${proposta?.contrato_estado==='MG'?'selected':''}> MG</option>
<option value='PA' ${proposta?.contrato_estado==='PA'?'selected':''}> PA</option>
<option value='PB' ${proposta?.contrato_estado==='PB'?'selected':''}> PB</option>
<option value='PR' ${proposta?.contrato_estado==='PR'?'selected':''}> PR</option>
<option value='PE' ${proposta?.contrato_estado==='PE'?'selected':''}> PE</option>
<option value='PI' ${proposta?.contrato_estado==='PI'?'selected':''}> PI</option>
<option value='RJ' ${proposta?.contrato_estado==='RJ'?'selected':''}> RJ</option>
<option value='RN' ${proposta?.contrato_estado==='RN'?'selected':''}> RN</option>
<option value='RS' ${proposta?.contrato_estado==='RS'?'selected':''}> RS</option>
<option value='RO' ${proposta?.contrato_estado==='RO'?'selected':''}> RO</option>
<option value='RR' ${proposta?.contrato_estado==='RR'?'selected':''}> RR</option>
<option value='SC' ${proposta?.contrato_estado==='SC'?'selected':''}> SC</option>
<option value='SP' ${proposta?.contrato_estado==='SP'?'selected':''}> SP</option>
<option value='SE' ${proposta?.contrato_estado==='SE'?'selected':''}> SE</option>
<option value='TO' ${proposta?.contrato_estado==='TO'?'selected':''}> TO</option></select>
                                            </div>
                                            <div class="form-group">
                                                <label>CEP</label>
                                                <input type="text" name="contrato_cep" value="${proposta?.contrato_cep||''}" placeholder="00000-000" oninput="Utils.maskCEP(this)">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ETAPA 3: Evento -->
                        <div class="proposta-etapa" id="proposta-etapa-3">
                            <div style="padding:24px;">
                                <h4 class="etapa-title"><i class="fas fa-calendar-star"></i> Dados do Evento</h4>
                                <div class="grid grid-2">
                                    <div class="form-group">
                                        <label>Data do Show *</label>
                                        <input type="date" name="data_evento" value="${proposta?.data_evento || ''}">
                                    </div>
                                    <div class="form-group">
                                        <label>Horário <span style="font-size:11px;color:var(--text-muted);font-weight:400;">(opcional)</span></label>
                                        <input type="time" name="horario" value="${proposta?.horario || ''}">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Nome / Local do Evento *</label>
                                    <input type="text" name="local_evento" value="${proposta?.local_evento || ''}" placeholder="Ex: Espaço XYZ, Arena, Clube...">
                                </div>
                                <div style="display:flex;gap:10px;">
                                    <div class="form-group" style="flex:1;min-width:0;">
                                        <label>Cidade do Show *</label>
                                        <input type="text" name="cidade_evento" id="p_cidade_evento" value="${proposta?.cidade_evento || ''}" placeholder="Ex: Brás Pires">
                                    </div>
                                    <div class="form-group" style="width:90px;flex-shrink:0;">
                                        <label>Estado (UF)</label>
                                        <select name='estado_evento' id='p_estado_evento'><option value=''>UF</option>
<option value='AC' ${proposta?.estado_evento==='AC'?'selected':''}> AC</option>
<option value='AL' ${proposta?.estado_evento==='AL'?'selected':''}> AL</option>
<option value='AP' ${proposta?.estado_evento==='AP'?'selected':''}> AP</option>
<option value='AM' ${proposta?.estado_evento==='AM'?'selected':''}> AM</option>
<option value='BA' ${proposta?.estado_evento==='BA'?'selected':''}> BA</option>
<option value='CE' ${proposta?.estado_evento==='CE'?'selected':''}> CE</option>
<option value='DF' ${proposta?.estado_evento==='DF'?'selected':''}> DF</option>
<option value='ES' ${proposta?.estado_evento==='ES'?'selected':''}> ES</option>
<option value='GO' ${proposta?.estado_evento==='GO'?'selected':''}> GO</option>
<option value='MA' ${proposta?.estado_evento==='MA'?'selected':''}> MA</option>
<option value='MT' ${proposta?.estado_evento==='MT'?'selected':''}> MT</option>
<option value='MS' ${proposta?.estado_evento==='MS'?'selected':''}> MS</option>
<option value='MG' ${proposta?.estado_evento==='MG'?'selected':''}> MG</option>
<option value='PA' ${proposta?.estado_evento==='PA'?'selected':''}> PA</option>
<option value='PB' ${proposta?.estado_evento==='PB'?'selected':''}> PB</option>
<option value='PR' ${proposta?.estado_evento==='PR'?'selected':''}> PR</option>
<option value='PE' ${proposta?.estado_evento==='PE'?'selected':''}> PE</option>
<option value='PI' ${proposta?.estado_evento==='PI'?'selected':''}> PI</option>
<option value='RJ' ${proposta?.estado_evento==='RJ'?'selected':''}> RJ</option>
<option value='RN' ${proposta?.estado_evento==='RN'?'selected':''}> RN</option>
<option value='RS' ${proposta?.estado_evento==='RS'?'selected':''}> RS</option>
<option value='RO' ${proposta?.estado_evento==='RO'?'selected':''}> RO</option>
<option value='RR' ${proposta?.estado_evento==='RR'?'selected':''}> RR</option>
<option value='SC' ${proposta?.estado_evento==='SC'?'selected':''}> SC</option>
<option value='SP' ${proposta?.estado_evento==='SP'?'selected':''}> SP</option>
<option value='SE' ${proposta?.estado_evento==='SE'?'selected':''}> SE</option>
<option value='TO' ${proposta?.estado_evento==='TO'?'selected':''}> TO</option></select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Tipo de Evento *</label>
                                    <select name="tipo_evento">
                                        ${['Show','Festival','Festa Particular','Evento Corporativo','Casamento','Aniversário','Forró','Réveillon','São João','Outro'].map(t => `
                                            <option value="${t}" ${proposta?.tipo_evento === t ? 'selected' : ''}>${t}</option>`).join('')}
                                    </select>
                                </div>

                                <!-- DATAS ALTERNATIVAS -->
                                <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:10px;padding:16px;margin-top:4px;">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                                        <label style="font-size:13px;font-weight:700;color:var(--text-primary);margin:0;">
                                            <i class="fas fa-calendar-plus" style="color:var(--brand-primary)"></i> Datas Alternativas
                                            <span style="font-size:11px;font-weight:400;color:var(--text-muted);margin-left:6px;">(opcional — reserva mais de uma data)</span>
                                        </label>
                                        <button type="button" onclick="Modals.adicionarDataAlternativa()" style="background:var(--brand-primary);color:#000;border:none;border-radius:6px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer;">
                                            <i class="fas fa-plus"></i> Adicionar
                                        </button>
                                    </div>
                                    <div id="datas-alternativas-list">
                                        ${(() => {
                                            const alts = proposta?.datas_alternativas
                                                ? (typeof proposta.datas_alternativas === 'string' ? JSON.parse(proposta.datas_alternativas) : proposta.datas_alternativas)
                                                : [];
                                            if (!alts.length) return '<p style="font-size:12px;color:var(--text-muted);margin:0;">Nenhuma data alternativa adicionada.</p>';
                                            return alts.map((d, i) => `
                                                <div class="data-alt-item" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                                                    <input type="date" class="data-alt-input" value="${d}" style="flex:1;padding:7px 10px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);font-size:13px;">
                                                    <button type="button" onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--danger);font-size:16px;cursor:pointer;padding:4px;">
                                                        <i class="fas fa-times-circle"></i>
                                                    </button>
                                                </div>`).join('');
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ETAPA 4: Financeiro + Cronograma de Pagamento -->
                        <div class="proposta-etapa" id="proposta-etapa-4">
                            <div style="padding:24px;">
                                <h4 class="etapa-title"><i class="fas fa-dollar-sign"></i> Proposta Financeira & Pagamento</h4>

                                <div class="form-group">
                                    <label>Cachê (R$) *</label>
                                    <input type="number" name="cache_bruto" id="p_cache" value="${proposta?.cache_bruto || ''}" min="0" step="0.01"
                                           oninput="Modals.atualizarCronograma(); Modals.gerarResumoPropostaPreview();">
                                </div>

                                <!-- VENDEDOR -->
                                <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:10px;padding:16px;margin-bottom:16px;">
                                    <label style="font-size:13px;font-weight:700;color:var(--text-primary);display:block;margin-bottom:12px;">
                                        <i class="fas fa-user-tie" style="color:var(--brand-primary)"></i> Vendedor
                                    </label>
                                    <div class="grid grid-2">
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Nome do Vendedor</label>
                                            <input type="text" name="vendedor_nome_fin" id="p_vendedor_nome_fin" value="${proposta?.vendedor_nome || (window.Auth?.currentUser?.nome || '')}" placeholder="Nome do vendedor">
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Comissão do Vendedor (R$)</label>
                                            <input type="number" name="vendedor_comissao_valor" id="p_vendedor_comissao" value="${proposta?.vendedor_comissao_valor || ''}" min="0" step="0.01" placeholder="Ex: 500.00">
                                        </div>
                                    </div>
                                    <small class="text-muted" style="display:block;margin-top:8px;"><i class="fas fa-info-circle"></i> Comissão lançada automaticamente no Financeiro ao confirmar o contrato.</small>
                                </div>

                                <!-- FORMA DE PAGAMENTO -->
                                <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:10px;padding:16px;margin-bottom:16px;">
                                    <label style="font-size:13px;font-weight:700;color:var(--text-primary);display:block;margin-bottom:12px;">
                                        <i class="fas fa-credit-card" style="color:var(--red-primary)"></i> Forma de Pagamento *
                                    </label>
                                    <div style="display:flex;gap:10px;margin-bottom:14px;">
                                        <button type="button" id="btn_avista" onclick="Modals.setPagTipo('avista')"
                                            class="pag-tipo-btn pag-tipo-ativo" style="flex:1;">
                                            <i class="fas fa-money-bill-wave"></i> À Vista
                                        </button>
                                        <button type="button" id="btn_parcelado" onclick="Modals.setPagTipo('parcelado')"
                                            class="pag-tipo-btn" style="flex:1;">
                                            <i class="fas fa-th-list"></i> Parcelado
                                        </button>
                                    </div>
                                    <input type="hidden" name="pag_tipo" id="pag_tipo" value="avista">

                                    <!-- À VISTA -->
                                    <div id="pag_avista_config">
                                        <div class="form-group" style="margin:0;">
                                            <label>Data de Vencimento *</label>
                                            <input type="date" id="pag_avista_data" name="pag_avista_data"
                                                   value="${proposta?.condicoes_pagamento ? (() => { try { const c = JSON.parse(proposta.condicoes_pagamento); return c?.cronograma?.[0]?.data_vencimento || ''; } catch(e) { return ''; } })() : ''}"
                                                   oninput="Modals.atualizarCronograma()"
                                                   style="max-width:220px;">
                                        </div>
                                    </div>

                                    <!-- PARCELADO -->
                                    <div id="pag_parcelado_config" style="display:none;">
                                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                                            <label style="margin:0;white-space:nowrap;">Nº de parcelas:</label>
                                            <select id="pag_num_parcelas" onchange="Modals.gerarLinhasParcelas()" style="width:80px;">
                                                <option value="2">2x</option>
                                                <option value="3">3x</option>
                                                <option value="4">4x</option>
                                                <option value="5">5x</option>
                                                <option value="6">6x</option>
                                                <option value="7">7x</option>
                                                <option value="8">8x</option>
                                                <option value="9">9x</option>
                                                <option value="10">10x</option>
                                            </select>
                                        </div>
                                        <div id="pag_parcelas_linhas"></div>
                                        <div id="pag_pct_total" style="font-size:12px;margin-top:6px;text-align:right;color:var(--text-muted);"></div>
                                    </div>
                                </div>

                                <!-- PREVIEW CRONOGRAMA -->
                                <div class="proposta-preview-box" id="cronograma_preview" style="display:none;">
                                    <div class="proposta-preview-header">
                                        <i class="fas fa-calendar-check"></i> Cronograma de Pagamentos
                                    </div>
                                    <div id="cronograma_linhas" class="proposta-preview-content"></div>
                                </div>

                                <!-- Preview da proposta -->
                                <div class="proposta-preview-box" style="margin-top:12px;">
                                    <div class="proposta-preview-header"><i class="fas fa-eye"></i> Resumo da Proposta</div>
                                    <div id="propostaResumo" class="proposta-preview-content">Preencha os dados para visualizar.</div>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                <!-- Footer com navegação das etapas -->
                <div class="modal-footer proposta-footer">
                    <button class="btn-secondary" id="proposta-btn-back" onclick="Modals.propostaNavegar(-1)" style="display:none;">
                        <i class="fas fa-arrow-left"></i> Anterior
                    </button>
                    <div style="flex:1;text-align:center;">
                        <span id="proposta-step-label" style="color:var(--text-muted);font-size:13px;">Etapa 1 de 4</span>
                    </div>
                    <button class="btn-primary" id="proposta-btn-next" onclick="Modals.propostaNavegar(1)">
                        Próximo <i class="fas fa-arrow-right"></i>
                    </button>
                    <button class="btn-primary" id="proposta-btn-save" onclick="Modals.submitProposta('${propostaId || ''}')" style="display:none;">
                        <i class="fas fa-save"></i> Salvar Proposta
                    </button>
                </div>
            </div>
        </div>
    `;

    this.container.innerHTML = html;
    Modals._propostaEtapa = 1;

    // Aplicar estado inicial dos campos PJ
    Modals.togglePropostaPJ();

    // UF field: event listener robusto (sem oninput inline)
    setTimeout(() => {
        const ufInput = document.getElementById('p_estado_evento');
        const cidadeInput = document.getElementById('p_cidade_evento');
        const localInput = document.querySelector('[name="local_evento"]');
        if (ufInput) {
            ufInput.addEventListener('input', function() {
                this.value = this.value.toUpperCase().replace(/[^A-Z]/g,'');
            });
            ufInput.addEventListener('keydown', function(e) { e.stopPropagation(); });
        }
        // Auto-extrai UF + cidade do campo "Nome / Local do Evento" (ex: "Brás Pires - MG")
        if (localInput) {
            localInput.addEventListener('blur', function() {
                const v = this.value.trim();
                const m = v.match(/^(.+?)\s*-\s*([A-Za-z]{2})$/);
                if (m) {
                    if (cidadeInput && !cidadeInput.value) cidadeInput.value = m[1].trim();
                    if (ufInput && !ufInput.value) ufInput.value = m[2].toUpperCase();
                }
            });
        }
    }, 100);

    // Calcular preview se editando
    if (proposta?.cache_bruto) Modals.calcPropostaLiquido();
};

// Controle de etapas
Modals._propostaEtapa = 1;

Modals.propostaNavegar = function(direcao) {
    const atual = Modals._propostaEtapa;
    const nova  = atual + direcao;

    // Validar etapa atual antes de avançar
    if (direcao > 0 && !Modals.validarEtapaProposta(atual)) return;

    if (nova < 1 || nova > 4) return;

    // Ocultar etapa atual
    document.getElementById(`proposta-etapa-${atual}`).classList.remove('active');
    document.getElementById(`step-indicator-${atual}`).classList.remove('active');
    document.getElementById(`step-indicator-${atual}`).classList.add('done');

    // Mostrar nova etapa
    document.getElementById(`proposta-etapa-${nova}`).classList.add('active');
    document.getElementById(`step-indicator-${nova}`).classList.add('active');

    Modals._propostaEtapa = nova;

    // Atualizar botões
    document.getElementById('proposta-btn-back').style.display  = nova > 1 ? 'inline-flex' : 'none';
    document.getElementById('proposta-btn-next').style.display  = nova < 4 ? 'inline-flex' : 'none';
    document.getElementById('proposta-btn-save').style.display  = nova === 4 ? 'inline-flex' : 'none';
    document.getElementById('proposta-step-label').textContent  = `Etapa ${nova} de 4`;

    // Gerar resumo na última etapa
    if (nova === 4) Modals.gerarResumoPropostaPreview();
};

Modals.validarEtapaProposta = function(etapa) {
    const form = document.getElementById('propostaForm');
    const etapaEl = document.getElementById(`proposta-etapa-${etapa}`);
    const campos = etapaEl.querySelectorAll('[required]');
    let valido = true;

    // Remover erros anteriores
    etapaEl.querySelectorAll('.field-error').forEach(e => e.remove());
    etapaEl.querySelectorAll('.input-error').forEach(e => e.classList.remove('input-error'));

    campos.forEach(campo => {
        // Pular campos em seções ocultas
        if (campo.closest('[style*="display:none"]') || campo.closest('[style*="display: none"]')) return;
        if (!campo.value.trim()) {
            valido = false;
            campo.classList.add('input-error');
            const err = document.createElement('small');
            err.className = 'field-error';
            err.textContent = 'Campo obrigatório';
            campo.parentNode.appendChild(err);
        }
    });

    if (!valido) Utils.showToast('Preencha todos os campos obrigatórios para continuar.', 'error');
    return valido;
};

Modals.togglePropostaPJ = function() {
    const tipo = document.getElementById('p_tipo_contratante')?.value;
    const pjEl = document.getElementById('p_campos_pj');
    const pfEl = document.getElementById('p_campos_pf');
    if (!pjEl || !pfEl) return;
    pjEl.style.display = tipo === 'PJ' ? 'block' : 'none';
    pfEl.style.display = tipo === 'PF' ? 'block' : 'none';
};

Modals.toggleContratoEntidade = function() {
    const checked = document.getElementById('p_contrato_diferente')?.checked;
    const campos  = document.getElementById('p_contrato_entidade_campos');
    if (campos) campos.style.display = checked ? 'block' : 'none';
};

Modals.toggleContratoTipo = function() {
    const tipo = document.getElementById('p_contrato_tipo')?.value;
    const pj   = document.getElementById('p_contrato_campos_pj');
    const pf   = document.getElementById('p_contrato_campos_pf');
    if (pj) pj.style.display = tipo === 'PJ' ? 'block' : 'none';
    if (pf) pf.style.display = tipo === 'PF' ? 'block' : 'none';
};

Modals.adicionarDataAlternativa = function() {
    const list = document.getElementById('datas-alternativas-list');
    if (!list) return;
    // Remove placeholder text if present
    const placeholder = list.querySelector('p');
    if (placeholder) placeholder.remove();
    const div = document.createElement('div');
    div.className = 'data-alt-item';
    div.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
    div.innerHTML = `
        <input type="date" class="data-alt-input" style="flex:1;padding:7px 10px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);font-size:13px;">
        <button type="button" onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--danger);font-size:16px;cursor:pointer;padding:4px;">
            <i class="fas fa-times-circle"></i>
        </button>`;
    list.appendChild(div);
};

Modals.calcPropostaLiquido = function() {
    // Mantido por compatibilidade — sem dedução de produtora
    Modals.atualizarCronograma();
};

Modals.gerarResumoPropostaPreview = function() {
    const form = document.getElementById('propostaForm');
    if (!form) return;
    const d = new FormData(form);
    const get = k => d.get(k) || '—';

    const artistaSelect = document.getElementById('p_artista_id');
    const artistaNome   = artistaSelect?.options[artistaSelect.selectedIndex]?.text || '—';

    const cache   = parseFloat(document.getElementById('p_cache')?.value) || parseFloat(get('cache_bruto')) || 0;
    const vendNome = get('vendedor_nome_fin') || get('vendedor_nome') || '—';
    const vendComissao = parseFloat(get('vendedor_comissao_valor')) || 0;

    document.getElementById('propostaResumo').innerHTML = `
        <div class="resumo-row"><span>Artista</span><strong>${artistaNome}</strong></div>
        <div class="resumo-row"><span>Vendedor</span><strong>${vendNome}</strong></div>
        <div class="resumo-row"><span>Contratante</span><strong>${get('razao_social') || get('nome_contratante')}</strong></div>
        <div class="resumo-row"><span>Responsável</span><strong>${get('responsavel')}</strong></div>
        <div class="resumo-row"><span>Evento</span><strong>${get('tipo_evento')} — ${get('local_evento')}</strong></div>
        <div class="resumo-row"><span>Data / Hora</span><strong>${get('data_evento') ? Utils.formatDate(get('data_evento')) : '—'}${get('horario') ? ' às ' + get('horario') : ''}</strong></div>
        <div class="resumo-row"><span>Cidade</span><strong>${get('cidade_evento')}/${get('estado_evento')}</strong></div>
        <div class="resumo-row" style="border-top:1px solid var(--border-color);margin-top:8px;padding-top:8px;">
            <span>Cachê</span><strong style="color:var(--success);font-size:16px;">${Utils.formatCurrency(cache)}</strong>
        </div>
        ${vendComissao ? `<div class="resumo-row"><span>Comissão Vendedor</span><strong style="color:var(--warning);">${Utils.formatCurrency(vendComissao)}</strong></div>` : ''}
        <div class="resumo-row"><span>Validade</span><strong>${get('validade') ? Utils.formatDate(get('validade')) : '—'}</strong></div>
    `;
};

Modals.submitProposta = async function(propostaId) {
    if (!Modals.validarEtapaProposta(4)) return;

    const form = document.getElementById('propostaForm');
    const d    = new FormData(form);
    const get  = k => d.get(k) || '';

    // Montar cronograma JSON
    const pagTipo = get('pag_tipo') || 'avista';
    let cronograma = [];
    const cacheBruto = parseFloat(get('cache_bruto')) || 0;
    const vendedorNome = get('vendedor_nome_fin') || get('vendedor_nome') || '';

    if (pagTipo === 'avista') {
        const dataVenc = document.getElementById('pag_avista_data')?.value || null;
        cronograma = [{ valor: cacheBruto, data_vencimento: dataVenc, descricao: 'Pagamento integral', tipo: 'integral' }];
    } else {
        const linhas = document.querySelectorAll('.parcela-linha');
        linhas.forEach((linha, i) => {
            const valor      = parseFloat(linha.querySelector('.parcela-valor')?.value) || 0;
            const dataVenc   = linha.querySelector('.parcela-data')?.value || null;
            const desc       = linha.querySelector('.parcela-desc')?.value || `Parcela ${i+1}`;
            cronograma.push({ valor, data_vencimento: dataVenc, descricao: desc, tipo: i === 0 ? 'entrada' : 'restante', numero: i+1 });
        });
    }

    const data = {
        artista_id: get('artista_id'), vendedor_nome: vendedorNome,
        validade: get('validade') || null, observacoes: get('observacoes'),
        tipo_contratante: get('tipo_contratante'), razao_social: get('razao_social'),
        nome_fantasia: get('nome_fantasia'), cnpj: get('cnpj'),
        nome_contratante: get('nome_contratante'), cpf_contratante: get('cpf_contratante'),
        responsavel: get('responsavel'), telefone: get('telefone'), email: get('email'),
        endereco: get('endereco'), cidade_contratante: get('cidade_contratante'),
        estado_contratante: (get('estado_contratante') || '').toUpperCase(), cep: get('cep'),
        data_evento: get('data_evento') || null, horario: get('horario') || '00:00:00',
        local_evento: get('local_evento'), cidade_evento: get('cidade_evento'),
        estado_evento: (get('estado_evento') || '-').toUpperCase(), tipo_evento: get('tipo_evento'),
        cache_bruto: cacheBruto,
        comissao: 0,
        vendedor_comissao_valor: parseFloat(get('vendedor_comissao_valor')) || 0,
        parceiro_nome: null,
        parceiro_comissao_valor: 0,
        condicoes_pagamento: JSON.stringify({ tipo: pagTipo, cronograma }),
        // Dados de entidade diferente para contrato
        contrato_entidade_diferente: document.getElementById('p_contrato_diferente')?.checked || false,
        contrato_tipo:            get('contrato_tipo')            || 'PJ',
        contrato_razao_social:    get('contrato_razao_social')    || null,
        contrato_cnpj:            get('contrato_cnpj')            || null,
        contrato_nome:            get('contrato_nome')            || null,
        contrato_cpf:             get('contrato_cpf')             || null,
        contrato_representante:   get('contrato_representante')   || null,
        contrato_cargo:           get('contrato_cargo')           || null,
        contrato_endereco:        get('contrato_endereco')        || null,
        contrato_cidade:          get('contrato_cidade')          || null,
        contrato_estado:          (get('contrato_estado') || '').toUpperCase() || null,
        contrato_cep:             get('contrato_cep')             || null,
        datas_alternativas: JSON.stringify(
            Array.from(document.querySelectorAll('.data-alt-input'))
                .map(el => el.value)
                .filter(v => !!v)
        ),
    };

    // ── Verificar conflito de data/artista antes de criar ─────────
    if (!propostaId && data.artista_id && data.data_evento) {
        const [todasPropostas, todosEventos] = await Promise.all([
            PropostasDB.listar(true),
            EventosDB.listar()
        ]);
        const statusBloqueados = ['Recusada', 'Cancelada', 'Expirada'];

        const propostaConflito = todasPropostas.find(p =>
            p.id !== propostaId &&
            p.artista_id === data.artista_id &&
            p.data_evento === data.data_evento &&
            !statusBloqueados.includes(p.status)
        );
        const eventoConflito = todosEventos.find(e =>
            e.artista_id === data.artista_id &&
            e.data === data.data_evento
        );

        if (propostaConflito || eventoConflito) {
            const origem = eventoConflito
                ? `Evento já confirmado`
                : `Proposta "${propostaConflito.status}" — Vendedor: ${propostaConflito.vendedor_nome || 'N/A'}`;
            const dataFmt = Utils.formatDate(data.data_evento);
            Utils.hideLoading();
            const continuar = confirm(
                `⚠️ CONFLITO DE AGENDA!\n\n` +
                `Esta data (${dataFmt}) já está ocupada para este artista.\n` +
                `Origem: ${origem}\n\n` +
                `Deseja registrar mesmo assim?`
            );
            if (!continuar) return;
        }
    }

    Utils.showLoading();
    let result = propostaId ? await PropostasDB.atualizar(propostaId, data) : await PropostasDB.criar(data);
    Utils.hideLoading();

    if (result) {
        // Sincronizar dados do evento com o registro na tabela eventos
        if (data.artista_id && data.data_evento) {
            try {
                const todosEvs = await EventosDB.listar();
                const evLinkado = todosEvs.find(e =>
                    String(e.artista_id) === String(data.artista_id) &&
                    e.data === data.data_evento
                );
                if (evLinkado) {
                    const syncData = {};
                    if (data.local_evento) syncData.local = data.local_evento;
                    if (data.cidade_evento) syncData.cidade = data.cidade_evento;
                    if (data.estado_evento) syncData.estado = data.estado_evento;
                    if (data.horario) syncData.horario = data.horario;
                    if (data.cache_bruto) syncData.cache_bruto = data.cache_bruto;
                    if (Object.keys(syncData).length > 0) {
                        await EventosDB.atualizar(evLinkado.id, syncData);
                    }
                }
            } catch(eSync) { console.warn('Sync evento-proposta:', eSync); }
        }
        Utils.showToast(`Proposta ${propostaId ? 'atualizada' : 'criada'} com sucesso!`, 'success');
        Modals.close();
        if (typeof Pages.renderVendas === 'function') Pages.renderVendas();
    } else {
        Utils.showToast('Erro ao salvar proposta.', 'error');
    }
};

// ---- Funções do configurador de pagamento ----

Modals.setPagTipo = function(tipo) {
    document.getElementById('pag_tipo').value = tipo;
    const ativo = tipo === 'avista';
    document.getElementById('btn_avista').classList.toggle('pag-tipo-ativo', ativo);
    document.getElementById('btn_parcelado').classList.toggle('pag-tipo-ativo', !ativo);
    document.getElementById('pag_avista_config').style.display    = ativo ? 'block' : 'none';
    document.getElementById('pag_parcelado_config').style.display = ativo ? 'none'  : 'block';
    if (!ativo) Modals.gerarLinhasParcelas();
    Modals.atualizarCronograma();
};

Modals.gerarLinhasParcelas = function() {
    const n   = parseInt(document.getElementById('pag_num_parcelas')?.value || 2);
    const cache    = parseFloat(document.getElementById('p_cache')?.value) || 0;
    const valorParcela = cache > 0 ? parseFloat((cache / n).toFixed(2)) : 0;
    const liquido = cache; // sem dedução de produtora
    const labels = ['Entrada', '2ª parcela', '3ª parcela', '4ª parcela', '5ª parcela'];

    // Carregar datas existentes se estiver editando
    let datasExistentes = [];
    try {
        const propostaEl = document.getElementById('proposta-form');
        if (propostaEl) {
            const cronStr = propostaEl.dataset.cronograma;
            if (cronStr) {
                const cron = JSON.parse(cronStr);
                datasExistentes = (cron.cronograma || []).map(c => c.data_vencimento || '');
            }
        }
    } catch(e) {}

    let html = '';
    for (let i = 0; i < n; i++) {
        // Última parcela recebe o ajuste de arredondamento
        const v = i === n - 1 ? parseFloat((liquido - valorParcela * (n - 1)).toFixed(2)) : valorParcela;
        const dataVal = datasExistentes[i] || '';
        html += `
        <div class="parcela-linha" style="display:grid;grid-template-columns:1fr 110px 140px;gap:8px;align-items:center;margin-bottom:8px;">
            <input class="parcela-desc" placeholder="${labels[i] || `Parcela ${i+1}`}" value="${labels[i] || `Parcela ${i+1}`}"
                   style="padding:6px 8px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);font-size:12px;">
            <div style="position:relative;">
                <span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:11px;color:var(--text-muted);">R$</span>
                <input type="number" class="parcela-valor" value="${v}" min="0" step="0.01"
                       oninput="Modals.validarValores()"
                       style="padding:6px 8px 6px 28px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);font-size:12px;width:100%;">
            </div>
            <input type="date" class="parcela-data" value="${dataVal}"
                   oninput="Modals.atualizarCronograma()"
                   style="padding:6px 8px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);font-size:12px;width:100%;">
        </div>`;
    }
    const el = document.getElementById('pag_parcelas_linhas');
    if (el) { el.innerHTML = html; Modals.validarValores(); Modals.atualizarCronograma(); }
};

Modals.validarValores = function() {
    const inputs = document.querySelectorAll('.parcela-valor');
    const total  = Array.from(inputs).reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
    const cache  = parseFloat(document.getElementById('p_cache')?.value) || 0;
    const el = document.getElementById('pag_pct_total');
    if (el) {
        const ok = Math.abs(total - cache) < 0.02;
        el.textContent = `Total: ${Utils.formatCurrency(total)} ${ok ? '✅' : `⚠️ deve somar ${Utils.formatCurrency(cache)}`}`;
        el.style.color = ok ? 'var(--success)' : 'var(--danger)';
    }
    Modals.atualizarCronograma();
};

Modals.atualizarCronograma = function() {
    const cache      = parseFloat(document.getElementById('p_cache')?.value) || 0;
    const liquido    = cache; // sem dedução de produtora
    const tipo       = document.getElementById('pag_tipo')?.value || 'avista';
    const prev       = document.getElementById('cronograma_preview');
    const linhasEl   = document.getElementById('cronograma_linhas');
    if (!prev || !linhasEl) return;

    if (liquido <= 0) { prev.style.display = 'none'; return; }

    let items = [];

    if (tipo === 'avista') {
        const dataStr = document.getElementById('pag_avista_data')?.value;
        if (!dataStr) { prev.style.display = 'none'; return; }
        const venc = new Date(dataStr + 'T12:00:00');
        items = [{ desc: 'Pagamento integral', valor: liquido, venc }];
    } else {
        document.querySelectorAll('.parcela-linha').forEach((linha, i) => {
            const valor   = parseFloat(linha.querySelector('.parcela-valor')?.value) || 0;
            const dataStr = linha.querySelector('.parcela-data')?.value;
            const desc    = linha.querySelector('.parcela-desc')?.value || `Parcela ${i+1}`;
            const venc    = dataStr ? new Date(dataStr + 'T12:00:00') : null;
            if (venc) items.push({ desc, valor, venc });
        });
        if (items.length === 0) { prev.style.display = 'none'; return; }
    }

    prev.style.display = 'block';
    linhasEl.innerHTML = items.map((it) => {
        const hoje  = new Date();
        const diff  = Math.ceil((it.venc - hoje) / 86400000);
        const alert = diff < 0 ? '🔴' : diff <= 7 ? '🟡' : '🟢';
        return `<div class="resumo-row">
            <span>${alert} ${it.desc}</span>
            <strong style="color:var(--success);">${Utils.formatCurrency(it.valor)} <span style="color:var(--text-muted);font-weight:400;font-size:11px;">· ${it.venc.toLocaleDateString('pt-BR')}</span></strong>
        </div>`;
    }).join('');
};

// ============================================================
// MODAL: GERAR PDF DA PROPOSTA
// ============================================================
Modals.showGerarPropostaPDF = async function(propostaId) {
    // Buscar proposta completa
    const res = await sbClient.from('propostas').select('*').eq('id', propostaId).single();
    if (res.error || !res.data) { alert('Erro ao carregar proposta.'); return; }
    const p = res.data;

    // Buscar artista (incluindo dados bancários)
    let artistaNome = '';
    let artistaBanco = {};
    let artistaDuracao = '';
    if (p.artista_id) {
        const ar = await sbClient.from('artistas').select('nome,dados_bancarios,duracao_show').eq('id', p.artista_id).single();
        if (ar.data) {
            artistaNome = ar.data.nome;
            artistaDuracao = ar.data.duracao_show || '';
            try {
                artistaBanco = (typeof ar.data.dados_bancarios === 'string'
                    ? JSON.parse(ar.data.dados_bancarios)
                    : ar.data.dados_bancarios) || {};
            } catch(e) { artistaBanco = {}; }
        }
    }

    // Carregar dados_pdf salvos anteriormente
    let savedPDF = {};
    try {
        const raw = p.dados_pdf;
        savedPDF = (typeof raw === 'string' ? JSON.parse(raw) : raw) || {};
    } catch(e) { savedPDF = {}; }

    // isPrefeitura: usa tipo salvo se disponível, senão detecta automático
    const isPrefeitura = savedPDF.tipo
        ? savedPDF.tipo === 'prefeitura'
        : (p.tipo_contratante === 'PJ' &&
           ((p.razao_social || '').toLowerCase().includes('prefeitura') ||
            (p.razao_social || '').toLowerCase().includes('municipio') ||
            (p.razao_social || '').toLowerCase().includes('município')));

    // Itens: usa salvos se existirem, senão defaults
    let itensExistentes = [];
    if (savedPDF.itens && savedPDF.itens.length) {
        itensExistentes = savedPDF.itens;
    } else {
        try { itensExistentes = JSON.parse(p.itens_proposta || '[]'); } catch(e) {}
        if (!itensExistentes.length) {
            itensExistentes = [
                { desc: 'CACHÊ ARTÍSTICO DO CANTOR', valor: '' },
                { desc: 'DIREITOS AUTORAIS E ECAD', valor: '' },
                { desc: 'APOIO LOGÍSTICO – SOM, LUZ E PALCO PARA REALIZAÇÃO DO SHOW', valor: '' },
            ];
            if (!isPrefeitura) itensExistentes.push({ desc: 'JATINHO (IDA E VOLTA)', valor: '' });
        }
    }

    // Obrigações: salvas ou default
    const obgDefault = savedPDF.obrigacoes !== undefined
        ? savedPDF.obrigacoes
        : (p.obrigacoes_contratante || [
            'HOSPEDAGEM: 20 (VINTE) APARTAMENTOS DUPLOS COM CAFÉ DA MANHÃ NAS NOITES ANTERIORES E POSTERIORES AO SHOW;',
            'ALIMENTAÇÃO: 20 (VINTE) REFEIÇÕES NO DIA DO SHOW;',
            'TRANSPORTE: 02 (DOIS) VAN OU MICRO-ÔNIBUS;',
            'CAMARIM: DEVIDAMENTE MONTADO COM BANHEIRO PRIVATIVO;',
            'SEGURANÇA: PARA A BANDA E PARA O ARTISTA DURANTE TODO O SHOW.',
        ].join('\n'));

    const validadeDias = savedPDF.validade || p.validade_proposta || 10;

    const formaPagamentoDefault = savedPDF.formaPagamento !== undefined
        ? savedPDF.formaPagamento
        : 'a) O pagamento de 50% (Cinquenta por Cento) do valor total descrito acima, deve ser feito no ato da assinatura do contrato e enviado comprovante, assim como contrato assinado via e-mail pelo endereço eletrônico alexandre.gibson.ag@gmail.com para devida baixa em sistema.\n\nb) O restante do pagamento, deve ser quitado em até 5 (cinco) dias úteis bancários antes da data do evento, mediante envio do comprovante via e-mail pelo endereço eletrônico alexandre.gibson.ag@gmail.com.\n\nOBSERVAÇÕES: A previsão da data do pagamento deve constar no contrato pela parte que confeccionar esse negócio jurídico.';

    // Dados bancários: sobrescreve com o que foi salvo (usuário pode ter editado no modal)
    if (savedPDF.banco && Object.keys(savedPDF.banco).length) {
        artistaBanco = Object.assign({}, artistaBanco, savedPDF.banco);
    }

    // Cronograma de pagamento
    let cronograma = [];
    try {
        var rawCp = p.condicoes_pagamento;
        if (typeof rawCp === 'string') rawCp = JSON.parse(rawCp);
        if (rawCp && Array.isArray(rawCp.cronograma)) cronograma = rawCp.cronograma;
        else if (Array.isArray(rawCp)) cronograma = rawCp;
    } catch(e) { cronograma = []; }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'modalGerarPDF';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:680px;max-height:90vh;overflow-y:auto;">
            <div class="modal-header" style="background:var(--brand-primary);color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;">
                <h3 style="margin:0;font-size:16px;"><i class="fas fa-file-pdf"></i> Gerar PDF da Proposta</h3>
                <button onclick="document.getElementById('modalGerarPDF').remove()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;">×</button>
            </div>
            <div style="padding:20px;">

                <!-- Info resumida -->
                <div style="background:var(--bg-secondary);border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px;">
                    <strong>${artistaNome}</strong> · ${p.cidade_evento || '—'}/${p.estado_evento || '—'} ·
                    ${p.data_evento ? Utils.formatDate(p.data_evento) : '—'} ·
                    <span style="color:var(--brand-primary);font-weight:600;">${Utils.formatCurrency(p.cache_bruto || 0)}</span>
                </div>

                <!-- Tipo de proposta -->
                <div class="form-group" style="margin-bottom:14px;">
                    <label style="font-size:12px;font-weight:600;color:var(--text-muted);">TIPO DE PROPOSTA</label>
                    <div style="display:flex;gap:10px;margin-top:6px;">
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
                            <input type="radio" name="pdf_tipo" value="particular" ${!isPrefeitura ? 'checked' : ''} onchange="Modals._pdfTipoChange(this.value)">
                            Particular / Empresa Privada
                        </label>
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
                            <input type="radio" name="pdf_tipo" value="prefeitura" ${isPrefeitura ? 'checked' : ''} onchange="Modals._pdfTipoChange(this.value)">
                            Prefeitura Municipal
                        </label>
                    </div>
                </div>

                <!-- Duração -->
                <div class="form-group" style="margin-bottom:14px;">
                    <label style="font-size:12px;font-weight:600;color:var(--text-muted);">DURAÇÃO DO SHOW</label>
                    <input type="text" id="pdf_duracao" class="form-control" style="margin-top:4px;"
                        value="${p.duracao_show || artistaDuracao || '90 min (noventa minutos) – 1h30m'}" placeholder="Ex: 90 min (noventa minutos)">
                </div>

                <!-- Equipe -->
                <div class="form-group" style="margin-bottom:14px;">
                    <label style="font-size:12px;font-weight:600;color:var(--text-muted);">NÚMERO DE PESSOAS NA EQUIPE</label>
                    <input type="number" id="pdf_equipe" class="form-control" style="margin-top:4px;width:120px;"
                        value="${p.equipe_pessoas || 20}" min="1">
                </div>

                <!-- Itens do preço -->
                <div class="form-group" style="margin-bottom:14px;">
                    <label style="font-size:12px;font-weight:600;color:var(--text-muted);">COMPOSIÇÃO DO VALOR</label>
                    <div id="pdf_itens" style="margin-top:8px;display:flex;flex-direction:column;gap:6px;">
                        ${itensExistentes.map((it, i) => Modals._renderItemPDFRow(it, i, isPrefeitura)).join('')}
                    </div>
                    <button onclick="Modals._addItemPDFRow()" style="margin-top:8px;background:none;border:1px dashed var(--border-color);color:var(--text-muted);padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;width:100%;">
                        <i class="fas fa-plus"></i> Adicionar item
                    </button>
                </div>

                <!-- Obrigações do contratante -->
                <div class="form-group" style="margin-bottom:14px;">
                    <label style="font-size:12px;font-weight:600;color:var(--text-muted);">OBRIGAÇÕES DO CONTRATANTE (uma por linha)</label>
                    <textarea id="pdf_obrigacoes" class="form-control" style="margin-top:4px;min-height:100px;font-size:12px;" rows="6">${obgDefault}</textarea>
                </div>

                <!-- Validade -->
                <div class="form-group" style="margin-bottom:14px;">
                    <label style="font-size:12px;font-weight:600;color:var(--text-muted);">VALIDADE DA PROPOSTA (dias)</label>
                    <input type="number" id="pdf_validade" class="form-control" style="margin-top:4px;width:120px;"
                        value="${validadeDias}" min="1" max="365">
                </div>

                <!-- Condições de Pagamento -->
                <div class="form-group" style="margin-bottom:14px;">
                    <label style="font-size:12px;font-weight:600;color:var(--text-muted);">CONDIÇÕES DE PAGAMENTO (editável)</label>
                    <textarea id="pdf_forma_pagamento" class="form-control" style="margin-top:4px;min-height:140px;font-size:12px;" rows="8">${formaPagamentoDefault}</textarea>
                </div>

                <!-- Dados para pagamento -->
                <div style="background:var(--bg-secondary);border-radius:8px;padding:14px;margin-bottom:20px;">
                    <label style="font-size:12px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:10px;">DADOS PARA PAGAMENTO</label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        <div>
                            <label style="font-size:11px;color:var(--text-muted);">Razão Social</label>
                            <input type="text" id="pdf_banco_razao" class="form-control" style="font-size:12px;margin-top:2px;" value="${artistaBanco.razao || ''}" placeholder="Razão Social">
                        </div>
                        <div>
                            <label style="font-size:11px;color:var(--text-muted);">CNPJ</label>
                            <input type="text" id="pdf_banco_cnpj" class="form-control" style="font-size:12px;margin-top:2px;" value="${artistaBanco.cnpj || ''}" placeholder="CNPJ">
                        </div>
                        <div>
                            <label style="font-size:11px;color:var(--text-muted);">Banco</label>
                            <input type="text" id="pdf_banco_nome" class="form-control" style="font-size:12px;margin-top:2px;" value="${artistaBanco.banco || ''}" placeholder="Banco">
                        </div>
                        <div>
                            <label style="font-size:11px;color:var(--text-muted);">Agência</label>
                            <input type="text" id="pdf_banco_ag" class="form-control" style="font-size:12px;margin-top:2px;" value="${artistaBanco.agencia || ''}" placeholder="Agência">
                        </div>
                        <div>
                            <label style="font-size:11px;color:var(--text-muted);">Conta C/C</label>
                            <input type="text" id="pdf_banco_cc" class="form-control" style="font-size:12px;margin-top:2px;" value="${artistaBanco.conta || ''}" placeholder="Conta">
                        </div>
                        <div>
                            <label style="font-size:11px;color:var(--text-muted);">Chave PIX</label>
                            <input type="text" id="pdf_pix" class="form-control" style="font-size:12px;margin-top:2px;" value="${artistaBanco.pix || ''}" placeholder="Chave PIX">
                        </div>
                        <div>
                            <label style="font-size:11px;color:var(--text-muted);">Titular PIX</label>
                            <input type="text" id="pdf_pix_titular" class="form-control" style="font-size:12px;margin-top:2px;" value="${artistaBanco.pixTitular || ''}" placeholder="Nome do titular">
                        </div>
                    </div>
                </div>

                <!-- Botões -->
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button onclick="document.getElementById('modalGerarPDF').remove()" class="btn-secondary">
                        Cancelar
                    </button>
                    <button onclick="Modals._submitGerarPDF('${propostaId}')" class="btn-primary" style="background:var(--brand-primary);">
                        <i class="fas fa-file-pdf"></i> Gerar PDF
                    </button>
                </div>

            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

Modals._renderItemPDFRow = function(item, index, mostrarValor) {
    return `
        <div class="pdf-item-row" style="display:flex;gap:6px;align-items:center;" data-index="${index}">
            <input type="text" class="form-control pdf-item-desc" style="flex:1;font-size:12px;"
                placeholder="Descrição do item" value="${item.desc || ''}">
            <input type="number" class="form-control pdf-item-valor"
                style="width:130px;font-size:12px;display:${mostrarValor ? 'block' : 'none'};"
                placeholder="Valor (R$)" value="${item.valor || ''}">
            <button onclick="this.closest('.pdf-item-row').remove()" style="background:none;border:none;color:var(--danger);cursor:pointer;padding:4px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
};

Modals._addItemPDFRow = function() {
    const tipo = document.querySelector('input[name="pdf_tipo"]:checked')?.value;
    const mostrarValor = tipo === 'prefeitura';
    const container = document.getElementById('pdf_itens');
    const div = document.createElement('div');
    div.innerHTML = Modals._renderItemPDFRow({ desc: '', valor: '' }, Date.now(), mostrarValor);
    container.appendChild(div.firstElementChild);
};

Modals._pdfTipoChange = function(tipo) {
    const isPrefeitura = tipo === 'prefeitura';
    document.querySelectorAll('.pdf-item-valor').forEach(el => {
        el.style.display = isPrefeitura ? 'block' : 'none';
    });
};

Modals._submitGerarPDF = async function(propostaId) {
    const tipo = document.querySelector('input[name="pdf_tipo"]:checked')?.value || 'particular';
    const duracao = document.getElementById('pdf_duracao')?.value || '';
    const equipe = parseInt(document.getElementById('pdf_equipe')?.value) || 20;
    const obrigacoes = document.getElementById('pdf_obrigacoes')?.value || '';
    const validade = parseInt(document.getElementById('pdf_validade')?.value) || 10;
    const formaPagamento = document.getElementById('pdf_forma_pagamento')?.value || '';

    // Coletar itens
    const itensList = [];
    document.querySelectorAll('.pdf-item-row').forEach(row => {
        const desc = row.querySelector('.pdf-item-desc')?.value?.trim();
        const valor = parseFloat(row.querySelector('.pdf-item-valor')?.value) || 0;
        if (desc) itensList.push({ desc, valor });
    });

    const dadosBancarios = {
        razao: document.getElementById('pdf_banco_razao')?.value || '',
        cnpj: document.getElementById('pdf_banco_cnpj')?.value || '',
        banco: document.getElementById('pdf_banco_nome')?.value || '',
        agencia: document.getElementById('pdf_banco_ag')?.value || '',
        conta: document.getElementById('pdf_banco_cc')?.value || '',
        pix: document.getElementById('pdf_pix')?.value || '',
        pixTitular: document.getElementById('pdf_pix_titular')?.value || '',
    };

    // Salvar campos no banco
    await sbClient.from('propostas').update({
        duracao_show: duracao,
        itens_proposta: JSON.stringify(itensList),
        obrigacoes_contratante: obrigacoes,
        validade_proposta: validade,
    }).eq('id', propostaId);

    // Buscar proposta atualizada com artista
    const res = await sbClient.from('propostas').select('*').eq('id', propostaId).single();
    let proposta = res.data || {};
    if (proposta.artista_id) {
        const ar = await sbClient.from('artistas').select('nome').eq('id', proposta.artista_id).single();
        proposta._artistaNome = ar.data?.nome || '';
    }

    document.getElementById('modalGerarPDF')?.remove();

    // Cronograma de pagamento da proposta
    var cronogramaFinal = [];
    try {
        var rawCp = proposta.condicoes_pagamento;
        if (typeof rawCp === 'string') rawCp = JSON.parse(rawCp);
        var arr = (rawCp && Array.isArray(rawCp.cronograma)) ? rawCp.cronograma : (Array.isArray(rawCp) ? rawCp : []);
        cronogramaFinal = arr.map(function(c) {
            return {
                desc:  c.desc || c.descricao || c.parcela || 'Parcela',
                valor: c.valor || c.amount || 0,
                venc:  c.venc || c.data || c.data_vencimento || '',
            };
        });
    } catch(e) {}

    // Gerar HTML do template e abrir nova aba para impressão
    var dadosPDF = { tipo, duracao, equipe, obrigacoes, validade, itens: itensList, banco: dadosBancarios, cronograma: cronogramaFinal, formaPagamento };
    var htmlContent = tipo === 'prefeitura'
        ? PropostaTemplate.gerarPrefeitura(proposta, dadosPDF)
        : PropostaTemplate.gerarAutonomo(proposta, dadosPDF);

    var win = window.open('', '_blank');
    if (win) {
        win.document.write(htmlContent);
        win.document.close();
        win.focus();
        setTimeout(function() { win.print(); }, 800);
    } else {
        Swal.fire('Popup bloqueado', 'Permita popups para este site para gerar o PDF.', 'warning');
    }
};
