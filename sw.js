// 🧞 El ayudante silencioso de GymGenio.
// Vive dentro del teléfono y hace que la app abra rápido y funcione sin internet.
//
// REGLA DE ORO: primero pregunta a internet, y SOLO si no hay señal usa lo guardado.
// Así nunca le muestra a nadie una versión vieja de tu app.

// Al subir cambios de imágenes o diseño, sube este número: limpia lo guardado.
const CACHE = 'gymgenio-v2';

// Lo mínimo para que la app abra aunque no haya señal.
const BASICOS = [
  '/',
  '/index.html',
  '/app.html',
  '/login.html',
  '/icon-192.png',
  '/icon-512.png',
  '/logo-emblem.png',
  '/favicon-emblem.png'
];

self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(BASICOS))
      .catch(() => {})          // si algo falla, no rompemos la instalación
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(llaves => Promise.all(llaves.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', evento => {
  const pedido = evento.request;

  // Solo nos metemos con lecturas normales.
  if (pedido.method !== 'GET') return;

  const url = new URL(pedido.url);

  // Nada de otros sitios: Google, Supabase y Stripe se manejan solos.
  if (url.origin !== self.location.origin) return;

  // NUNCA guardar las respuestas del cerebro (planes, cuenta, pagos).
  if (url.pathname.startsWith('/api/')) return;

  evento.respondWith(
    fetch(pedido)
      .then(respuesta => {
        // Guardamos una copia fresca para cuando no haya internet.
        if (respuesta && respuesta.status === 200 && respuesta.type === 'basic') {
          const copia = respuesta.clone();
          caches.open(CACHE).then(c => c.put(pedido, copia)).catch(() => {});
        }
        return respuesta;
      })
      .catch(() =>
        caches.match(pedido).then(guardada => guardada || caches.match('/app.html'))
      )
  );
});
