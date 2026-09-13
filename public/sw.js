/**
 * Service Worker Offline para Elegance Rentals POS
 * Cachea el App Shell (HTML, JS, CSS, Imágenes) para que la URL
 * abra instantáneamente aunque el computador no tenga internet.
 */

const CACHE_NAME = "elegance-pos-v1";
const STATIC_ASSETS = [
  "/",
  "/favicon.png",
  "/logo_casa_del_disfraz.jpg",
  "/manifest.json",
];

// Instalación: Cachear recursos estáticos esenciales
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activación: Limpiar cachés antiguas si hay nueva versión
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptor de peticiones de red (Fetch)
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignorar peticiones que no sean GET o que vayan a Supabase / APIs externas (esas las maneja IndexedDB)
  if (request.method !== "GET" || url.origin.includes("supabase.co") || url.pathname.startsWith("/api/")) {
    return;
  }

  // Estrategia Stale-While-Revalidate / Network-First con fallback a Caché
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        // 1. Intentar descargar de la red
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
          // Guardar copia actualizada en caché
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // 2. Si falló la red (Sin Internet), buscar en caché local
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // 3. Si es una navegación de página HTML y no está en caché exacta, entregar la raíz "/"
        if (request.mode === "navigate") {
          const rootCached = await cache.match("/");
          if (rootCached) return rootCached;
        }

        return new Response("Sin conexión a internet", {
          status: 503,
          statusText: "Service Unavailable",
          headers: new Headers({ "Content-Type": "text/plain" }),
        });
      }
    })
  );
});
