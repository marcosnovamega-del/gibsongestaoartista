const CACHE_NAME = 'kshow-v26';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './css/portal.css',
  './js/main.js',
  './js/auth.js',
  './js/pages-portal.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// Instalação: Cacheia os recursos básicos e assume controle imediatamente
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Não espera — ativa imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Ativação: Limpa caches antigos e assume controle de todos os clientes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      }),
      self.clients.claim() // Assume controle de todas as abas abertas
    ])
  );
});

// Estratégia: Network First (Tenta rede, se falhar usa cache)
self.addEventListener('fetch', (event) => {
  // Ignorar requisições para o Supabase (queremos dados em tempo real sempre que possível)
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
