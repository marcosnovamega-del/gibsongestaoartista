/* ========================================
   GIBSON MANAGER - AUTH
   Gerenciamento de sessão e permissões
======================================== */

const Auth = {
    currentUser: null,

    async init() {
        const savedUser = localStorage.getItem('gibson_current_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            // Carregar dados do escritório
            if (this.currentUser.escritorio_id) {
                const esc = await DB.getById('escritorios', this.currentUser.escritorio_id);
                if (esc) this.escritorio = esc;
            }
            // Carregar artistas vinculados
            await this.carregarArtistasVinculados();
            return true;
        }
        return false;
    },

    // Login
    async login(username, password) {
        try {
            const usuario = await UsuariosDB.buscarPorUsername(username);

            if (!usuario) {
                throw new Error('Usuário não encontrado');
            }

            if (!usuario.ativo) {
                throw new Error('Usuário inativo');
            }

            // Verificar senha: tenta hash SHA-256 primeiro, depois plaintext (migração)
            const hashedInput = await Utils.hashPassword(password);
            const senhaCorreta = (usuario.password === hashedInput) || (usuario.password === password);

            if (!senhaCorreta) {
                throw new Error('Senha incorreta');
            }

            // Migração automática: se senha estava em plaintext, salva como hash agora
            if (usuario.password === password) {
                console.log('🔒 Atualizando senha para formato seguro...');
                await UsuariosDB.atualizar(usuario.id, { password: hashedInput });
                usuario.password = hashedInput;
            }

            this.currentUser = usuario;
            localStorage.setItem('gibson_current_user', JSON.stringify(usuario));

            // Carregar artistas vinculados imediatamente após login
            await this.carregarArtistasVinculados();

            // Registrar login na auditoria (assíncrono, não bloqueia)
            setTimeout(() => {
                if (typeof AuditDB !== 'undefined') {
                    AuditDB.registrarLogin(usuario);
                }
            }, 500);

            // Alertar se senha for padrão/fraca
            const result = { success: true, user: usuario };
            if (Utils.isDefaultPassword(password)) {
                result.senhaFraca = true;
            }
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Carregar lista de artistas que o usuário pode ver
    async carregarArtistasVinculados() {
        if (!this.currentUser) return;

        try {
            // Se for Admin Master, ele pode ver todos os artistas do escritório
            if (this.isAdmin()) {
                const todosArtistas = await ArtistasDB.listar(true);
                this.artistasPermitidos = todosArtistas;
            } else {
                // Buscar vínculos na tabela usuario_artista
                const { data, error } = await sbClient
                    .from('usuario_artista')
                    .select('artista_id, artistas(*)')
                    .eq('usuario_id', this.currentUser.id);

                if (error) throw error;
                this.artistasPermitidos = (data || []).map(d => d.artistas);
            }

            // Definir artista selecionado inicialmente
            const lastSelected = localStorage.getItem('gibson_selected_artista');
            if (lastSelected === 'todos') {
                // Preservar seleção "Todos" (só admin ou multi-artista)
                this.selectedArtistaId = 'todos';
            } else if (lastSelected && this.artistasPermitidos.some(a => a.id === lastSelected)) {
                this.selectedArtistaId = lastSelected;
            } else if (this.artistasPermitidos.length > 0) {
                // Admin começa em "Todos" por padrão; outros no primeiro artista
                this.selectedArtistaId = this.isAdmin() ? 'todos' : this.artistasPermitidos[0].id;
                localStorage.setItem('gibson_selected_artista', this.selectedArtistaId);
            }
        } catch (e) {
            console.error('Erro ao carregar artistas vinculados:', e);
            this.artistasPermitidos = [];
        }
    },

    // Obter artista selecionado
    getSelectedArtistaId() {
        return this.selectedArtistaId || null;
    },

    getSelectedArtista() {
        return this.artistasPermitidos?.find(a => a.id === this.selectedArtistaId) || null;
    },

    async setSelectedArtista(id) {
        const isTodos = id === 'todos';
        const lista = this.artistasPermitidos || [];
        const isValido = isTodos || lista.some(a => String(a.id) === String(id));
        if (!isValido) {
            console.warn('[Auth] setSelectedArtista: id inválido:', id);
            return false;
        }

        this.selectedArtistaId = id;
        localStorage.setItem('gibson_selected_artista', id);

        // Fechar dropdown e atualizar seletor imediatamente
        document.getElementById('artistaDropdown')?.classList.remove('show');
        if (window.MultiArtista) MultiArtista.renderSelector();

        // Limpar cache e recarregar página
        if (window.DB) DB.clearAllCache();
        if (window.Pages) {
            Pages.isChanging = false; // reset guard
            await Pages.changePage(Pages.currentPage || 'dashboard');
        }

        // Toast de confirmação
        const nome = isTodos ? 'Todos os Artistas' : (lista.find(a => String(a.id) === String(id))?.nome || id);
        if (window.Utils) Utils.showToast(`Artista: ${nome}`, 'success');

        return true;
    },

    // Logout
    logout() {
        this.currentUser = null;
        this.artistasPermitidos = [];
        this.selectedArtistaId = null;
        localStorage.removeItem('gibson_current_user');
        localStorage.removeItem('gibson_selected_artista');
        window.location.reload();
    },

    // Verificar permissão por módulo
    hasModuleAccess(moduleName) {
        if (!this.currentUser) return false;
        if (this.isAdmin()) return true;
        const permissions = this.currentUser.permissoes || [];
        
        // Se não tem array de permissões, usar lógica antiga (compatibilidade)
        if (permissions.length === 0) {
            return this.hasPermissionOld(moduleName);
        }

        return permissions.includes(moduleName);
    },

    // Lógica antiga de permissões (fallback)
    hasPermissionOld(permission) {
        if (!this.currentUser) return false;

        const permissions = {
            'Admin Master': ['all'],
            'Manager': ['Dashboard', 'Artistas', 'Eventos', 'Equipe', 'Contratos', 'Alertas'],
            'Produtor': ['Dashboard', 'Eventos', 'Alertas'],
            'Financeiro': ['Dashboard', 'Financeiro', 'Eventos', 'Contratos', 'Alertas'],
            'Produção/Técnico': ['Dashboard', 'Agenda', 'Eventos', 'Equipe', 'Alertas']
        };

        const userPermissions = permissions[this.currentUser.nivel] || [];
        
        if (userPermissions.includes('all')) return true;
        if (userPermissions.includes(permission)) return true;

        return false;
    },

    // Verificar se usuário é admin
    isAdmin() {
        return this.currentUser && this.currentUser.nivel === 'Admin Master';
    },

    // Verificar se usuário é manager
    isManager() {
        return this.currentUser && this.currentUser.nivel === 'Manager';
    },

    // Verificar se usuário é produtor
    isProdutor() {
        return this.currentUser && this.currentUser.nivel === 'Produtor';
    },

    // Obter artista vinculado (para managers e produtores - agora baseado na seleção)
    getArtistaVinculado() {
        if (this.isAdmin()) return null; // Admin não tem "um" artista fixo
        return this.selectedArtistaId || this.currentUser.artista_vinculado || null;
    },

    // Filtrar dados baseado em permissões e artista selecionado
    async filterByPermissions(data, dataType) {
        if (this.isAdmin()) {
            // Se admin selecionou um artista específico (não 'todos'), filtrar por ele
            const selectedId = this.getSelectedArtistaId();
            if (selectedId && selectedId !== 'todos') {
                return data.filter(item => {
                    if (dataType === 'artistas') return item.id === selectedId;
                    if (item.artista_id) return item.artista_id === selectedId;
                    return true;
                });
            }
            return data; // 'todos' = vê tudo
        }

        if (this.isManager() || this.isProdutor() || this.currentUser.nivel === 'Artista') {
            const artistaId = this.getArtistaVinculado();
            
            if (!artistaId && !this.isAdmin()) return []; 
            
            // Filtro universal por artista_id ou id (se for tabela de artistas)
            return data.filter(item => {
                if (dataType === 'artistas') return item.id === artistaId;
                if (item.artista_id) return item.artista_id === artistaId;
                return true; // Se não tem artista_id, assume-se que é do escritório (já filtrado no DB)
            });
        }

        // Outros níveis veem tudo mas com restrições de edição
        return data;
    },

    // Verificar se pode editar
    canEdit(dataType, itemArtistaId = null) {
        if (this.isAdmin()) return true;

        if (this.isManager()) {
            // Manager só pode editar dados do próprio artista
            const artistaVinculado = this.getArtistaVinculado();
            if (!artistaVinculado) return false;
            
            // Para artistas, só pode editar o vinculado
            if (dataType === 'artistas') {
                return itemArtistaId === artistaVinculado;
            }
            
            // Para outros, pode editar se for do artista vinculado
            return itemArtistaId === artistaVinculado || !itemArtistaId;
        }

        if (this.currentUser.nivel === 'Financeiro') {
            // Financeiro pode editar dados financeiros
            return ['parcelas', 'despesas', 'despesas_evento'].includes(dataType);
        }

        if (this.isProdutor()) {
            const artistaVinculado = this.getArtistaVinculado();
            if (!artistaVinculado) return false;
            
            // Produtor só pode editar despesas_evento do seu artista
            if (dataType === 'despesas_evento') {
                return itemArtistaId === artistaVinculado || !itemArtistaId;
            }
            return false;
        }

        return false;
    },

    // Verificar se pode deletar
    canDelete(dataType, itemArtistaId = null) {
        // Apenas admin pode deletar
        if (this.isAdmin()) return true;

        if (this.isManager() && this.currentUser.artista_vinculado === itemArtistaId) {
            // Manager pode deletar apenas alguns tipos de dados do próprio artista
            return ['eventos', 'equipe', 'despesas_evento'].includes(dataType);
        }

        if (this.isProdutor() && this.currentUser.artista_vinculado === itemArtistaId) {
            // Produtor pode deletar apenas as próprias despesas de evento
            return ['despesas_evento'].includes(dataType);
        }

        return false;
    },

    // Atualizar informações do usuário atual
    async updateCurrentUser() {
        if (this.currentUser) {
            const usuarios = await UsuariosDB.listar();
            const updated = usuarios.find(u => u.id === this.currentUser.id);
            if (updated) {
                this.currentUser = updated;
                localStorage.setItem('gibson_current_user', JSON.stringify(updated));
            }
        }
    },

    // Obter módulos permitidos
    getAllowedModules() {
        if (!this.currentUser) return [];

        if (this.isAdmin()) {
            return ['Dashboard', 'Artistas', 'Eventos', 'Contratos', 'Vendas', 'Central de Turnê', 'Financeiro', 'Equipe', 'Alertas', 'Usuarios', 'Configuracoes'];
        }

        const permissions = this.currentUser.permissoes || [];
        
        if (permissions.length === 0) {
            // Usar lógica antiga
            const defaultPermissions = {
                'Manager':           ['Dashboard', 'Artistas', 'Eventos', 'Vendas', 'Central de Turnê', 'Equipe', 'Contratos', 'Alertas'],
                'Financeiro':        ['Dashboard', 'Financeiro', 'Eventos', 'Contratos', 'Alertas'],
                'Produção/Técnico':  ['Dashboard', 'Eventos', 'Central de Turnê', 'Equipe', 'Alertas'],
                'Artista':           ['Dashboard', 'Eventos', 'Contratos', 'Central de Turnê', 'Alertas']
            };
            // Produtor também deve ter acesso
            if (this.isProdutor()) return ['Dashboard', 'Eventos', 'Central de Turnê', 'Alertas'];
            return defaultPermissions[this.currentUser.nivel] || ['Dashboard'];
        }

        return permissions;
    },

    getOffice() {
        return this.escritorio || { nome: 'Gibson Manager' };
    },

    getArtistaColor(artistaId) {
        const art = this.artistasPermitidos?.find(a => a.id === artistaId);
        return art?.cor_tema || '#D4AF37';
    }
};