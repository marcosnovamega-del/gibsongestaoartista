/* ========================================
   GIBSON MANAGER PRO - ROUTE SUGGESTIONS
   Sugestão de cidades na rota após assinatura de contrato
======================================== */

// Base de cidades brasileiras com coordenadas (lat, lng)
const CIDADES_BRASIL = [
    // NORTE
    { nome: 'Manaus', estado: 'AM', lat: -3.1019, lng: -60.0250 },
    { nome: 'Belém', estado: 'PA', lat: -1.4558, lng: -48.5044 },
    { nome: 'Porto Velho', estado: 'RO', lat: -8.7612, lng: -63.9004 },
    { nome: 'Macapá', estado: 'AP', lat: 0.0389, lng: -51.0664 },
    { nome: 'Boa Vista', estado: 'RR', lat: 2.8235, lng: -60.6758 },
    { nome: 'Rio Branco', estado: 'AC', lat: -9.9754, lng: -67.8249 },
    { nome: 'Palmas', estado: 'TO', lat: -10.2491, lng: -48.3243 },
    { nome: 'Santarém', estado: 'PA', lat: -2.4441, lng: -54.7086 },
    // NORDESTE
    { nome: 'Salvador', estado: 'BA', lat: -12.9714, lng: -38.5014 },
    { nome: 'Fortaleza', estado: 'CE', lat: -3.7172, lng: -38.5433 },
    { nome: 'Recife', estado: 'PE', lat: -8.0476, lng: -34.8770 },
    { nome: 'Natal', estado: 'RN', lat: -5.7945, lng: -35.2110 },
    { nome: 'Maceió', estado: 'AL', lat: -9.6658, lng: -35.7353 },
    { nome: 'Teresina', estado: 'PI', lat: -5.0919, lng: -42.8034 },
    { nome: 'São Luís', estado: 'MA', lat: -2.5297, lng: -44.3028 },
    { nome: 'João Pessoa', estado: 'PB', lat: -7.1195, lng: -34.8450 },
    { nome: 'Aracaju', estado: 'SE', lat: -10.9095, lng: -37.0748 },
    { nome: 'Feira de Santana', estado: 'BA', lat: -12.2664, lng: -38.9663 },
    { nome: 'Caruaru', estado: 'PE', lat: -8.2760, lng: -35.9760 },
    { nome: 'Campina Grande', estado: 'PB', lat: -7.2308, lng: -35.8817 },
    { nome: 'Mossoró', estado: 'RN', lat: -5.1878, lng: -37.3443 },
    { nome: 'Vitória da Conquista', estado: 'BA', lat: -14.8659, lng: -40.8444 },
    { nome: 'Ilhéus', estado: 'BA', lat: -14.7887, lng: -39.0461 },
    { nome: 'Porto Seguro', estado: 'BA', lat: -16.4511, lng: -39.0652 },
    // CENTRO-OESTE
    { nome: 'Brasília', estado: 'DF', lat: -15.7801, lng: -47.9292 },
    { nome: 'Goiânia', estado: 'GO', lat: -16.6869, lng: -49.2648 },
    { nome: 'Cuiabá', estado: 'MT', lat: -15.6010, lng: -56.0979 },
    { nome: 'Campo Grande', estado: 'MS', lat: -20.4697, lng: -54.6201 },
    { nome: 'Anápolis', estado: 'GO', lat: -16.3286, lng: -48.9535 },
    { nome: 'Caldas Novas', estado: 'GO', lat: -17.7464, lng: -48.6250 },
    { nome: 'Dourados', estado: 'MS', lat: -22.2231, lng: -54.8050 },
    { nome: 'Rondonópolis', estado: 'MT', lat: -16.4711, lng: -54.6363 },
    // SUDESTE
    { nome: 'São Paulo', estado: 'SP', lat: -23.5505, lng: -46.6333 },
    { nome: 'Rio de Janeiro', estado: 'RJ', lat: -22.9068, lng: -43.1729 },
    { nome: 'Belo Horizonte', estado: 'MG', lat: -19.9191, lng: -43.9387 },
    { nome: 'Vitória', estado: 'ES', lat: -20.3155, lng: -40.3128 },
    { nome: 'Campinas', estado: 'SP', lat: -22.9056, lng: -47.0608 },
    { nome: 'Guarulhos', estado: 'SP', lat: -23.4543, lng: -46.5333 },
    { nome: 'Ribeirão Preto', estado: 'SP', lat: -21.1775, lng: -47.8103 },
    { nome: 'Sorocaba', estado: 'SP', lat: -23.5015, lng: -47.4526 },
    { nome: 'Santos', estado: 'SP', lat: -23.9618, lng: -46.3322 },
    { nome: 'São José dos Campos', estado: 'SP', lat: -23.1896, lng: -45.8841 },
    { nome: 'Uberlândia', estado: 'MG', lat: -18.9186, lng: -48.2772 },
    { nome: 'Contagem', estado: 'MG', lat: -19.9317, lng: -44.0536 },
    { nome: 'Juiz de Fora', estado: 'MG', lat: -21.7642, lng: -43.3503 },
    { nome: 'Uberaba', estado: 'MG', lat: -19.7477, lng: -47.9318 },
    { nome: 'Montes Claros', estado: 'MG', lat: -16.7287, lng: -43.8617 },
    { nome: 'Niterói', estado: 'RJ', lat: -22.8838, lng: -43.1035 },
    { nome: 'Nova Iguaçu', estado: 'RJ', lat: -22.7556, lng: -43.4513 },
    { nome: 'Duque de Caxias', estado: 'RJ', lat: -22.7895, lng: -43.3117 },
    { nome: 'São Bernardo do Campo', estado: 'SP', lat: -23.6939, lng: -46.5650 },
    { nome: 'Mauá', estado: 'SP', lat: -23.6678, lng: -46.4614 },
    { nome: 'Bauru', estado: 'SP', lat: -22.3246, lng: -49.0731 },
    { nome: 'Marília', estado: 'SP', lat: -22.2158, lng: -49.9467 },
    { nome: 'Presidente Prudente', estado: 'SP', lat: -22.1278, lng: -51.3886 },
    { nome: 'Piracicaba', estado: 'SP', lat: -22.7250, lng: -47.6492 },
    { nome: 'São José do Rio Preto', estado: 'SP', lat: -20.8113, lng: -49.3759 },
    { nome: 'Jundiaí', estado: 'SP', lat: -23.1864, lng: -46.8964 },
    { nome: 'Franca', estado: 'SP', lat: -20.5382, lng: -47.4009 },
    { nome: 'Aparecida', estado: 'SP', lat: -22.8475, lng: -45.2297 },
    // SUL
    { nome: 'Curitiba', estado: 'PR', lat: -25.4284, lng: -49.2733 },
    { nome: 'Porto Alegre', estado: 'RS', lat: -30.0346, lng: -51.2177 },
    { nome: 'Florianópolis', estado: 'SC', lat: -27.5954, lng: -48.5480 },
    { nome: 'Londrina', estado: 'PR', lat: -23.3045, lng: -51.1696 },
    { nome: 'Maringá', estado: 'PR', lat: -23.4273, lng: -51.9375 },
    { nome: 'Foz do Iguaçu', estado: 'PR', lat: -25.5163, lng: -54.5854 },
    { nome: 'Joinville', estado: 'SC', lat: -26.3044, lng: -48.8487 },
    { nome: 'Blumenau', estado: 'SC', lat: -26.9194, lng: -49.0661 },
    { nome: 'Caxias do Sul', estado: 'RS', lat: -29.1685, lng: -51.1791 },
    { nome: 'Pelotas', estado: 'RS', lat: -31.7649, lng: -52.3377 },
    { nome: 'Pato Branco', estado: 'PR', lat: -26.2291, lng: -52.6725 },
    { nome: 'Cascavel', estado: 'PR', lat: -24.9556, lng: -53.4558 },
    { nome: 'Chapecó', estado: 'SC', lat: -27.1007, lng: -52.6151 },
    { nome: 'Itajaí', estado: 'SC', lat: -26.9079, lng: -48.6631 },
    { nome: 'Criciúma', estado: 'SC', lat: -28.6775, lng: -49.3697 },
    { nome: 'Santa Maria', estado: 'RS', lat: -29.6842, lng: -53.8069 },
    { nome: 'Gravataí', estado: 'RS', lat: -29.9442, lng: -50.9913 },
];

