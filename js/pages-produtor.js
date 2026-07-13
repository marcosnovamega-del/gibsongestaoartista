/* ========================================
   GIBSON MANAGER PRO - DASHBOARD PRODUTOR
   Interface simplificada para uso em campo
   ======================================== */

Pages.renderDashboardProdutor = async function() {
    document.getElementById('pageContent').innerHTML = 
        '<div class="loading-container"><div class="loading-spinner"></div></div>';

    const [eventos, artistas] = await Promise.all([
        EventosDB.listar(),
        ArtistasDB.listar()
    ]);

    // O produtor geralmente está vinculado a um artista ou vê todos dependendo do perfil
    // Para simplificar, pegamos o primeiro artista vinculado se houver
    const artista = Auth.currentUser.artista_vinculado ? 
        artistas.find(a => a.id === Auth.currentUser.artista_vinculado) : 
        artistas[0];

    // Buscar próximo show
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const eventoProximo = eventos
        .filter(e => {
            const dataEv = new Date(e.data + 'T12:00:00');
            return dataEv >= hoje && (Auth.currentUser.artista_vinculado ? e.artista_id === Auth.currentUser.artista_vinculado : true);
        })
        .sort((a, b) => new Date(a.data) - new Date(b.data))[0];

    // Obter despesas recentes criadas por este produtor
    const todasDespesas = await DespesasDB.listar();
    const despesasProdutor = todasDespesas
        .filter(d => d.criado_por === Auth.currentUser.id)
        .sort((a, b) => new Date(b.data_hora_registro || b.created_at) - new Date(a.data_hora_registro || a.created_at))
        .slice(0, 5); // Últimas 5
        
    // HTML do Dashboard Produtor
    const html = `
        <div class="dashboard-container fade-in" style="padding: 12px; padding-bottom: 80px; max-width: 600px; margin: 0 auto;">
            
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
                <div>
                    <h2 style="font-size: 22px; margin: 0;">Olá, ${Auth.currentUser.nome.split(' ')[0]}</h2>
                    <p style="color: var(--text-muted); font-size: 13px; margin: 2px 0 0 0;">
                        ${artista ? `Produtor de <strong>${artista.nome}</strong>` : 'Nenhum artista vinculado'}
                    </p>
                </div>
                ${artista && artista.foto ? `
                    <img src="${artista.foto}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--red-primary); object-fit: cover;">
                ` : ''}
            </div>

            <!-- Próximo Show Card -->
            <div style="margin-bottom: 24px;">
                <h3 style="font-size: 15px; color: var(--text-muted); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">Próximo Show</h3>
                ${eventoProximo ? `
                    <div style="background: linear-gradient(135deg, rgba(225,6,0,0.1), rgba(20,20,20,0.8)); border: 1px solid rgba(225,6,0,0.3); border-radius: 16px; padding: 20px; position: relative; overflow: hidden;">
                        
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                            <div>
                                <div style="color: var(--red-primary); font-weight: 700; font-size: 14px; margin-bottom: 4px;">
                                    ${Utils.formatDate(eventoProximo.data)}
                                </div>
                                <h4 style="font-size: 18px; margin: 0; color: #fff;">${eventoProximo.cidade} - ${eventoProximo.estado || ''}</h4>
                            </div>
                            <div style="text-align: right;">
                                <span class="badge badge-${eventoProximo.status === 'Confirmado' ? 'success' : 'warning'}">
                                    ${eventoProximo.status}
                                </span>
                            </div>
                        </div>
                        
                        <div style="color: var(--text-muted); font-size: 13px; margin-bottom: 16px;">
                            <i class="fas fa-map-marker-alt" style="width: 16px;"></i> ${eventoProximo.local}<br>
                            ${eventoProximo.horario ? `<i class="far fa-clock" style="width: 16px; margin-top: 6px;"></i> Horário: ${eventoProximo.horario}` : ''}
                        </div>
                        
                        <div style="display: flex; gap: 10px;">
                            <button class="btn-primary" style="flex: 1; padding: 12px; font-weight: 600;" onclick="Modals.showDespesasModal('${eventoProximo.id}')">
                                <i class="fas fa-receipt"></i> Lançar Despesa
                            </button>
                            <button class="btn-secondary" style="padding: 12px;" onclick="Pages.changePage('eventos')">
                                <i class="fas fa-info-circle"></i>
                            </button>
                        </div>
                    </div>
                ` : `
                    <div style="background: var(--bg-secondary); border-radius: 12px; padding: 20px; text-align: center; border: 1px dashed var(--border-color);">
                        <i class="fas fa-calendar-times" style="font-size: 32px; color: var(--text-muted); margin-bottom: 12px;"></i>
                        <p style="color: var(--text-muted); margin: 0;">Nenhum show agendado no futuro.</p>
                    </div>
                `}
            </div>

            <!-- Despesas Recentes -->
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h3 style="font-size: 15px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin: 0;">Minhas Despesas (Recentes)</h3>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${despesasProdutor.length > 0 ? despesasProdutor.map(d => {
                        const evt = eventos.find(e => e.id === d.evento_id);
                        return `
                        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 16px; color: var(--text-muted);">
                                <i class="fas ${d.tipo === 'Combustível' ? 'fa-gas-pump' : d.tipo === 'Hotel' ? 'fa-bed' : d.tipo === 'Alimentação' ? 'fa-utensils' : 'fa-receipt'}"></i>
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    ${d.tipo} ${d.descricao ? `- ${d.descricao}` : ''}
                                </div>
                                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                                    ${evt ? evt.cidade : 'Show Desconhecido'}
                                </div>
                            </div>
                            <div style="text-align: right; flex-shrink: 0;">
                                <div style="font-weight: 700; color: #EF4444; font-size: 14px;">${Utils.formatCurrency(d.valor)}</div>
                                <div style="font-size: 10px; margin-top: 4px; display: inline-block; padding: 2px 6px; border-radius: 4px; 
                                     background: ${d.status === 'Pago' || d.status === 'Aprovado' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'};
                                     color: ${d.status === 'Pago' || d.status === 'Aprovado' ? 'var(--success)' : 'var(--warning)'};">
                                    ${d.status}
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('') : `
                        <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px; background: rgba(255,255,255,0.02); border-radius: 12px;">
                            Nenhuma despesa lançada recentemente.
                        </div>
                    `}
                </div>
            </div>

        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
};
