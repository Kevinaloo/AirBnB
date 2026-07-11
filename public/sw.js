// public/sw.js — service worker for PWA install + web push notifications
const CACHE = "shikaz-v1";
const SHELL = ["/", "/index.html", "/manifest.json", "/favicon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for navigation (always fresh app), cache fallback offline.
self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Never cache API calls.
  if (url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request).catch(() => caches.match("/index.html"))
    );
    return;
  }
  e.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

// ── Web Push ──────────────────────────────────────────────────────
self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { body: e.data && e.data.text() }; }
  const title = data.title || "Shikaz Homez";
  const options = {
    body: data.body || "You have a new notification.",
    icon: data.icon || "/favicon.svg",
    badge: "/favicon.svg",
    tag: data.tag || "shikaz-notification",
    data: { url: data.url || "/" },
    requireInteraction: !!data.requireInteraction,
    vibrate: [120, 60, 120],
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) { c.navigate(target); return c.focus(); }
      }
      return self.clients.openWindow(target);
    })
  );
});
