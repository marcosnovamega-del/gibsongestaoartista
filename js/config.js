/* ========================================
   GIBSON MANAGER - CONFIGURATION
   Centralização de configurações globais
======================================== */

const Config = {
    // URL base da API (Supabase)
    SUPABASE_URL: 'https://talaepizcasxzutytliv.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhbGFlcGl6Y2FzeHp1dHl0bGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTg2MjgsImV4cCI6MjA5Mzc5NDYyOH0.T6J0l48hbULilE2xEMDkqVpwd1t6gBFMgVEEQG9GhmM',

    // Configurações de Cache
    CACHE_ENABLED: true,
    CACHE_TTL: 10 * 60 * 1000, // 10 minutos

    // Configurações do Sistema
    APP_NAME: 'Gibson Manager',
    VERSION: '3.0.0',
    
    // Configurações de UI
    DEFAULT_CURRENCY: 'BRL',
    DATE_LOCALE: 'pt-BR',
    
    // Integrações
    WHATSAPP_PREFIX: '55',
    DEFAULT_WHATSAPP_MESSAGE: 'Olá, sou da Gibson Promoções e gostaria de falar sobre o show.',
    
    // Recursos Ativados
    FEATURES: {
        EXCEL_EXPORT: true,
        WHATSAPP_CONTACT: true,
        SEARCH_GLOBAL: true,
        NOTIFICATIONS: true,
        REAL_DATABASE: true
    }
};

// Exportar para uso global
window.Config = Config;