const RouteSuggestions = {
    // Raio padrão de sugestão em km
    DEFAULT_RADIUS_KM: 300,

    // Calcular distância entre dois pontos (Haversine)
    calcularDistancia(lat1, lng1, lat2, lng2) {
        const R = 6371; // Raio da Terra em km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    // Encontrar cidade pelo nome
    encontrarCidade(nomeCidade, estado = null) {
        const nome = nomeCidade?.toLowerCase().trim() || '';
        return CIDADES_BRASIL.find(c => {
            const match = c.nome.toLowerCase() === nome;
            if (estado) return match && c.estado.toLowerCase() === estado.toLowerCase();
            return match;
        });
    },

    // Buscar cidades próximas dentro do raio
    buscarCidadesProximas(cidadeOrigem, raioKm = this.DEFAULT_RADIUS_KM, excluirCidade = null) {
        const origem = typeof cidadeOrigem === 'string'
            ? this.encontrarCidade(cidadeOrigem)
            : cidadeOrigem;

        if (!origem) return [];

        return CIDADES_BRASIL
            .filter(c => {
                if (excluirCidade && c.nome === excluirCidade) return false;
                if (c.nome === origem.nome && c.estado === origem.estado) return false;
                const dist = this.calcularDistancia(origem.lat, origem.lng, c.lat, c.lng);
                c._distancia = Math.round(dist);
                return dist <= raioKm;
            })
            .sort((a, b) => a._distancia - b._distancia)
            .slice(0, 10); // Top 10 mais próximas
    },

    // Mostrar modal de sugestões após assinatura
    async mostrarSugestoesRota(id) {
        if (!id) return;
        Utils.showLoading();

        let contrato = null;
        let evento = null;

        // Tentar buscar como contrato primeiro
        contrato = await DB.getById('contratos', id);
        
        if (contrato) {
            evento = await EventosDB.buscarPorId(contrato.evento_id);
        } else {
            // Se não for contrato, tentar buscar como evento
            evento = await EventosDB.buscarPorId(id);
            if (evento) {
                contrato = await ContratosDB.buscarPorEvento(evento.id);
            }
        }

        const artista = evento ? await ArtistasDB.buscarPorId(evento.artista_id) : null;
        
        if (!evento || !artista) {
            Utils.hideLoading();
            Utils.showToast('Evento ou Artista não encontrado para esta rota.', 'error');
            return;
        }

        const cidadeEvento = this.encontrarCidade(evento.cidade, evento.estado);
        const sugestoes = cidadeEvento
            ? this.buscarCidadesProximas(cidadeEvento, this.DEFAULT_RADIUS_KM, evento.cidade)
            : [];

        // Buscar shows já agendados do artista para marcar conflitos
        const eventosArtista = await EventosDB.buscarPorArtista(artista.id);
        const cidadesAgendadas = new Set(eventosArtista.map(e => `${e.cidade}-${e.estado}`));

        const html = `
            <div class="modal-overlay" style="z-index: 2000;">
                <div class="modal" style="max-width: 800px;">
                    <div class="modal-header" style="background: linear-gradient(135deg, #0a0a0a, #1a0a00); border-bottom: 1px solid var(--red-primary);">
                        <h3 class="modal-title" style="color: var(--text-primary);">
                            <i class="fas fa-route" style="color: var(--red-primary);"></i>
                            Oportunidades de Rota
                        </h3>
                        <button class="modal-close" onclick="Modals.close()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <!-- Header do Show Confirmado -->
                        <div class="rota-show-confirmado">
                            <div class="rota-badge-confirmado">
                                <i class="fas fa-check-circle"></i> Contrato Assinado
                            </div>
                            <div class="rota-show-info">
                                <div class="rota-show-artista">
                                    <img src="${artista.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(artista.nome)}&background=E10600&color=fff&size=80`}" 
                                         alt="${artista.nome}" class="rota-artista-foto">
                                    <div>
                                        <h4>${artista.nome}</h4>
                                        <p><i class="fas fa-map-marker-alt"></i> ${evento.local} — ${evento.cidade}/${evento.estado}</p>
                                        <p><i class="fas fa-calendar"></i> ${Utils.formatDate(evento.data)} às ${evento.horario || '–'}</p>
                                        <p><i class="fas fa-dollar-sign"></i> Cachê: ${Utils.formatCurrency(evento.cache_bruto)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Sugestões -->
                        <div class="rota-sugestoes-header">
                            <i class="fas fa-lightbulb"></i>
                            <span>Cidades num raio de <strong>${this.DEFAULT_RADIUS_KM} km</strong> para aproveitar a viagem</span>
                            <div class="rota-raio-selector">
                                <select onchange="RouteSuggestions.atualizarRaio(this.value, '${contrato.id}', '${evento.artista_id}', '${evento.id}')" style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 4px 8px; font-size: 12px;">
                                    <option value="150" ${this.DEFAULT_RADIUS_KM === 150 ? 'selected' : ''}>150 km</option>
                                    <option value="300" ${this.DEFAULT_RADIUS_KM === 300 ? 'selected' : ''}>300 km</option>
                                    <option value="500" ${this.DEFAULT_RADIUS_KM === 500 ? 'selected' : ''}>500 km</option>
                                </select>
                            </div>
                        </div>

                        ${sugestoes.length > 0 ? `
                            <div class="rota-cidades-grid" id="rotaCidadesGrid">
                                ${sugestoes.map(c => {
                                    const jaAgendada = cidadesAgendadas.has(`${c.nome}-${c.estado}`);
                                    return `
                                        <div class="rota-cidade-card ${jaAgendada ? 'ja-agendada' : ''}">
                                            <div class="rota-cidade-info">
                                                <div class="rota-cidade-nome">
                                                    ${c.nome}
                                                    ${jaAgendada ? '<span class="rota-badge-show"><i class="fas fa-check"></i> Show já agendado</span>' : ''}
                                                </div>
                                                <div class="rota-cidade-estado">${c.estado}</div>
                                                <div class="rota-cidade-distancia">
                                                    <i class="fas fa-road"></i> ${c._distancia} km do show
                                                </div>
                                            </div>
                                            <div class="rota-cidade-actions">
                                                ${!jaAgendada ? `
                                                    <button class="btn-primary btn-sm" 
                                                            onclick="RouteSuggestions.criarEventoSugerido('${artista.id}', '${c.nome}', '${c.estado}', '${evento.data}')">
                                                        <i class="fas fa-plus"></i> Criar Show
                                                    </button>
                                                ` : `
                                                    <button class="btn-secondary btn-sm" disabled style="opacity: 0.5;">
                                                        <i class="fas fa-check"></i> Agendado
                                                    </button>
                                                `}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        ` : `
                            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                                <i class="fas fa-map-marked-alt" style="font-size: 40px; margin-bottom: 12px; display: block; opacity: 0.4;"></i>
                                <p>Cidade "${evento.cidade}" não encontrada no nosso banco de cidades.</p>
                                <p style="font-size: 13px; margin-top: 8px;">Você pode criar eventos manualmente na aba Eventos.</p>
                            </div>
                        `}
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="Modals.close()">Fechar</button>
                        <button class="btn-primary" onclick="Pages.changePage('eventos'); Modals.close();">
                            <i class="fas fa-calendar-plus"></i> Ver Todos os Eventos
                        </button>
                    </div>
                </div>
            </div>
        `;

        Utils.hideLoading();
        Modals.container.innerHTML = html;
    },

    // Atualizar raio de sugestão dinamicamente
    async atualizarRaio(novoRaio, contratoId, artistaId, eventoId) {
        this.DEFAULT_RADIUS_KM = parseInt(novoRaio);
        await this.mostrarSugestoesRota(contratoId);
    },

    // Criar evento pré-preenchido com cidade sugerida
    async criarEventoSugerido(artistaId, cidade, estado, dataReferencia) {
        Modals.close();

        // Calcular data sugerida: 1 dia antes ou depois do show original
        // (Isso é apenas uma sugestão, o usuário pode alterar no modal)
        const dataRef = new Date(dataReferencia);
        dataRef.setDate(dataRef.getDate() + 1);
        const dataFormatada = dataRef.toISOString().split('T')[0];

        // Abrir modal multi-step com dados pré-preenchidos
        await Modals.showEventoMultiStepModal(null, false, {
            artista_id: artistaId,
            cidade: cidade,
            estado: estado,
            data: dataFormatada,
            tipo_evento: 'Show'
        });

        Utils.showToast(`Preenchendo show em ${cidade}/${estado}...`, 'success');
    }
};

window.RouteSuggestions = RouteSuggestions;
