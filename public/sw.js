/* Service worker: offline app shell + stale-while-revalidate catalog cache */
const VERSION = "dl-v1";
const STATIC_CACHE = `dl-static-${VERSION}`;
const API_CACHE = `dl-api-${VERSION}`;

const PRECACHE = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The admin gate must always read a live server session, never the offline library.
  if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
    if (request.mode === "navigate") {
      event.respondWith(fetch(request, { cache: "no-store" }).catch(() => {
        const language = (request.headers.get("Accept-Language") || "ar").slice(0, 2);
        const lang = ["en", "fr"].includes(language) ? language : "ar";
        const [title, message, retry] = {
          ar: ["لوحة الإدارة", "تحتاج لوحة الإدارة إلى اتصال بالإنترنت. اتصل بالشبكة ثم أعد المحاولة.", "إعادة المحاولة"],
          en: ["Admin panel", "The admin panel needs an internet connection. Reconnect and try again.", "Retry"],
          fr: ["Panneau d’administration", "Le panneau nécessite une connexion à Internet. Reconnectez-vous puis réessayez.", "Réessayer"],
        }[lang];
        return new Response(`<!doctype html><html lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><main style="max-width:32rem;margin:3rem auto;padding:1rem;font:1rem/1.7 system-ui"><h1>${title}</h1><p>${message}</p><a href="/admin">${retry}</a></main></html>`, {
          status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        });
      }));
    }
    return;
  }

  // Catalog API: stale-while-revalidate (offline list)
  if (url.pathname.startsWith("/api/specialties")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(API_CACHE);
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })(),
    );
    return;
  }

  // Auth/admin APIs must never be served from cache
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network-first, fall back to cached shell
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && new URL(res.url).pathname === "/") {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put("/", copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/"))),
    );
    return;
  }

  // Static assets: cache-first
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return res;
          }),
      ),
    );
  }
});
