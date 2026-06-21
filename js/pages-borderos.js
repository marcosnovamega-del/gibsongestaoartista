/* ========================================
   KSHOW MANAGER - BORDERÔ FINANCEIRO
   Lógica e UI do Fechamento de Eventos
======================================== */

Pages.renderBorderos = async function() {
    Utils.showLoading();
    
    // Garantir que todos os eventos passados tenham um Borderô criado
    await this.sincronizarBorderosComEventos();

    const [borderos, eventos] = await Promise.all([
        BorderosDB.listar(),
        EventosDB.listar()
    ]);

    Utils.hideLoading();

    // Juntar dados
    const borderosFull = borderos.map(b => {
        const evt = eventos.find(e => e.id === b.evento_id);
        return {
            ...b,
            evento: evt || { data: new Date().toISOString(), cidade: 'Desconhecido', uf: '', local: '' },
            artista_id: evt ? evt.artista_id : null
        };
    }).sort((a, b) => new Date(b.evento.data) - new Date(a.evento.data));

    // KPIs
    const totalLucro = borderosFull.reduce((sum, b) => sum + (parseFloat(b.lucro_liquido) || 0), 0);
    const borderosFinalizados = borderosFull.filter(b => b.status === 'FINALIZADO' || b.status === 'APROVADO');
    const ticketMedio = borderosFinalizados.length > 0 ? (totalLucro / borderosFinalizados.length) : 0;

    const html = `
        <div class="bordero-container fade-in">
            <div class="bordero-header">
                <h2><i class="fas fa-file-invoice-dollar"></i> Borderôs & Fechamentos</h2>
                <div style="display:flex; gap:10px;">
                    <button class="btn-primary" onclick="Pages.renderBorderos()">
                        <i class="fas fa-sync-alt"></i> Atualizar
                    </button>
                </div>
            </div>

            <!-- KPIs -->
            <div class="bordero-kpi-grid">
                <div class="bordero-kpi-card kpi-gold">
                    <div class="bordero-kpi-title"><i class="fas fa-chart-line"></i> Lucro Líquido Global</div>
                    <div class="bordero-kpi-value">${Utils.formatCurrency(totalLucro)}</div>
                </div>
                <div class="bordero-kpi-card kpi-green">
                    <div class="bordero-kpi-title"><i class="fas fa-check-circle"></i> Fechamentos Concluídos</div>
                    <div class="bordero-kpi-value">${borderosFinalizados.length}</div>
                </div>
                <div class="bordero-kpi-card kpi-red">
                    <div class="bordero-kpi-title"><i class="fas fa-ticket-alt"></i> Ticket Médio (Lucro/Show)</div>
                    <div class="bordero-kpi-value">${Utils.formatCurrency(ticketMedio)}</div>
                </div>
            </div>

            <!-- Lista -->
            <div class="bordero-table-wrapper">
                <table class="bordero-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Evento</th>
                            <th>Receita Bruta</th>
                            <th>Despesas+Comissões</th>
                            <th>Lucro Líquido</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${borderosFull.length > 0 ? borderosFull.map(b => `
                            <tr>
                                <td style="font-weight:600; color:var(--text-muted);">${Utils.formatDate(b.evento.data)}</td>
                                <td>
                                    <div style="font-weight:700;">${b.evento.cidade} - ${b.evento.uf}</div>
                                    <div style="font-size:11px; color:var(--text-muted);">${b.evento.local}</div>
                                </td>
                                <td style="color:#10B981; font-weight:600;">${Utils.formatCurrency(b.receita_total)}</td>
                                <td style="color:#EF4444; font-weight:600;">${Utils.formatCurrency(parseFloat(b.despesa_total) + parseFloat(b.comissao_total))}</td>
                                <td>
                                    <span style="font-weight:800; color:${b.lucro_liquido >= 0 ? '#D4AF37' : '#EF4444'};">
                                        ${Utils.formatCurrency(b.lucro_liquido)}
                                    </span>
                                </td>
                                <td>
                                    <span class="status-bordero ${b.status.toLowerCase().replace(' ', '')}">
                                        ${b.status}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn-secondary btn-sm" onclick="Pages.abrirDetalhesBordero('${b.id}')">
                                        <i class="fas fa-folder-open"></i> Abrir
                                    </button>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr><td colspan="7" style="text-align:center; padding:30px;">Nenhum borderô gerado ainda.</td></tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
};

