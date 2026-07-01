/* ========================================
   GIBSON MANAGER PRO - DATABASE MODULE
   Gerenciamento de dados usando API REST
======================================== */

const DB = {
    // Base URL para API
    baseURL: 'tables/',

    // Cache local para performance
    cache: {
        artistas: null,
        eventos: null,
        usuarios: null,
        equipe: null,
        contratos: null,
        parcelas: null,
        despesas_evento: null,
        configuracoes: null
    },

    // GET: Buscar todos os registros de uma tabela
    async getAll(tableName, useCache = false) {
        if (useCache && this.cache[tableName]) {
            return this.cache[tableName];
        }

        try {
            const response = await fetch(`${this.baseURL}${tableName}?limit=1000`);
            if (!response.ok) throw new Error(`Erro ao buscar ${tableName}`);
            const result = await response.json();
            this.cache[tableName] = result.data;
            return result.data;
        } catch (error) {
            console.error(`Erro em getAll(${tableName}):`, error);
            return [];
        }
    },

    // GET: Buscar registro por ID
    async getById(tableName, id) {
        try {
            const response = await fetch(`${this.baseURL}${tableName}/${id}`);
            if (!response.ok) throw new Error(`Registro não encontrado`);
            return await response.json();
        } catch (error) {
            console.error(`Erro em getById(${tableName}, ${id}):`, error);
            return null;
        }
    },

    // POST: Criar novo registro
    async create(tableName, data) {
        try {
            const response = await fetch(`${this.baseURL}${tableName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`Erro ao criar registro`);
            this.cache[tableName] = null; // Limpa cache
            return await response.json();
        } catch (error) {
            console.error(`Erro em create(${tableName}):`, error);
            return null;
        }
    },

    // PUT: Atualizar registro completo
    async update(tableName, id, data) {
        try {
            const response = await fetch(`${this.baseURL}${tableName}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`Erro ao atualizar registro`);
            this.cache[tableName] = null; // Limpa cache
            return await response.json();
        } catch (error) {
            console.error(`Erro em update(${tableName}, ${id}):`, error);
            return null;
        }
    },

    // PATCH: Atualizar campos específicos
    async patch(tableName, id, data) {
        try {
            const response = await fetch(`${this.baseURL}${tableName}/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`Erro ao atualizar registro`);
            this.cache[tableName] = null; // Limpa cache
            return await response.json();
        } catch (error) {
            console.error(`Erro em patch(${tableName}, ${id}):`, error);
            return null;
        }
    },

    // DELETE: Deletar registro (soft delete)
    async delete(tableName, id) {
        try {
            const response = await fetch(`${this.baseURL}${tableName}/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error(`Erro ao deletar registro`);
            this.cache[tableName] = null; // Limpa cache
            return true;
        } catch (error) {
            console.error(`Erro em delete(${tableName}, ${id}):`, error);
            return false;
        }
    },

    // Buscar com filtros
    async search(tableName, filters = {}) {
        const allRecords = await this.getAll(tableName);
        
        if (Object.keys(filters).length === 0) {
            return allRecords;
        }

        return allRecords.filter(record => {
            return Object.keys(filters).every(key => {
                return record[key] === filters[key];
            });
        });
    },

    // Limpar cache específico ou todo
    clearCache(tableName = null) {
        if (tableName) {
            this.cache[tableName] = null;
        } else {
            Object.keys(this.cache).forEach(key => {
                this.cache[key] = null;
            });
        }
    }
};

// Funções específicas para cada módulo
const ArtistasDB = {
    async listar() {
        return await DB.getAll('artistas');
    },

    async buscarPorId(id) {
        return await DB.getById('artistas', id);
    },

    async criar(artista) {
        return await DB.create('artistas', {
            id: Utils.generateId(),
            foto: artista.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(artista.nome) + '&background=E10600&color=fff&size=200',
            nome: artista.nome,
            status: artista.status || 'Ativo',
            comissao_padrao: artista.comissao_padrao || 10,
            modelo_contrato: artista.modelo_contrato || '',
            data_cadastro: new Date().toISOString()
        });
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

const EventosDB = {
    async listar() {
        return await DB.getAll('eventos');
    },

    async buscarPorId(id) {
        return await DB.getById('eventos', id);
    },

    async criar(evento) {
        const valorLiquido = evento.cache_bruto - (evento.comissao || 0);
        
        return await DB.create('eventos', {
            id: Utils.generateId(),
            ...evento,
            valor_liquido: valorLiquido,
            status: evento.status || 'Confirmado'
        });
    },

    async atualizar(id, evento) {
        if (evento.cache_bruto) {
            evento.valor_liquido = evento.cache_bruto - (evento.comissao || 0);
        }
        return await DB.patch('eventos', id, evento);
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

const EquipeDB = {
    async listar() {
        return await DB.getAll('equipe');
    },

    async buscarPorArtista(artistaId) {
        return await DB.search('equipe', { artista_id: artistaId });
    },

    async criar(membro) {
        return await DB.create('equipe', {
            id: Utils.generateId(),
            ...membro
        });
    },

    async atualizar(id, membro) {
        return await DB.patch('equipe', id, membro);
    },

    async deletar(id) {
        return await DB.delete('equipe', id);
    }
};

const DespesasDB = {
    async listar() {
        return await DB.getAll('despesas');
    },

    async buscarPorEvento(eventoId) {
        return await DB.search('despesas', { evento_id: eventoId });
    },

    async criar(despesa) {
        return await DB.create('despesas', {
            id: Utils.generateId(),
            ...despesa,
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

const ContratosDB = {
    async listar() {
        return await DB.getAll('contratos');
    },

    async buscarPorEvento(eventoId) {
        const contratos = await this.listar();
        return contratos.find(c => c.evento_id === eventoId);
    },

    async criar(contrato) {
        return await DB.create('contratos', {
            id: Utils.generateId(),
            ...contrato,
            data_geracao: new Date().toISOString(),
            status: contrato.status || 'Pendente'
        });
    },

    async atualizar(id, contrato) {
        return await DB.patch('contratos', id, contrato);
    },

    async assinar(id) {
        return await DB.patch('contratos', id, {
            status: 'Assinado',
            data_assinatura: new Date().toISOString()
        });
    },

    async deletar(id) {
        return await DB.delete('contratos', id);
    }
};

const ParcelasDB = {
    async listar() {
        return await DB.getAll('parcelas');
    },

    async buscarPorEvento(eventoId) {
        return await DB.search('parcelas', { evento_id: eventoId });
    },

    async criar(parcela) {
        return await DB.create('parcelas', {
            id: Utils.generateId(),
            ...parcela,
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

const UsuariosDB = {
    async listar() {
        return await DB.getAll('usuarios');
    },

    async buscarPorUsername(username) {
        const usuarios = await this.listar();
        // Aceita username OU email no campo de login
        return usuarios.find(u => u.username === username || u.email === username);
    },

    async criar(usuario) {
        return await DB.create('usuarios', {
            id: Utils.generateId(),
            ...usuario,
            ativo: true
        });
    },

    async atualizar(id, usuario) {
        return await DB.patch('usuarios', id, usuario);
    },

    async buscarPorId(id) {
        const todos = await this.listar();
        return todos.find(u => u.id === id) || null;
    },

    async deletar(id) {
        // Proteção: conta master não pode ser excluída
        const MASTER_EMAIL = 'agenciagibson@gmail.com';
        const usuario = await this.buscarPorId(id);
        if (usuario && usuario.email === MASTER_EMAIL) {
            console.warn('[UsuariosDB] Tentativa de excluir conta master bloqueada.');
            Utils.showToast('Esta conta é protegida e não pode ser excluída.', 'error');
            return false;
        }
        return await DB.delete('usuarios', id);
    }
};

const ConfigDB = {
    async obter() {
        const configs = await DB.getAll('configuracoes');
        return configs.length > 0 ? configs[0] : null;
    },

    async atualizar(config) {
        const atual = await this.obter();
        if (atual) {
            return await DB.patch('configuracoes', atual.id, config);
        } else {
            return await DB.create('configuracoes', {
                id: Utils.generateId(),
                ...config
            });
        }
    }
};