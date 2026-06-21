/* ========================================
   KSHOW MANAGER - MAIN
   Inicialização e coordenação global
======================================== */

// Aguardar carregamento do DOM
document.addEventListener('DOMContentLoaded', async function() {
    console.log('%c🚀 KSHOW MANAGER', 'color: #8B5CF6; font-size: 24px; font-weight: 900;');
    console.log('%cSistema Profissional de Gestão Artística v1.1', 'color: #B0B0B0; font-size: 12px; font-weight: 600;');

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

// Mostrar tela de login
function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';

    // Event listener do formulário de login
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
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

// Mostrar aplicação principal
async function showMainApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';

    // Atualizar informações do usuário
    document.getElementById('currentUserName').textContent = Auth.currentUser.nome;
    document.getElementById('currentUserRole').textContent = Auth.currentUser.nivel;

    // Atualizar avatar
    const avatar = document.querySelector('.user-avatar');
    avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(Auth.currentUser.nome)}&background=E10600&color=fff`;

    // Event listener do botão de logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        if (confirm('Tem certeza que deseja sair?')) {
            Auth.logout();
        }
    });

    // Renderizar menu dinâmico baseado em permissões
    renderDynamicMenu();

    // Event listeners da navegação
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            
            // Verificar permissão
            if (!Auth.hasModuleAccess(mapPageToModule(page))) {
                Utils.showToast('Você não tem permissão para acessar este módulo', 'error');
                return;
            }

            Pages.changePage(page);
        });
    });

    // Menu mobile toggle
    document.querySelector('.mobile-menu-toggle').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('mobile-open');
    });

    // Fechar menu mobile ao clicar em item (mobile)
    if (window.innerWidth <= 768) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelector('.sidebar').classList.remove('mobile-open');
            });
        });
    }

    // Inicializar contador de alertas
    await updateAlertBadges();

    // Renderizar dashboard inicial
    await Pages.renderDashboard();

    // Atualizar alertas a cada 5 minutos
    setInterval(updateAlertBadges, 5 * 60 * 1000);
}

// Renderizar menu dinâmico baseado em permissões
function renderDynamicMenu() {
    const allowedModules = Auth.getAllowedModules();
    const sidebarNav = document.getElementById('sidebarNav');
    
    // Mapeamento de módulos para HTML
    const modulesMap = {
        'Dashboard': '<a href="#" class="nav-item active" data-page="dashboard"><i class="fas fa-chart-line"></i><span>Dashboard</span></a>',
        'Escritorio': '<a href="#" class="nav-item" data-page="escritorio"><i class="fas fa-building"></i><span>Escritório</span></a>',
        'Artistas': '<a href="#" class="nav-item" data-page="artistas"><i class="fas fa-microphone"></i><span>Artistas</span></a>',
        'Eventos': '<a href="#" class="nav-item" data-page="eventos"><i class="fas fa-calendar-alt"></i><span>Eventos</span></a>',
        'Contratos': '<a href="#" class="nav-item" data-page="contratos"><i class="fas fa-file-contract"></i><span>Contratos</span></a>',
        'Financeiro': '<a href="#" class="nav-item" data-page="financeiro"><i class="fas fa-money-bill-wave"></i><span>Financeiro</span></a>',
        'Equipe': '<a href="#" class="nav-item" data-page="equipe"><i class="fas fa-users"></i><span>Equipe</span></a>',
        'Alertas': '<a href="#" class="nav-item" data-page="alertas"><i class="fas fa-bell"></i><span>Alertas</span><span class="badge" id="alertasBadge">0</span></a>',
        'Usuarios': '<a href="#" class="nav-item" data-page="usuarios"><i class="fas fa-user-shield"></i><span>Usuários</span></a>',
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

// Mapear nome de página para nome de módulo
function mapPageToModule(page) {
    const map = {
        'dashboard': 'Dashboard',
        'escritorio': 'Escritorio',
        'artistas': 'Artistas',
        'eventos': 'Eventos',
        'contratos': 'Contratos',
        'financeiro': 'Financeiro',
        'equipe': 'Equipe',
        'alertas': 'Alertas',
        'usuarios': 'Usuarios',
        'configuracoes': 'Configuracoes'
    };
    return map[page] || page;
}

// Atualizar badges de alertas
async function updateAlertBadges() {
    try {
        const parcelasAtrasadas = await ParcelasDB.verificarAtrasadas();
        const eventos = await EventosDB.listar();
        const contratos = await ContratosDB.listar();
        
        // Eventos próximos (próximos 7 dias)
        const hoje = new Date();
        const em7Dias = new Date();
        em7Dias.setDate(hoje.getDate() + 7);
        
        const eventosProximos = eventos.filter(e => {
            const dataEvento = new Date(e.data);
            return dataEvento >= hoje && dataEvento <= em7Dias;
        });

        // Contratos não assinados
        const contratosPendentes = contratos.filter(c => c.status === 'Pendente');

        // Despesas pendentes
        const despesas = await DespesasDB.listar();
        const despesasPendentes = despesas.filter(d => d.status === 'Pendente');

        const totalAlertas = parcelasAtrasadas.length + eventosProximos.length + contratosPendentes.length + despesasPendentes.length;

        // Atualizar badges
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

// Botão de notificações
setTimeout(() => {
    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', () => {
            Pages.changePage('alertas');
        });
    }
}, 1000);

// Fechar modal ao pressionar ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        Modals.close();
    }
});

// Prevenir zoom no mobile (melhor UX)
document.addEventListener('touchmove', (e) => {
    if (e.scale !== 1) {
        e.preventDefault();
    }
}, { passive: false });

// Exportar funções globais
window.Pages = Pages;
window.Modals = Modals;
window.Auth = Auth;
window.Utils = Utils;
window.DB = DB;

// Log de inicialização
console.log('%c✅ Sistema inicializado com sucesso!', 'color: #10B981; font-weight: 700;');
console.log('%c📊 Módulos carregados:', 'color: #B0B0B0; font-weight: 600;');
console.log('  → Auth, Database, Utils, Pages, Modals');
console.log('%c🔐 Usuário atual:', 'color: #B0B0B0; font-weight: 600;');
if (Auth.currentUser) {
    console.log(`  → ${Auth.currentUser.nome} (${Auth.currentUser.nivel})`);
}