// Sincronização automática de Eventos -> Borderôs
Pages.sincronizarBorderosComEventos = async function() {
    const eventos = await EventosDB.listar();
    const borderos = await BorderosDB.listar();
    
    // Hoje
    const hoje = new Date();
    
    for (const evt of eventos) {
        const existe = borderos.find(b => b.evento_id === evt.id);
        
        // Regra de criação: Cria borderô se o evento já passou ou está acontecendo
        // ou criar para todos? Melhor criar para todos para já ir lançando despesas.
        if (!existe) {
            await BorderosDB.criar({
                evento_id: evt.id,
                receita_total: evt.cache_bruto || evt.valor_liquido || 0,
                despesa_total: 0,
                comissao_total: (evt.cache_bruto * (evt.comissao || 0) / 100) || 0,
                lucro_liquido: evt.valor_liquido || 0,
                status: 'EM ABERTO',
                observacoes: ''
            });
        }
    }
};

// ==========================================
// DETALHES DO BORDERÔ (FECHAMENTO)
// ==========================================
Pages.abrirDetalhesBordero = async function(borderoId) {
    Utils.showLoading();
    
    const bordero = await DB.getById('borderos', borderoId);
    if (!bordero) return;
    
    const evento = await EventosDB.buscarPorId(bordero.evento_id);
    const artista = evento ? await ArtistasDB.buscarPorId(evento.artista_id) : null;
    
    // Buscar Despesas atreladas ao evento
    let despesasEvento = await DespesasDB.buscarPorEvento(bordero.evento_id);
    
    Utils.hideLoading();

    // Motor de Cálculo Dinâmico (Re-calcula sempre que abre se não estiver fechado)
    let receitasExtras = 0; // Se houver campo no futuro
    let cacheBruto = parseFloat(evento.cache_bruto || evento.valor_liquido) || 0;
    let receitaTotal = cacheBruto + receitasExtras;
    
    let despesasTotais = 0;
    
    // Comissão nativa do evento (Agência/Escritório)
    let comissaoPorcentagem = parseFloat(evento.comissao) || 0;
    let comissaoEscritorio = (cacheBruto * comissaoPorcentagem) / 100;
    let comissoesTotais = comissaoEscritorio;
    
    const isLocked = bordero.status === 'FINALIZADO' || bordero.status === 'APROVADO';

    // Separar Despesas Operacionais de Comissões (lançadas separadamente)
    const despesasOperacionais = [];
    const listaComissoes = [];
    
    // Adicionar a comissão do escritório na lista visual
    if (comissaoEscritorio > 0) {
        listaComissoes.push({
            tipo: 'Comissão Escritório/Agência',
            descricao: `${comissaoPorcentagem}% do Cachê`,
            valor: comissaoEscritorio,
            isNativa: true // Flag para não renderizar botão de exclusão
        });
    }
    
    despesasEvento.forEach(d => {
        const valor = parseFloat(d.valor) || 0;
        if (d.tipo && d.tipo.toLowerCase().includes('comissão') || d.tipo === 'Músicos') {
            comissoesTotais += valor;
            listaComissoes.push(d);
        } else {
            despesasTotais += valor;
            despesasOperacionais.push(d);
        }
    });

    const lucroLiquido = receitaTotal - despesasTotais - comissoesTotais;

    // Se não estiver bloqueado, atualiza os valores no DB em background
    if (!isLocked) {
        BorderosDB.atualizar(borderoId, {
            receita_total: receitaTotal,
            despesa_total: despesasTotais,
            comissao_total: comissoesTotais,
            lucro_liquido: lucroLiquido
        });
        bordero.receita_total = receitaTotal;
        bordero.despesa_total = despesasTotais;
        bordero.comissao_total = comissoesTotais;
        bordero.lucro_liquido = lucroLiquido;
    }

    const html = `
        <div class="bordero-container fade-in">
            <!-- Header Retorno -->
            <div style="margin-bottom:20px; display:flex; align-items:center; gap:12px;">
                <button class="btn-secondary" onclick="Pages.renderBorderos()" style="padding:8px 12px;">
                    <i class="fas fa-arrow-left"></i> Voltar
                </button>
                <div style="flex:1;">
                    <h2 style="margin:0; font-size:22px;">Fechamento de Evento</h2>
                    <p style="margin:0; color:var(--text-muted); font-size:13px;">${evento.cidade} - ${evento.uf} | ${Utils.formatDate(evento.data)}</p>
                </div>
                ${!isLocked && (Auth.isAdmin() || Auth.isFinanceiro()) ? `
                    <button class="btn-primary" onclick="Pages.alterarStatusBordero('${borderoId}', 'FINALIZADO')" style="background:#8B5CF6; border-color:#8B5CF6;">
                        <i class="fas fa-lock"></i> Finalizar Borderô
                    </button>
                ` : ''}
                ${bordero.status === 'FINALIZADO' && (Auth.isAdmin() || Auth.isFinanceiro()) ? `
                    <button class="btn-primary" onclick="Pages.alterarStatusBordero('${borderoId}', 'APROVADO')" style="background:#10B981; border-color:#10B981;">
                        <i class="fas fa-check-double"></i> Aprovar Financeiro
                    </button>
                ` : ''}
                <button class="btn-secondary" onclick="Pages.exportarBorderoPDF('${borderoId}')">
                    <i class="fas fa-file-pdf"></i> Exportar PDF
                </button>
            </div>

            <div class="bordero-panel">
                <!-- Coluna Esquerda (Listas) -->
                <div>
                    <!-- Receitas -->
                    <div class="bordero-section">
                        <div class="bordero-section-header">
                            <div class="bordero-section-title">
                                <i class="fas fa-arrow-down" style="color:#10B981;"></i> Receitas
                            </div>
                            ${!isLocked ? `<button class="btn-secondary btn-sm" onclick="alert('Adicionar Receita Extra')"><i class="fas fa-plus"></i> Extra</button>` : ''}
                        </div>
                        <div class="bordero-item-list">
                            <div class="bordero-item">
                                <div class="bordero-item-info">
                                    <div class="bordero-item-icon icon-receita"><i class="fas fa-microphone"></i></div>
                                    <div>
                                        <div class="bordero-item-desc">Cachê do Show</div>
                                        <div class="bordero-item-sub">Conforme cadastro do Evento</div>
                                    </div>
                                </div>
                                <div class="bordero-item-value value-positive">
                                    + ${Utils.formatCurrency(cacheBruto)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Despesas Operacionais -->
                    <div class="bordero-section">
                        <div class="bordero-section-header">
                            <div class="bordero-section-title">
                                <i class="fas fa-arrow-up" style="color:#EF4444;"></i> Despesas Operacionais
                            </div>
                            ${!isLocked ? `<button class="btn-secondary btn-sm" onclick="Modals.showAddDespesaForm('${evento.id}')"><i class="fas fa-plus"></i> Lançar</button>` : ''}
                        </div>
                        <div class="bordero-item-list">
                            ${despesasOperacionais.length > 0 ? despesasOperacionais.map(d => `
                                <div class="bordero-item">
                                    <div class="bordero-item-info">
                                        <div class="bordero-item-icon icon-despesa">
                                            <i class="fas ${d.tipo === 'Combustível' ? 'fa-gas-pump' : d.tipo === 'Hotel' ? 'fa-bed' : d.tipo === 'Alimentação' ? 'fa-utensils' : 'fa-receipt'}"></i>
                                        </div>
                                        <div>
                                            <div class="bordero-item-desc">${d.tipo} ${d.descricao ? `- ${d.descricao}` : ''}</div>
                                            <div class="bordero-item-sub">Status: ${d.status} | Por: ${d.criado_por || 'Sistema'}</div>
                                        </div>
                                    </div>
                                    <div style="display:flex; align-items:center; gap:12px;">
                                        ${d.comprovante_url ? `
                                            <a href="${d.comprovante_url}" target="_blank" class="btn-secondary btn-sm" title="Ver Comprovante"><i class="fas fa-image"></i></a>
                                        ` : ''}
                                        <div class="bordero-item-value value-negative">
                                            - ${Utils.formatCurrency(d.valor)}
                                        </div>
                                    </div>
                                </div>
                            `).join('') : '<div style="text-align:center;color:var(--text-muted);font-size:12px;padding:10px;">Nenhuma despesa lançada.</div>'}
                        </div>
                    </div>

                    <!-- Comissões -->
                    <div class="bordero-section">
                        <div class="bordero-section-header">
                            <div class="bordero-section-title">
                                <i class="fas fa-handshake" style="color:#F59E0B;"></i> Comissões e Repasses
                            </div>
                            ${!isLocked ? `<button class="btn-secondary btn-sm" onclick="Modals.showAddDespesaForm('${evento.id}')"><i class="fas fa-plus"></i> Adicionar</button>` : ''}
                        </div>
                        <div class="bordero-item-list">
                            ${listaComissoes.length > 0 ? listaComissoes.map(c => `
                                <div class="bordero-item">
                                    <div class="bordero-item-info">
                                        <div class="bordero-item-icon icon-comissao"><i class="fas fa-user-tie"></i></div>
                                        <div>
                                            <div class="bordero-item-desc">${c.tipo} ${c.descricao ? `- ${c.descricao}` : ''}</div>
                                            ${!c.isNativa ? `<div class="bordero-item-sub">Por: ${c.criado_por || 'Sistema'}</div>` : ''}
                                        </div>
                                    </div>
                                    <div style="display:flex; align-items:center; gap:12px;">
                                        ${!c.isNativa && !isLocked ? `
                                            <button class="btn-secondary btn-sm" onclick="Pages.deletarDespesaBordero('${c.id}', '${borderoId}')" style="color:#EF4444;" title="Remover"><i class="fas fa-trash"></i></button>
                                        ` : ''}
                                        <div class="bordero-item-value value-negative" style="color:#F59E0B;">
                                            - ${Utils.formatCurrency(c.valor)}
                                        </div>
                                    </div>
                                </div>
                            `).join('') : '<div style="text-align:center;color:var(--text-muted);font-size:12px;padding:10px;">Nenhuma comissão registrada.</div>'}
                        </div>
                    </div>
                </div>

                <!-- Coluna Direita (Resumo Fixo) -->
                <div>
                    <div class="bordero-summary">
                        <div style="text-align:center; margin-bottom:20px;">
                            ${artista && artista.foto ? `<img src="${artista.foto}" style="width:60px; height:60px; border-radius:50%; border:2px solid #D4AF37; margin-bottom:10px; object-fit:cover;">` : ''}
                            <h3 style="margin:0; font-size:18px;">${artista ? artista.nome : 'Artista'}</h3>
                            <span class="status-bordero ${bordero.status.toLowerCase().replace(' ', '')}" style="margin-top:8px;">${bordero.status}</span>
                        </div>
                        
                        <div class="bordero-summary-row">
                            <span>Receita Total</span>
                            <span style="color:#10B981; font-weight:600;">${Utils.formatCurrency(bordero.receita_total)}</span>
                        </div>
                        <div class="bordero-summary-row">
                            <span>Despesas Operacionais</span>
                            <span style="color:#EF4444; font-weight:600;">- ${Utils.formatCurrency(bordero.despesa_total)}</span>
                        </div>
                        <div class="bordero-summary-row">
                            <span>Comissões</span>
                            <span style="color:#F59E0B; font-weight:600;">- ${Utils.formatCurrency(bordero.comissao_total)}</span>
                        </div>
                        
                        <div class="bordero-summary-total">
                            <span>LUCRO LÍQUIDO</span>
                            <strong>${Utils.formatCurrency(bordero.lucro_liquido)}</strong>
                        </div>

                        ${isLocked ? `
                            <div style="margin-top:24px; padding:12px; background:rgba(255,255,255,0.05); border-radius:8px; text-align:center; font-size:12px; color:var(--text-muted);">
                                <i class="fas fa-lock" style="color:#D4AF37; margin-bottom:6px; font-size:16px;"></i><br>
                                Fechamento bloqueado para edição.<br>Status atual: ${bordero.status}.
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
};

