/**
 * Service Worker PWA Offline Interactivo para Elegance Rentals POS
 * Versión 4 (Actualizaciones automáticas inmediatas y caché inteligente)
 */

const CACHE_VERSION = "elegance-pos-v4";
const CACHE_NAME = `elegance-pos-${CACHE_VERSION}-${Date.now()}`;

const CRITICAL_ASSETS = [
  "/",
  "/favicon.png",
  "/logo_casa_del_disfraz.jpg",
  "/manifest.json",
];

// Escuchar mensaje del cliente para forzar activación inmediata o limpiar caché
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "CLEAR_ALL_CACHES") {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      self.skipWaiting();
    });
  }
});

// 1. INSTALACIÓN: Precarga inmediata de recursos críticos
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CRITICAL_ASSETS);
    })
  );
});

// 2. ACTIVACIÓN: Reclamar control de clientes de inmediato y purgar TODAS las cachés viejas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log("[ServiceWorker] Purgando caché obsoleta:", key);
              return caches.delete(key);
            }
          })
        );
      }),
    ])
  );
});

// 3. INTERCEPTOR DE PETICIONES (FETCH)
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignorar métodos no GET o peticiones directas a Supabase
  if (request.method !== "GET" || url.origin.includes("supabase.co")) {
    return;
  }

  // Peticiones de Navegación (HTML Principal)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("/", responseClone));
          }
          return response;
        })
        .catch(async () => {
          // Si no hay red, servir la página principal de la caché para que cargue la app interactiva
          const cached = await caches.match(request);
          if (cached) return cached;
          const rootCached = await caches.match("/");
          if (rootCached) return rootCached;
          return new Response("App cargada en modo local", {
            headers: { "Content-Type": "text/html" },
          });
        })
    );
    return;
  }

  // Peticiones de Archivos Estáticos (.js, .css, .woff2, imágenes, .json)
  const isStaticAsset =
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".mjs") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".json") ||
    url.pathname.includes("/_build/") ||
    url.pathname.includes("/assets/");

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // Si está en caché, devolverlo inmediatamente para máxima velocidad
        if (cachedResponse) {
          // Refrescar en segundo plano si hay red
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        // Si no está en caché, buscarlo en la red y guardarlo
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => {
            return new Response("", { status: 408, statusText: "Offline" });
          });
      })
    );
    return;
  }

  // Resto de peticiones (Network First con fallback a Caché)
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response("", { status: 408, statusText: "Offline" });
      })
  );
});
