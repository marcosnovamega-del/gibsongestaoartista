const CACHE_NAME = 'kshow-v42';

// Recursos essenciais cacheados na instalação
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/portal.css',
  './css/upload.css',
  './css/route.css',
  './css/vendas.css',
  './css/usuarios.css',
  './css/balanco.css',
  './css/bordero.css',
  './css/turnes.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Saira:ital,wght@0,400;0,500;0,600;0,700;0,800;1,700;1,800&display=swap'
];

// Instalação: cacheia recursos e ativa imediatamente
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll falha se algum recurso não carregar — usamos add individual com try/catch
      return Promise.allSettled(ASSETS.map(url => cache.add(url).catch(() => null)));
    })
  );
});

// Ativação: limpa caches antigos e assume controle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      }),
      self.clients.claim()
    ])
  );
});

// Estratégia: Network First para JS/HTML (sempre atualizado), Cache First para imagens/fontes/ícones
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Supabase: sempre rede, nunca cache
  if (url.includes('supabase.co')) return;

  // CDN externos (fontes, fontawesome): Cache First
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com') || url.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Ícones e imagens: Cache First
  if (url.includes('/icons/') || url.match(/\.(png|jpg|jpeg|svg|ico|webp)$/)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // JS, CSS, HTML: Network First → fallback para cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cacheia resposta válida
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