// Alteração de Status Workflow
Pages.alterarStatusBordero = async function(id, novoStatus) {
    if (!await Utils.confirm(`Deseja alterar o status do borderô para ${novoStatus}?`)) return;
    
    Utils.showLoading();
    await BorderosDB.atualizar(id, { status: novoStatus });
    Utils.hideLoading();
    
    Utils.showToast(`Borderô ${novoStatus} com sucesso!`, 'success');
    Pages.abrirDetalhesBordero(id); // Recarrega a página do borderô
};

Pages.deletarDespesaBordero = async function(despesaId, borderoId) {
    if (!await Utils.confirm('Remover esta despesa do borderô?')) return;
    Utils.showLoading();
    await DespesasDB.deletar(despesaId);
    Utils.hideLoading();
    Utils.showToast('Item removido com sucesso.', 'success');
    Pages.abrirDetalhesBordero(borderoId);
};

// ==========================================
// EXPORTAÇÃO PDF EXECUTIVO
// ==========================================
Pages.exportarBorderoPDF = async function(borderoId) {
    Utils.showLoading();
    try {
        const bordero = await DB.getById('borderos', borderoId);
        const evento = await EventosDB.buscarPorId(bordero.evento_id);
        const artista = await ArtistasDB.buscarPorId(evento.artista_id);
        const despesas = await DespesasDB.buscarPorEvento(evento.id);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configurações de Cores Premium
        const colorGold = [212, 175, 55];
        const colorDark = [30, 30, 30];
        const colorGray = [100, 100, 100];
        const colorRed = [220, 38, 38];
        const colorGreen = [16, 185, 129];

        // Cabeçalho
        doc.setFillColor(...colorDark);
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text("BORDERÔ FINANCEIRO", 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(...colorGold);
        doc.text("Gibson Manager - Fechamento Executivo", 105, 28, { align: 'center' });

        // Informações do Evento
        let yPos = 50;
        doc.setTextColor(...colorDark);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Informações do Evento", 15, yPos);
        
        yPos += 8;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Artista: ${artista?.nome || 'Não definido'}`, 15, yPos);
        doc.text(`Contratante: ${evento?.razao_social || evento?.nome_contratante || 'Não definido'}`, 110, yPos);
        
        yPos += 6;
        doc.text(`Data: ${Utils.formatDate(evento.data)}`, 15, yPos);
        doc.text(`Local: ${evento.local} (${evento.cidade}/${evento.estado})`, 110, yPos);

        yPos += 15;
        
        // Linha divisória
        doc.setDrawColor(200, 200, 200);
        doc.line(15, yPos, 195, yPos);
        yPos += 10;

        // Bloco de Receitas
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorGreen);
        doc.text("(+) RECEITAS", 15, yPos);
        yPos += 8;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colorDark);
        doc.text("Cachê Bruto do Evento", 15, yPos);
        doc.text(`${Utils.formatCurrency(parseFloat(evento.cache_bruto || evento.valor_liquido))}`, 195, yPos, { align: 'right' });
        
        yPos += 10;
        doc.line(15, yPos, 195, yPos);
        yPos += 10;

        // Bloco de Despesas e Comissões
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorRed);
        doc.text("(-) DESPESAS OPERACIONAIS", 15, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setTextColor(...colorGray);
        
        let temDespesa = false;
        despesas.forEach(d => {
            if (d.tipo && !d.tipo.toLowerCase().includes('comissão') && d.tipo !== 'Músicos') {
                temDespesa = true;
                doc.text(`${d.tipo} ${d.descricao ? `- ${d.descricao}` : ''}`, 15, yPos);
                doc.text(`${Utils.formatCurrency(d.valor)}`, 195, yPos, { align: 'right' });
                yPos += 6;
            }
        });
        
        if (!temDespesa) {
            doc.text("Nenhuma despesa lançada.", 15, yPos);
            yPos += 6;
        }

        yPos += 5;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorGold);
        doc.text("(-) COMISSÕES E REPASSES", 15, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setTextColor(...colorGray);
        
        // Comissão Nativa
        let comissaoPorcentagem = parseFloat(evento.comissao) || 0;
        let comissaoEscritorio = (parseFloat(evento.cache_bruto || evento.valor_liquido) * comissaoPorcentagem) / 100;
        if (comissaoEscritorio > 0) {
            doc.text(`Comissão Escritório/Agência (${comissaoPorcentagem}%)`, 15, yPos);
            doc.text(`${Utils.formatCurrency(comissaoEscritorio)}`, 195, yPos, { align: 'right' });
            yPos += 6;
        }

        // Outras Comissões
        despesas.forEach(d => {
            if (d.tipo && (d.tipo.toLowerCase().includes('comissão') || d.tipo === 'Músicos')) {
                doc.text(`${d.tipo} ${d.descricao ? `- ${d.descricao}` : ''}`, 15, yPos);
                doc.text(`${Utils.formatCurrency(d.valor)}`, 195, yPos, { align: 'right' });
                yPos += 6;
            }
        });

        yPos += 10;
        doc.setDrawColor(...colorGold);
        doc.line(15, yPos, 195, yPos);
        yPos += 12;

        // TOTAL GERAL
        doc.setFillColor(245, 245, 245);
        doc.rect(15, yPos - 8, 180, 20, 'F');
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorDark);
        doc.text("RESULTADO / LUCRO LÍQUIDO:", 20, yPos + 5);
        
        doc.setFontSize(16);
        doc.setTextColor(bordero.lucro_liquido >= 0 ? 16 : 220, bordero.lucro_liquido >= 0 ? 185 : 38, bordero.lucro_liquido >= 0 ? 129 : 38);
        doc.text(`${Utils.formatCurrency(bordero.lucro_liquido)}`, 190, yPos + 5, { align: 'right' });

        // Rodapé
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text(`Status do Borderô: ${bordero.status}`, 15, 280);
        doc.text(`Gerado em: ${Utils.formatDate(new Date().toISOString())} via Gibson Manager`, 195, 280, { align: 'right' });

        doc.save(`Bordero_${artista?.nome || 'Evento'}_${Utils.formatDate(evento.data).replace(/\//g, '-')}.pdf`);
        
        Utils.hideLoading();
        Utils.showToast("Borderô exportado com sucesso!", "success");
    } catch (e) {
        Utils.hideLoading();
        Utils.showToast("Erro ao exportar PDF: " + e.message, "error");
    }
};
