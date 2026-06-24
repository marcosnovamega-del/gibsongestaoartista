/* ========================================
   GIBSON MANAGER PRO - DATABASE (SUPABASE)
   Camada de dados real via Supabase PostgreSQL
======================================== */

// Inicializar Cliente Supabase com nome diferente para evitar conflito com o SDK global
const sbClient = window.supabase
    ? window.supabase.createClient(Config.SUPABASE_URL, Config.SUPABASE_KEY)
    : null;

if (!sbClient) {
    console.error('❌ Falha ao inicializar o cliente Supabase. Verifique a URL e a Key no config.js');
} else {
    console.log('✅ Supabase conectado com sucesso!');
}

const DB = {
    // Cache com TTL (Time To Live) em milissegundos
    cache: {},
    cacheTTL: Config.CACHE_TTL || 2 * 60 * 1000,

    // Requisições em andamento para evitar duplicatas
    pendingRequests: {},

    // Auxiliar para obter ID do escritório do usuário atual
    getEscritorioId() {
        return window.Auth?.currentUser?.escritorio_id || null;
    },

    // Auxiliar para obter artista selecionado (null = todos)
    getArtistaFiltroId() {
        const selectedId = window.Auth?.getSelectedArtistaId?.();
        return (!selectedId || selectedId === 'todos') ? null : selectedId;
    },

    // Tabelas que possuem artista_id direto — filtradas automaticamente
    TABELAS_COM_ARTISTA: ['eventos', 'contratos', 'equipe', 'propostas', 'turnes', 'borderos'],

    // GET otimizado com Supabase + Cache (Isolado por Escritório e Artista)
    async getAll(tableName, forceRefresh = false) {
        const escritorioId = this.getEscritorioId();
        const artistaId    = this.getArtistaFiltroId();
        // Cache separado por artista selecionado
        const cacheKey = `${tableName}_all_${escritorioId || 'global'}_${artistaId || 'todos'}`;
        const now = Date.now();

        if (!forceRefresh && this.cache[cacheKey]) {
            const cached = this.cache[cacheKey];
            if (now - cached.timestamp < this.cacheTTL) {
                return cached.data;
            }
        }

        if (this.pendingRequests[cacheKey]) {
            return await this.pendingRequests[cacheKey];
        }

        try {
            const requestPromise = (async () => {
                let query = sbClient.from(tableName).select('*');

                // Filtro de escritório
                if (escritorioId && tableName !== 'escritorios') {
                    query = query.eq('escritorio_id', escritorioId);
                }

                // Filtro de artista (apenas para tabelas com artista_id direto)
                if (artistaId && this.TABELAS_COM_ARTISTA.includes(tableName)) {
                    query = query.eq('artista_id', artistaId);
                }

                const { data, error } = await query;
                if (error) throw error;

                this.cache[cacheKey] = { data: data || [], timestamp: now };
                delete this.pendingRequests[cacheKey];
                return data || [];
            })();

            this.pendingRequests[cacheKey] = requestPromise;
            return await requestPromise;

        } catch (error) {
            console.error(`Erro em getAll(${tableName}):`, error.message);
            delete this.pendingRequests[cacheKey];
            return [];
        }
    },

    async getById(tableName, id, useCache = true) {
        if (!id) return null;
        const cacheKey = `${tableName}_${id}`;
        const now = Date.now();

        if (useCache && this.cache[cacheKey]) {
            const cached = this.cache[cacheKey];
            if (now - cached.timestamp < this.cacheTTL) {
                return cached.data;
            }
        }

        try {
            let query = sbClient.from(tableName).select('*').eq('id', id);
            
            const escritorioId = this.getEscritorioId();
            if (escritorioId && tableName !== 'escritorios') {
                query = query.eq('escritorio_id', escritorioId);
            }

            const { data, error } = await query.maybeSingle();
            if (error) throw error;

            this.cache[cacheKey] = { data, timestamp: now };
            return data;
        } catch (error) {
            console.error(`Erro em getById(${tableName}, ${id}):`, error.message);
            return null;
        }
    },

    async create(tableName, data) {
        try {
            const escritorioId = this.getEscritorioId();
            const dataToInsert = { ...data };
            
            // Garantir ID UUID se não houver (para tabelas que não auto-geram)
            if (!dataToInsert.id && typeof Utils !== 'undefined') {
                dataToInsert.id = Utils.generateId();
            }

            // Injetar escritorio_id automaticamente
            if (escritorioId && tableName !== 'escritorios') {
                dataToInsert.escritorio_id = escritorioId;
            }

            const { data: result, error } = await sbClient.from(tableName).insert([dataToInsert]).select().maybeSingle();
            if (error) throw error;

            this.invalidateCache(tableName);
            return result;
        } catch (error) {
            console.error(`Erro em create(${tableName}):`, error.message);
            return null;
        }
    },

    async patch(tableName, id, data) {
        try {
            let query = sbClient.from(tableName).update(data).eq('id', id);
            
            const escritorioId = this.getEscritorioId();
            if (escritorioId && tableName !== 'escritorios') {
                query = query.eq('escritorio_id', escritorioId);
            }

            const { data: result, error } = await query.select().maybeSingle();
            if (error) throw error;

            this.invalidateCache(tableName);
            return result;
        } catch (error) {
            console.error(`Erro em patch(${tableName}, ${id}):`, error.message);
            return null;
        }
    },

    async delete(tableName, id) {
        try {
            let query = sbClient.from(tableName).delete().eq('id', id);
            
            const escritorioId = this.getEscritorioId();
            if (escritorioId && tableName !== 'escritorios') {
                query = query.eq('escritorio_id', escritorioId);
            }

            const { error } = await query;
            if (error) throw error;

            this.invalidateCache(tableName);
            return true;
        } catch (error) {
            console.error(`Erro em delete(${tableName}, ${id}):`, error.message);
            return false;
        }
    },

    async search(tableName, filters) {
        try {
            let query = sbClient.from(tableName).select('*').match(filters);
            
            const escritorioId = this.getEscritorioId();
            if (escritorioId && tableName !== 'escritorios') {
                query = query.eq('escritorio_id', escritorioId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error(`Erro em search(${tableName}):`, error.message);
            return [];
        }
    },

    invalidateCache(tableName) {
        Object.keys(this.cache).forEach(key => {
            if (key.startsWith(`${tableName}`)) delete this.cache[key];
        });
    },

    clearAllCache() {
        this.cache = {};
        this.pendingRequests = {};
    }
};

// ============================================================
// ARTISTAS DB
// ============================================================
const ArtistasDB = {
    async listar(forceRefresh = false) {
        return await DB.getAll('artistas', forceRefresh);
    },

    async buscarPorId(id) {
        return await DB.getById('artistas', id);
    },

    async criar(artista) {
        const artData = {
            foto: artista.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(artista.nome)}&background=E10600&color=fff&size=200`,
            nome: artista.nome,
            status: artista.status || 'Ativo',
            comissao_padrao: artista.comissao_padrao || 10,
            modelo_contrato: artista.modelo_contrato || '',
            data_cadastro: artista.data_cadastro || new Date().toISOString(),
        };
        if (artista.id) artData.id = artista.id;
        return await DB.create('artistas', artData);
    },

    async atualizar(id, artista) {
        return await DB.patch('artistas', id, artista);
    },

    async deletar(id) {
        return await DB.delete('artistas', id);
    },

    async listarAtivos() {
        const artistas = await this.listar();
        return artistas.filter(a => a.status === 'Ativo');
    }
};

// ============================================================
// EVENTOS DB
// ============================================================
const EventosDB = {
    async listar(forceRefresh = false) {
        return await DB.getAll('eventos', forceRefresh);
    },

    async buscarPorId(id) {
        return await DB.getById('eventos', id);
    },

    async buscarPorArtista(artistaId) {
        const eventos = await this.listar();
        return eventos.filter(e => e.artista_id === artistaId);
    },

    async gerarContratoEvento(eventoId, artistaId) {
        try {
            const artista = await ArtistasDB.buscarPorId(artistaId);
            const evento = await EventosDB.buscarPorId(eventoId);
            
            if (!artista || !evento) {
                console.error('gerarContratoEvento: artista ou evento não encontrado', { artistaId, eventoId });
                return null;
            }

            // Verificar se já existe contrato para não duplicar
            const existente = await ContratosDB.buscarPorEvento(eventoId);
            if (existente) return existente;

            let conteudo = artista.modelo_contrato || 
                `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ARTÍSTICOS

Pelo presente instrumento, as partes:

CONTRATANTE: {{razao_social}}
CNPJ/CPF: {{cnpj_cpf}}

CONTRATADO: {{nome_artista}}

Acordam o seguinte:

1. O CONTRATADO se compromete a realizar apresentação artística na data de {{data_evento}}, no local {{local_evento}} - {{cidade_evento}}.

2. O valor total dos serviços é de {{valor_total}}, a ser pago conforme condições negociadas.

3. Este contrato entra em vigor na data de sua assinatura.


_______________________________        _______________________________
       CONTRATANTE                              CONTRATADO`;
            
            // Substituir variáveis
            conteudo = conteudo.replace(/{{razao_social}}/g, evento.razao_social || evento.nome_contratante || '');
            conteudo = conteudo.replace(/{{cnpj_cpf}}/g, evento.cnpj || evento.cpf_contratante || '');
            conteudo = conteudo.replace(/{{nome_artista}}/g, artista.nome);
            conteudo = conteudo.replace(/{{data_evento}}/g, Utils.formatDate(evento.data));
            conteudo = conteudo.replace(/{{local_evento}}/g, evento.local || '');
            conteudo = conteudo.replace(/{{cidade_evento}}/g, `${evento.cidade || ''}/${evento.estado || ''}`);
            conteudo = conteudo.replace(/{{valor_total}}/g, Utils.formatCurrency(evento.cache_bruto || 0));

            const result = await ContratosDB.criar({
                evento_id: eventoId,
                artista_id: artistaId,
                conteudo: conteudo,
                status: 'Pendente',
                data_geracao: new Date().toISOString()
            });

            if (!result) {
                console.error('gerarContratoEvento: falha ao inserir no banco');
            } else {
                console.log('Contrato gerado com sucesso:', result.id);
            }
            return result;
        } catch (err) {
            console.error('gerarContratoEvento erro:', err);
            return null;
        }
    },

    async criar(evento) {
        // Remover valor_liquido pois é coluna GENERATED no Supabase e limpar campos numéricos
        const { valor_liquido, id: _id, ...eventoData } = evento;
        
        // Garantir que campos numéricos não sejam NaN
        if (eventoData.cache_bruto !== undefined) eventoData.cache_bruto = parseFloat(eventoData.cache_bruto) || 0;
        if (eventoData.comissao !== undefined) eventoData.comissao = parseFloat(eventoData.comissao) || 0;
        
        // 1. VERIFICAÇÃO DE DUPLICIDADE / UPSERT DE RESERVA
        try {
            if (evento.artista_id && evento.data) {
                const eventosArtista = await this.buscarPorArtista(evento.artista_id);
                const reservaExistente = eventosArtista.find(e => 
                    e.data === evento.data && 
                    (e.status === 'Reserva' || e.status === 'Reservado')
                );

                if (reservaExistente) {
                    console.log(`[EventosDB] Convertendo reserva existente (${reservaExistente.id}) em evento real.`);
                    return await this.atualizar(reservaExistente.id, {
                        ...eventoData,
                        status: evento.status || 'Confirmado'
                    });
                }
            }
        } catch (e) {
            console.warn('[EventosDB] Erro ao verificar reservas existentes:', e);
        }

        // 2. CRIAÇÃO NORMAL
        let statusParaTentar = evento.status || 'Confirmado';
        
        // Normalizar status comuns que podem falhar em constraints restritivas
        if (statusParaTentar === 'Reservado') statusParaTentar = 'Reserva';
        if (statusParaTentar === 'Aguardando Assinatura') statusParaTentar = 'Confirmado';
        
        let result = await DB.create('eventos', {
            ...eventoData,
            status: statusParaTentar
        });

        // Fallback para status 'Confirmado' se o banco rejeitar 'Aguardando Assinatura' ou similar
        if (!result) {
            console.warn("[EventosDB] Falha no insert inicial. Tentando com status 'Confirmado' padrão.");
            result = await DB.create('eventos', {
                ...eventoData,
                status: 'Confirmado'
            });
        }

        return result;
    },

    async atualizar(id, evento) {
        // Remover valor_liquido pois é coluna GENERATED no Supabase
        const { valor_liquido, ...eventoData } = evento;
        let result = await DB.patch('eventos', id, eventoData);

        // Se falhou e estávamos tentando mudar para 'Aguardando Assinatura'
        if (!result && eventoData.status === 'Aguardando Assinatura') {
            console.warn("Status 'Aguardando Assinatura' rejeitado no patch. Tentando com 'Confirmado'.");
            result = await DB.patch('eventos', id, { ...eventoData, status: 'Confirmado' });
        }

        if (!result) {
            console.warn("Falha ao atualizar evento com todos os dados. Tentando fallback apenas com dados básicos.");
            const dataBasica = {
                data: evento.data,
                horario: evento.horario,
                local: evento.local,
                cidade: evento.cidade,
                estado: evento.estado,
                tipo_evento: evento.tipo_evento,
                cache_bruto: evento.cache_bruto,
                status: evento.status
            };
            // Remover undefineds
            Object.keys(dataBasica).forEach(key => dataBasica[key] === undefined && delete dataBasica[key]);
            
            result = await DB.patch('eventos', id, dataBasica);
        }
        return result;
    },

    async deletar(id) {
        return await DB.delete('eventos', id);
    },

    async buscarPorArtista(artistaId) {
        return await DB.search('eventos', { artista_id: artistaId });
    },

    async buscarPorMes(mes, ano) {
        const eventos = await this.listar();
        return eventos.filter(e => {
            const data = new Date(e.data);
            return data.getMonth() === mes && data.getFullYear() === ano;
        });
    }
};

// ============================================================
// EQUIPE DB
// ============================================================
const EquipeDB = {
    async listar() {
        return await DB.getAll('equipe');
    },

    async buscarPorArtista(artistaId) {
        return await DB.search('equipe', { artista_id: artistaId });
    },

    async criar(membro) {
        const { id: _id, ...membroData } = membro;
        return await DB.create('equipe', membroData);
    },

    async atualizar(id, membro) {
        return await DB.patch('equipe', id, membro);
    },

    async buscarPorId(id) {
        return await DB.getById('equipe', id);
    },

    async deletar(id) {
        return await DB.delete('equipe', id);
    }
};

// ============================================================
// DESPESAS DB
// ============================================================
const DespesasDB = {
    async listar(forceRefresh = false) {
        const despesas = await DB.getAll('despesas', forceRefresh);
        // Despesas não têm artista_id direto — filtrar via eventos
        const artistaId = DB.getArtistaFiltroId();
        if (!artistaId) return despesas;
        const eventos = await DB.getAll('eventos');
        const eventosIds = new Set(eventos.map(e => e.id)); // eventos já filtrados pelo artista
        // Despesas sem evento_id são despesas fixas do escritório — incluir somente se for "todos"
        return despesas.filter(d => d.evento_id && eventosIds.has(d.evento_id));
    },

    async listarPorMes(mes, ano) {
        try {
            const inicio = `${ano}-${String(mes+1).padStart(2,'0')}-01`;
            const fim    = `${ano}-${String(mes+1).padStart(2,'0')}-31`;
            const { data, error } = await sbClient.from('despesas')
                .select('*')
                .or(`data_vencimento.gte.${inicio},data_vencimento.lte.${fim}`)
                .order('data_vencimento');
            if (error) throw error;
            return data || [];
        } catch(e) { return await this.listar(); }
    },

    async buscarPorEvento(eventoId) {
        return await DB.search('despesas', { evento_id: eventoId });
    },

    async criar(despesa) {
        const { id: _id, ...despesaData } = despesa;
        return await DB.create('despesas', {
            ...despesaData,
            status: despesa.status || 'Pendente'
        });
    },

    async atualizar(id, despesa) {
        return await DB.patch('despesas', id, despesa);
    },

    async deletar(id) {
        return await DB.delete('despesas', id);
    },

    async calcularTotalEvento(eventoId) {
        const despesas = await this.buscarPorEvento(eventoId);
        return despesas.reduce((total, d) => total + (d.valor || 0), 0);
    }
};

// ============================================================
// BORDEROS DB
// ============================================================
const BorderosDB = {
    async listar(forceRefresh = false) {
        return await DB.getAll('borderos', forceRefresh);
    },

    async buscarPorEvento(eventoId) {
        const borderos = await this.listar();
        return borderos.find(b => b.evento_id === eventoId);
    },

    async criar(bordero) {
        return await DB.create('borderos', {
            ...bordero,
            status: bordero.status || 'EM ABERTO'
        });
    },

    async atualizar(id, bordero) {
        return await DB.patch('borderos', id, bordero);
    },

    async deletar(id) {
        return await DB.delete('borderos', id);
    }
};

// ============================================================
// CONTRATOS DB
// ============================================================
const ContratosDB = {
    async listar(forceRefresh = false) {
        return await DB.getAll('contratos', forceRefresh);
    },

    async buscarPorEvento(eventoId) {
        const contratos = await this.listar();
        return contratos.find(c => c.evento_id === eventoId);
    },

    async criar(contrato) {
        const { id: _id, ...contratoData } = contrato;
        // Verificar se já existe contrato para este evento
        const existente = await this.buscarPorEvento(contratoData.evento_id);
        if (existente) {
            console.log('Contrato já existe para este evento. ID:', existente.id);
            return existente;
        }
        return await DB.create('contratos', {
            ...contratoData,
            status: contrato.status || 'Pendente',
            data_geracao: contrato.data_geracao || new Date().toISOString()
        });
    },

    async atualizar(id, contrato) {
        return await DB.patch('contratos', id, contrato);
    },

    async assinar(id) {
        const contrato = await DB.getById('contratos', id);
        if (!contrato) return null;

        const result = await DB.patch('contratos', id, {
            status: 'Assinado',
            data_assinatura: new Date().toISOString()
        });

        if (result && contrato.evento_id) {
            // Ao assinar o contrato, o evento sai de "Aguardando Assinatura" para "Confirmado"
            await DB.patch('eventos', contrato.evento_id, { status: 'Confirmado' });
            DB.invalidateCache('eventos');

            // GERAÇÃO FINANCEIRA APÓS ASSINATURA
            try {
                const evento = await EventosDB.buscarPorId(contrato.evento_id);
                if (evento && evento.proposta_id) {
                    const proposta = await PropostasDB.buscarPorId(evento.proposta_id);
                    if (proposta && typeof PropostasDB._gerarParcelasDoEvento === 'function') {
                        // Verificar se já foram geradas parcelas para este evento para evitar duplicidade
                        const parcelasExistentes = await ParcelasDB.buscarPorEvento(evento.id);
                        if (!parcelasExistentes || parcelasExistentes.length === 0) {
                            await PropostasDB._gerarParcelasDoEvento(proposta, evento.id);
                            console.log("Financeiro gerado após assinatura do contrato.");
                        }
                    }
                }
            } catch (err) {
                console.error("Erro ao processar financeiro pós-assinatura:", err);
            }

            // CRIAÇÃO AUTOMÁTICA DE TURNÊ
            try {
                if (typeof TurnesDB !== 'undefined') {
                    await TurnesDB.criarDaAssinatura(contrato.evento_id);
                    console.log("Turnê operacional gerada com sucesso.");
                }
            } catch (err) {
                console.error("Erro ao gerar turnê automática:", err);
            }
        }

        return result;
    },

    async deletar(id) {
        return await DB.delete('contratos', id);
    }
};

// ============================================================
// PARCELAS DB
// ============================================================
const ParcelasDB = {
    async listar(forceRefresh = false) {
        const parcelas = await DB.getAll('parcelas', forceRefresh);
        // Parcelas não têm artista_id direto — filtrar via eventos
        const artistaId = DB.getArtistaFiltroId();
        if (!artistaId) return parcelas;
        const eventos = await DB.getAll('eventos');
        const eventosIds = new Set(eventos.map(e => e.id)); // eventos já vêm filtrados pelo artista
        return parcelas.filter(p => !p.evento_id || eventosIds.has(p.evento_id));
    },

    async buscarPorEvento(eventoId) {
        return await DB.search('parcelas', { evento_id: eventoId });
    },

    async criar(parcela) {
        const { id: _id, ...parcelaData } = parcela;
        return await DB.create('parcelas', {
            ...parcelaData,
            status: parcela.status || 'Pendente'
        });
    },

    async atualizar(id, parcela) {
        return await DB.patch('parcelas', id, parcela);
    },

    async marcarPaga(id) {
        return await DB.patch('parcelas', id, {
            status: 'Pago',
            data_pagamento: new Date().toISOString()
        });
    },

    async verificarAtrasadas() {
        const parcelas = await this.listar();
        const hoje = new Date();

        return parcelas.filter(p => {
            if (p.status === 'Pago') return false;
            const vencimento = new Date(p.data_vencimento);
            return vencimento < hoje;
        });
    }
};

// ============================================================
// USUARIOS DB
// ============================================================
const UsuariosDB = {
    async listar(forceRefresh = false) {
        return await DB.getAll('usuarios', forceRefresh);
    },

    async buscarPorUsername(username) {
        const usuarios = await this.listar();
        return usuarios.find(u => u.username === username);
    },

    async criar(usuario) {
        const { id: _id, ...usuarioData } = usuario;
        // Hash da senha antes de gravar
        if (usuarioData.password && typeof Utils !== 'undefined') {
            usuarioData.password = await Utils.hashPassword(usuarioData.password);
        }
        return await DB.create('usuarios', {
            ...usuarioData,
            ativo: true
        });
    },

    async atualizar(id, usuario) {
        const dadosAtualizados = { ...usuario };
        // Hash da senha antes de gravar (se estiver sendo alterada)
        if (dadosAtualizados.password && typeof Utils !== 'undefined') {
            // Só hasheia se não parecer já ser um hash SHA-256 (64 hex chars)
            const jaEhHash = /^[a-f0-9]{64}$/.test(dadosAtualizados.password);
            if (!jaEhHash) {
                dadosAtualizados.password = await Utils.hashPassword(dadosAtualizados.password);
            }
        }
        return await DB.patch('usuarios', id, dadosAtualizados);
    },

    async deletar(id) {
        return await DB.delete('usuarios', id);
    }
};

// ============================================================
// CONFIG DB
// ============================================================
const ConfigDB = {
    async obter() {
        const configs = await DB.getAll('config');
        return configs && configs.length > 0 ? configs[0] : null;
    },

    async atualizar(config) {
        const atual = await this.obter();
        if (atual) {
            return await DB.patch('config', atual.id, config);
        } else {
            return await DB.create('config', { ...config });
        }
    }
};

// ============================================================
// PROPOSTAS DB
// ============================================================
const PropostasDB = {
    async listar(forceRefresh = false) {
        return await DB.getAll('propostas', forceRefresh);
    },

    async buscarPorId(id) {
        return await DB.getById('propostas', id);
    },

    async buscarPorArtista(artistaId) {
        return await DB.search('propostas', { artista_id: artistaId });
    },

    async criar(proposta) {
        const { id: _id, ...data } = proposta;
        const result = await DB.create('propostas', {
            ...data,
            status: proposta.status || 'Rascunho'
        });

        if (result) {
            // Criar reserva automática na agenda
            try {
                const reservaData = {
                    artista_id: result.artista_id,
                    data: result.data_evento || new Date().toISOString().split('T')[0],
                    horario: result.horario || '00:00',
                    local: result.local_evento || 'A definir',
                    cidade: result.cidade_evento || 'A definir',
                    estado: result.estado_evento || 'NA',
                    tipo_evento: result.tipo_evento || 'Show',
                    cache_bruto: result.cache_bruto || 0,
                    status: 'Reserva'
                };
                
                const reservaResult = await EventosDB.criar(reservaData);
                if (!reservaResult) {
                    console.error("Falha ao criar reserva na agenda. O Supabase rejeitou o insert.");
                } else {
                    console.log("Reserva criada com sucesso:", reservaResult);
                }
            } catch (e) {
                console.warn('Falha ao criar reserva automática:', e);
            }
        }
        return result;
    },

    async atualizar(id, proposta) {
        const result = await DB.patch('propostas', id, proposta);
        await this._sincronizarReserva(id);
        return result;
    },

    async atualizarStatus(id, status) {
        const result = await DB.patch('propostas', id, { status });
        if (status !== 'Recusada') {
            await this._sincronizarReserva(id);
        }
        return result;
    },

    async _sincronizarReserva(propostaId) {
        try {
            const proposta = await this.buscarPorId(propostaId);
            if (!proposta || proposta.status === 'Recusada' || proposta.status === 'Aceita') return;

            const eventosArtista = await EventosDB.buscarPorArtista(proposta.artista_id);
            const reservaExistente = eventosArtista.find(e => 
                e.data === (proposta.data_evento || '') && e.status === 'Reserva'
            );

            if (!reservaExistente && proposta.data_evento) {
                // Cria a reserva se não existir
                const reservaData = {
                    artista_id: proposta.artista_id,
                    data: proposta.data_evento,
                    horario: proposta.horario || '00:00',
                    local: proposta.local_evento || 'A definir',
                    cidade: proposta.cidade_evento || 'A definir',
                    estado: proposta.estado_evento || 'NA',
                    tipo_evento: proposta.tipo_evento || 'Show',
                    cache_bruto: proposta.cache_bruto || 0,
                    status: 'Reserva'
                };
                await EventosDB.criar(reservaData);
            }
        } catch (e) {
            console.warn('Falha ao sincronizar reserva automática:', e);
        }
    },

    async converterParaEvento(propostaId) {
        const proposta = await this.buscarPorId(propostaId);
        if (!proposta) return null;

        const eventoData = {
            proposta_id:          proposta.id,
            artista_id:           proposta.artista_id,
            data:                 proposta.data_evento,
            horario:              proposta.horario,
            local:                proposta.local_evento,
            cidade:               proposta.cidade_evento,
            estado:               proposta.estado_evento,
            tipo_evento:          proposta.tipo_evento,
            tipo_contratante:     proposta.tipo_contratante,
            razao_social:         proposta.razao_social,
            nome_fantasia:        proposta.nome_fantasia,
            cnpj:                 proposta.cnpj,
            nome_contratante:     proposta.nome_contratante,
            cpf_contratante:      proposta.cpf_contratante,
            endereco:             proposta.endereco,
            responsavel:          proposta.responsavel,
            email_contratante:    proposta.email,
            telefone_contratante: proposta.telefone,
            cache_bruto:          proposta.cache_bruto,
            comissao:             proposta.comissao,
            observacoes:          proposta.observacoes,
            status:               'Aguardando Assinatura'
        };

        // Buscar se já existe uma reserva para esta data para atualizá-la ao invés de duplicar
        const eventosArtista = await EventosDB.buscarPorArtista(proposta.artista_id);
        const reservaExistente = eventosArtista.find(e => 
            e.data === (proposta.data_evento || '') && e.status === 'Reserva'
        );

        let evento;
        if (reservaExistente) {
            evento = await EventosDB.atualizar(reservaExistente.id, eventoData);
        } else {
            evento = await EventosDB.criar(eventoData);
        }

        if (evento) {
            await this.atualizarStatus(propostaId, 'Aceita');
            
            // Gerar contrato automaticamente
            try {
                await EventosDB.gerarContratoEvento(evento.id, proposta.artista_id);
            } catch (err) {
                console.error("Erro ao gerar contrato automático:", err);
            }



        }

        return evento;
    },

    async deletar(id) {
        return await DB.delete('propostas', id);
    },

    // Gera parcelas automaticamente ao converter proposta em evento
    async _gerarParcelasDoEvento(proposta, eventoId) {
        try {
            let cronograma = [];

            // Tentar parsear condicoes_pagamento se for string JSON
            if (proposta.condicoes_pagamento) {
                const cond = typeof proposta.condicoes_pagamento === 'string'
                    ? JSON.parse(proposta.condicoes_pagamento)
                    : proposta.condicoes_pagamento;
                cronograma = cond.cronograma || [];
            }

            if (!cronograma.length) {
                // Fallback: parcela única no dia do evento
                cronograma = [{ pct: 100, dias_antes_show: 0, descricao: 'Pagamento integral', tipo: 'integral', numero: 1 }];
            }

            const dataEvento = proposta.data_evento ? new Date(proposta.data_evento + 'T12:00:00') : new Date();
            const cacheBruto = proposta.cache_bruto || 0;
            const comissao   = proposta.comissao || 10;
            const liquido    = cacheBruto - (cacheBruto * comissao / 100);

            for (let i = 0; i < cronograma.length; i++) {
                const item = cronograma[i];
                const diasOffset = item.dias_antes_show || 0;
                const venc = new Date(dataEvento);
                venc.setDate(venc.getDate() + diasOffset);

                const valor = liquido * (item.pct || 100) / 100;

                await ParcelasDB.criar({
                    evento_id:       eventoId,
                    numero_parcela:  item.numero || (i + 1),
                    valor:           parseFloat(valor.toFixed(2)),
                    data_vencimento: venc.toISOString().split('T')[0],
                    status:          'Pendente',
                    descricao:       item.descricao || `Parcela ${i + 1}`,
                });
            }

            // Gerar despesa de comissão do vendedor, se houver
            if (proposta.vendedor_comissao_valor > 0) {
                await DespesasDB.criar({
                    evento_id:       eventoId,
                    descricao:       `Comissão Vendedor – ${proposta.vendedor_nome || 'Vendedor'}`,
                    categoria:       'Comissão',
                    valor:           proposta.vendedor_comissao_valor,
                    data_vencimento: dataEvento.toISOString().split('T')[0],
                    status:          'Pendente',
                    observacoes:     'Gerada automaticamente da proposta',
                });
            }

            // Gerar despesa de comissão do parceiro, se houver
            if (proposta.parceiro_nome && proposta.parceiro_comissao_valor > 0) {
                await DespesasDB.criar({
                    evento_id:       eventoId,
                    descricao:       `Comissão Parceiro – ${proposta.parceiro_nome}`,
                    categoria:       'Comissão',
                    valor:           proposta.parceiro_comissao_valor,
                    data_vencimento: dataEvento.toISOString().split('T')[0],
                    status:          'Pendente',
                    observacoes:     'Aprovação pendente – parceiro externo',
                });
            }

            console.log(`✅ ${cronograma.length} parcela(s) gerada(s) para evento ${eventoId}`);
        } catch(e) {
            console.error('Erro ao gerar parcelas da proposta:', e);
        }
    }
};

// ============================================================
// AUDIT LOG DB
// ============================================================
const AuditDB = {
    async registrar({ acao, modulo, registroId, descricao, dadosAnteriores, dadosNovos }) {
        try {
            const user = window.Auth?.currentUser;
            if (!user) return;
            await sbClient.from('audit_log').insert({
                usuario_id:       user.id,
                usuario_nome:     user.nome,
                usuario_nivel:    user.nivel,
                acao,
                modulo:           modulo || null,
                registro_id:      registroId ? String(registroId) : null,
                descricao:        descricao || null,
                dados_anteriores: dadosAnteriores || null,
                dados_novos:      dadosNovos      || null,
            });
        } catch (e) {
            // Silencioso — não travar fluxo principal por falha de log
            console.warn('Audit log falhou:', e.message);
        }
    },

    async listar(filtros = {}) {
        try {
            let query = sbClient
                .from('audit_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500);

            if (filtros.usuario_id) query = query.eq('usuario_id', filtros.usuario_id);
            if (filtros.modulo)     query = query.eq('modulo', filtros.modulo);
            if (filtros.acao)       query = query.eq('acao', filtros.acao);
            if (filtros.dataInicio) query = query.gte('created_at', filtros.dataInicio);
            if (filtros.dataFim)    query = query.lte('created_at', filtros.dataFim + 'T23:59:59');

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Erro ao buscar audit_log:', e);
            return [];
        }
    },

    async buscarPorUsuario(usuarioId) {
        return await this.listar({ usuario_id: usuarioId });
    },

    async registrarLogin(usuario) {
        try {
            await sbClient.from('audit_log').insert({
                usuario_id:    usuario.id,
                usuario_nome:  usuario.nome,
                usuario_nivel: usuario.nivel,
                acao:          'LOGIN',
                descricao:     `Login realizado com sucesso`,
            });
            // Atualizar ultimo_acesso e total_acessos
            await sbClient.from('usuarios')
                .update({
                    ultimo_acesso:  new Date().toISOString(),
                    total_acessos:  (usuario.total_acessos || 0) + 1
                })
                .eq('id', usuario.id);
        } catch (e) {
            console.warn('Erro ao registrar login:', e.message);
        }
    }
};

// ============================================================
// RECEITAS DB
// ============================================================
const ReceitasDB = {
    async listar(forceRefresh = false) {
        return await DB.getAll('receitas', forceRefresh);
    },
    async criar(data) {
        const r = await DB.create('receitas', data);
        DB.cache = {};
        return r;
    },
    async atualizar(id, data) {
        const r = await DB.patch('receitas', id, data);
        DB.cache = {};
        return r;
    },
    async deletar(id) {
        const r = await DB.delete('receitas', id);
        DB.cache = {};
        return r;
    }
};

// ============================================================
// MODELOS DE DESPESA DB
// ============================================================
const ModelosDespesaDB = {
    async listar() {
        try {
            const { data, error } = await sbClient.from('modelos_despesa')
                .select('*').eq('ativo', true).order('nome');
            if (error) throw error;
            return data || [];
        } catch(e) { return []; }
    },
    async criar(data) {
        const r = await DB.create('modelos_despesa', data);
        DB.cache = {};
        return r;
    },
    async atualizar(id, data) {
        return await DB.patch('modelos_despesa', id, data);
    },
    async deletar(id) {
        try {
            const { error } = await sbClient.from('modelos_despesa').delete().eq('id', id);
            if (error) {
                // fallback: soft delete
                await sbClient.from('modelos_despesa').update({ ativo: false }).eq('id', id);
            }
            return true;
        } catch(e) { return false; }
    },
    // Gera uma despesa real a partir do modelo para o mês atual
    async gerarDespesaDoMes(modeloId) {
        try {
            const { data: m } = await sbClient.from('modelos_despesa')
                .select('*').eq('id', modeloId).single();
            if (!m) return null;
            const hoje = new Date();
            const ano  = hoje.getFullYear();
            const mes  = hoje.getMonth() + 1;
            const dia  = m.dia_vencimento || hoje.getDate();
            // Garante que o dia não ultrapasse 28 para meses curtos
            const diaSeguro = Math.min(dia, 28);
            const venc = `${ano}-${String(mes).padStart(2,'0')}-${String(diaSeguro).padStart(2,'0')}`;

            // Tenta com todos os campos
            let resultado = await DespesasDB.criar({
                descricao:       m.nome,
                categoria:       m.categoria,
                valor:           m.valor || 0,
                data_vencimento: venc,
                status:          'Pendente',
                recorrente:      true,
                observacoes:     `Gerado do modelo: ${m.nome}`,
            });

            // Fallback: se rejeitou (coluna recorrente/observacoes não existe), tenta só com campos básicos
            if (!resultado) {
                resultado = await DespesasDB.criar({
                    descricao:       m.nome,
                    categoria:       m.categoria,
                    valor:           m.valor || 0,
                    data_vencimento: venc,
                    status:          'Pendente',
                });
            }

            return resultado;
        } catch(e) { console.error('Erro ao gerar despesa do modelo:', e); return null; }
    }
};

// ============================================================
// TURNES DB - GESTÃO OPERACIONAL
// ============================================================
const TurnesDB = {
    async listar(forceRefresh = false) {
        return await DB.getAll('turnes', forceRefresh);
    },

    async buscarPorId(id) {
        return await DB.getById('turnes', id);
    },

    async buscarPorEvento(eventoId) {
        const turnes = await this.listar();
        return turnes.find(t => t.evento_id === eventoId);
    },

    async criar(turne) {
        return await DB.create('turnes', turne);
    },

    async atualizar(id, data) {
        const r = await DB.patch('turnes', id, data);
        if (r) DB.invalidateCache('turnes');
        return r;
    },

    // Gatilho automático ao assinar contrato
    async criarDaAssinatura(eventoId) {
        try {
            const existente = await this.buscarPorEvento(eventoId);
            if (existente) return existente;

            const evento = await EventosDB.buscarPorId(eventoId);
            if (!evento) return null;

            return await this.criar({
                evento_id: eventoId,
                status: 'PREPARANDO SAÍDA',
                destino: `${evento.cidade}/${evento.estado}`,
                data_saida: evento.data,
                observacoes: 'Turnê gerada automaticamente após assinatura do contrato.'
            });
        } catch (e) {
            console.error('Erro ao criar turnê automática:', e);
            return null;
        }
    },

    // Métodos Sub-entidades
    async listarEquipe(turneId) {
        return await DB.search('turne_equipe', { turne_id: turneId });
    },
    async adicionarMembroEquipe(data) {
        return await DB.create('turne_equipe', data);
    },
    async atualizarPresenca(membroId, status) {
        return await DB.patch('turne_equipe', membroId, { status_presenca: status });
    },

    async listarChecklist(turneId) {
        return await DB.search('turne_checklists', { turne_id: turneId });
    },
    async atualizarChecklist(itemId, status) {
        return await DB.patch('turne_checklists', itemId, { status, updated_at: new Date().toISOString() });
    },

    async obterHospedagem(turneId) {
        const h = await DB.search('turne_hospedagens', { turne_id: turneId });
        return h && h.length > 0 ? h[0] : null;
    },
    async salvarHospedagem(data) {
        if (data.id) return await DB.patch('turne_hospedagens', data.id, data);
        return await DB.create('turne_hospedagens', data);
    },

    async obterTransporte(turneId) {
        const t = await DB.search('turne_transportes', { turne_id: turneId });
        return t && t.length > 0 ? t[0] : null;
    },
    async salvarTransporte(data) {
        if (data.id) return await DB.patch('turne_transportes', data.id, data);
        return await DB.create('turne_transportes', data);
    },

    // --- NOVA LOGÍSTICA (Voos, Quartos e Riders) ---
    async listarVoos(turneId) {
        return await DB.search('turne_passagens_aereas', { turne_id: turneId });
    },
    async salvarVoo(data) {
        if (data.id) return await DB.patch('turne_passagens_aereas', data.id, data);
        return await DB.create('turne_passagens_aereas', data);
    },
    async deletarVoo(id) {
        return await DB.delete('turne_passagens_aereas', id);
    },

    async listarRooming(turneId) {
        return await DB.search('turne_rooming_list', { turne_id: turneId });
    },
    async salvarQuarto(data) {
        if (data.id) return await DB.patch('turne_rooming_list', data.id, data);
        return await DB.create('turne_rooming_list', data);
    },
    async deletarQuarto(id) {
        return await DB.delete('turne_rooming_list', id);
    },

    async listarRiders(turneId) {
        return await DB.search('turne_riders', { turne_id: turneId });
    },
    async salvarRider(data) {
        if (data.id) return await DB.patch('turne_riders', data.id, data);
        return await DB.create('turne_riders', data);
    },

    async listarMensagens(turneId) {
        // Usando search basico primeiro, se quiser nomes precisará de join manual se o search for limitado
        const msgs = await DB.search('turne_mensagens', { turne_id: turneId });
        // Enriquecer com nomes de usuários do cache/DB
        const usuarios = await DB.getAll('usuarios');
        return msgs.map(m => ({
            ...m,
            usuarios: usuarios.find(u => u.id === m.usuario_id)
        })).sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    },
    async enviarMensagem(turneId, msg) {
        const user = window.Auth?.currentUser;
        if (!user) return null;
        return await DB.create('turne_mensagens', {
            turne_id: turneId,
            usuario_id: user.id,
            mensagem: msg
        });
    }
};

