/* ========================================
   KSHOW MANAGER - MAIN OTIMIZADO
   Sistema ultra-rápido com lazy loading
======================================== */

document.addEventListener('DOMContentLoaded', async function() {
    console.log('%c🚀 KSHOW MANAGER', 'color: #8B5CF6; font-size: 24px; font-weight: 900;');
    console.log('%c⚡ VERSÃO OTIMIZADA - Performance Máxima', 'color: #10B981; font-size: 12px; font-weight: 600;');

    // Inicializar módulos
    Modals.init();
    
    // Verificar autenticação
    const isAuthenticated = await Auth.init();
    
    if (isAuthenticated) {
        showMainApp();
    } else {
        showLoginScreen();
    }
});

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';

    const loginForm = document.getElementById('loginForm');
    
    // Evitar múltiplos listeners
    const newForm = loginForm.cloneNode(true);
    loginForm.parentNode.replaceChild(newForm, loginForm);
    
    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        Utils.showLoading();
        const result = await Auth.login(username, password);
        Utils.hideLoading();

        if (result.success) {
            Utils.showToast('Login realizado com sucesso!', 'success');
            showMainApp();
        } else {
            Utils.showToast(result.error || 'Erro ao fazer login', 'error');
        }
    });
}

async function showMainApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';

    // Atualizar informações do usuário
    const office = Auth.getOffice();
    document.getElementById('currentUserName').textContent = Auth.currentUser.nome;
    document.getElementById('currentUserRole').textContent = `${Auth.currentUser.nivel} | ${office.nome}`;

    // Atualizar avatar e cor do tema se selecionado
    const selectedArt = Auth.getSelectedArtista();
    const avatar = document.querySelector('.user-avatar');
    avatar.src = selectedArt?.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(Auth.currentUser.nome)}&background=E10600&color=fff`;
    
    if (selectedArt?.cor_tema) {
        document.documentElement.style.setProperty('--red-primary', selectedArt.cor_tema);
    }

    // Event listener do botão de logout (evitar duplicatas)
    const logoutBtn = document.getElementById('logoutBtn');
    const newLogoutBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
    
    newLogoutBtn.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja sair?')) {
            Auth.logout();
        }
    });

    // Renderizar menu dinâmico baseado em permissões
    renderDynamicMenu();

    // Renderizar seletor de artistas (Multi-Artista)
    if (typeof MultiArtista !== 'undefined') {
        MultiArtista.renderSelector();
    }

    // Event listeners da navegação (otimizado)
    setupNavigation();

    // Global Search listener
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        globalSearch.addEventListener('input', Utils.debounce((e) => {
            const searchTerm = e.target.value;
            if (Pages.handleSearch) {
                Pages.handleSearch(searchTerm);
            }
        }, 300));
    }

    // Menu mobile toggle
    setupMobileMenu();

    // Atualizar badges de alertas (OTIMIZADO - usa cache do dashboard)
    await updateAlertBadges();

    // Registrar listener do botão de notificações
    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', () => Pages.changePage('alertas'));
    }

    // Renderizar dashboard inicial
    await Pages.renderDashboard();
}

function renderDynamicMenu() {
    const allowedModules = Auth.getAllowedModules();
    const sidebarNav = document.getElementById('sidebarNav');
    
    const modulesMap = {
        'Dashboard':     '<a href="#" class="nav-item active" data-page="dashboard"><i class="fas fa-chart-line"></i><span>Dashboard</span></a>',
        'Artistas':      '<a href="#" class="nav-item" data-page="artistas"><i class="fas fa-microphone"></i><span>Artistas</span></a>',
        'Eventos':       '<a href="#" class="nav-item" data-page="eventos"><i class="fas fa-calendar-alt"></i><span>Eventos</span></a>',
        'Contratos':     '<a href="#" class="nav-item" data-page="contratos"><i class="fas fa-file-contract"></i><span>Contratos</span></a>',
        'Vendas':        '<a href="#" class="nav-item" data-page="vendas"><i class="fas fa-handshake"></i><span>Vendas</span></a>',
        'Central de Turnê': '<a href="#" class="nav-item" data-page="turnes"><i class="fas fa-route"></i><span>Central de Turnê</span></a>',
        'Relatórios':    '<a href="#" class="nav-item" data-page="relatorios"><i class="fas fa-file-invoice-dollar"></i><span>Relatórios</span></a>',
        'Financeiro':    '<a href="#" class="nav-item" data-page="financeiro"><i class="fas fa-money-bill-wave"></i><span>Financeiro</span></a>',
        'Equipe':        '<a href="#" class="nav-item" data-page="equipe"><i class="fas fa-users"></i><span>Equipe</span></a>',
        'Alertas':       '<a href="#" class="nav-item" data-page="alertas"><i class="fas fa-bell"></i><span>Alertas</span><span class="badge" id="alertasBadge">0</span></a>',
        'Usuarios':      '<a href="#" class="nav-item" data-page="usuarios"><i class="fas fa-user-shield"></i><span>Usuários</span></a>',
        'Configuracoes': '<a href="#" class="nav-item" data-page="configuracoes"><i class="fas fa-cog"></i><span>Configurações</span></a>'
    };

    let html = '';
    allowedModules.forEach(module => {
        if (modulesMap[module]) {
            html += modulesMap[module];
        }
    });

    sidebarNav.innerHTML = html;
}

function setupNavigation() {
    const sidebarNav = document.getElementById('sidebarNav');
    
    // Usar event delegation para melhor performance
    sidebarNav.addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item');
        if (!navItem) return;
        
        e.preventDefault();
        const page = navItem.dataset.page;
        
        // Verificar permissão
        if (!Auth.hasModuleAccess(mapPageToModule(page))) {
            Utils.showToast('Você não tem permissão para acessar este módulo', 'error');
            return;
        }

        Pages.changePage(page);
    });
}

function setupMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
    });

    // Fechar menu ao clicar em item (mobile)
    if (window.innerWidth <= 768) {
        sidebar.addEventListener('click', (e) => {
            if (e.target.closest('.nav-item')) {
                sidebar.classList.remove('mobile-open');
            }
        });
    }
}

function mapPageToModule(page) {
    const map = {
        'dashboard':    'Dashboard',
        'artistas':     'Artistas',
        'eventos':      'Eventos',
        'contratos':    'Contratos',
        'vendas':       'Vendas',
        'turnes':       'Central de Turnê',
        'relatorios':   'Relatórios Consolidados',
        'financeiro':   'Financeiro',
        'equipe':       'Equipe',
        'alertas':      'Alertas',
        'usuarios':     'Usuarios',
        'configuracoes':'Configuracoes'
    };
    return map[page] || page;
}

// Atualizar badges de alertas (OTIMIZADO - reusa cache já populado)
async function updateAlertBadges() {
    try {
        // Essas queries já foram feitas pelo dashboard e estão no cache — zero round-trip extra
        const [parcelas, eventos, contratos, despesas] = await Promise.all([
            ParcelasDB.listar(),
            EventosDB.listar(),
            ContratosDB.listar(),
            DespesasDB.listar()
        ]);
        
        const hoje = new Date();
        const em7Dias = new Date();
        em7Dias.setDate(hoje.getDate() + 7);
        
        const parcelasAtrasadas = parcelas.filter(p => {
            if (p.status === 'Pago') return false;
            return new Date(p.data_vencimento) < hoje;
        }).length;

        const eventosProximos = eventos.filter(e => {
            const dataEvento = new Date(e.data);
            return dataEvento >= hoje && dataEvento <= em7Dias;
        }).length;

        const contratosPendentes = contratos.filter(c => c.status === 'Pendente').length;
        const despesasPendentes = despesas.filter(d => d.status === 'Pendente').length;

        const totalAlertas = parcelasAtrasadas + eventosProximos + contratosPendentes + despesasPendentes;

        const alertasBadge = document.getElementById('alertasBadge');
        const notificationBadge = document.getElementById('notificationBadge');

        if (alertasBadge) {
            alertasBadge.textContent = totalAlertas;
            alertasBadge.style.display = totalAlertas > 0 ? 'inline-block' : 'none';
        }
        if (notificationBadge) {
            notificationBadge.textContent = totalAlertas;
            notificationBadge.style.display = totalAlertas > 0 ? 'inline-block' : 'none';
        }
    } catch (error) {
        console.error('Erro ao atualizar alertas:', error);
    }
}

// Fechar modal ao pressionar ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        Modals.close();
    }
});

// Exportar funções globais
window.Pages = Pages;
window.Modals = Modals;
window.Auth = Auth;
window.Utils = Utils;
window.DB = DB;
window.updateAlertBadges = updateAlertBadges;

// ─── Ativar Acesso do App para Artista ────────────────────────────────────
window.ativarAcessoArtista = async function(artistaId, artistaNome) {
    if (!confirm(`Ativar acesso ao app para "${artistaNome}"?\n\nUm usuário será criado. O artista poderá criar sua senha ao abrir o link pela primeira vez.`)) return;

    Utils.showLoading();
    try {
        // Gerar username a partir do nome
        const username = artistaNome
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '.')
            .replace(/\.{2,}/g, '.')
            .replace(/^\.+|\.+$/g, '')
            .substring(0, 30);

        // Buscar escritório do usuário logado para herdar
        const escritorioId = Auth.currentUser?.escritorio_id || null;

        await UsuariosDB.criar({
            username: username,
            password: null,
            nome: artistaNome,
            email: null,
            nivel: 'Artista',
            artista_vinculado: artistaId,
            escritorio_id: escritorioId,
            permissoes: [],
            ativo: true
        });

        Utils.hideLoading();
        Utils.showToast(`✅ Acesso ativado para ${artistaNome.split(' ')[0]}! Agora envie o link pelo WhatsApp.`, 'success');

        // Recarregar a página do artista para atualizar o status
        await Pages.renderArtistaProfile(artistaId);

    } catch(err) {
        Utils.hideLoading();
        console.error(err);
        Utils.showToast('Erro ao ativar acesso: ' + (err.message || err), 'error');
    }
};

console.log('%c✅ Sistema inicializado!', 'color: #10B981; font-weight: 700;');
