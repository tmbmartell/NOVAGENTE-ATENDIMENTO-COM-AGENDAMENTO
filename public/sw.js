/* PAINEL NOVAGENTE PWA
   Nunca armazenar paginas autenticadas, APIs, gravacoes ou dados de clientes.
*/
const CACHE_VERSION = "novagente-pwa-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/novagente-192.png", "/icons/novagente-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION)
    .then((cache) => cache.addAll(PRECACHE))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys
      .filter((key) => key.startsWith("novagente-pwa-") && key !== CACHE_VERSION)
      .map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(async () =>
      (await caches.match(OFFLINE_URL)) ??
      new Response("Sem conexao. Tente novamente quando estiver online.", {
        status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
      })
    ));
    return;
  }
  // Requests de API, autenticacao e conteudo de clientes nunca vao para cache.
  if (url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/_next/data/") ||
      url.pathname.startsWith("/auth/")) return;

  const staticAsset = url.pathname.startsWith("/_next/static/") ||
                      url.pathname.startsWith("/icons/");
  if (!staticAsset) return;
  event.respondWith(caches.open(CACHE_VERSION).then(async (cache) => {
    const hit = await cache.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok && res.type === "basic") await cache.put(req, res.clone());
    return res;
  }));
});
