// ChartSentinel service worker — minimal app-shell cache so the site
// installs as a PWA and responds instantly on repeat visits.
//
// Strategy:
//   • static assets (vite-built /assets/* + the shell HTML): cache-first
//   • everything else (API calls, RSS feeds): network-first, fall back
//     to cache only if the network fails. Stale data is fine if we'd
//     otherwise show a connection error.
//
// Versioning: bump CACHE_VERSION whenever the strategy changes so old
// clients flush their previous cache on the next activate.

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `chartsentinel-static-${CACHE_VERSION}`
const RUNTIME_CACHE = `chartsentinel-runtime-${CACHE_VERSION}`

const APP_SHELL = ['/', '/manifest.webmanifest', '/favicon.ico']

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => {})),
    )
    self.skipWaiting()
})

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
                        .map((k) => caches.delete(k)),
                ),
            )
            .then(() => self.clients.claim()),
    )
})

self.addEventListener('fetch', (event) => {
    const req = event.request
    if (req.method !== 'GET') return
    const url = new URL(req.url)

    // Cache-first for vite-built static assets.
    if (url.origin === location.origin && /^\/(assets|favicon|manifest|og-image)/.test(url.pathname)) {
        event.respondWith(
            caches.match(req).then(
                (hit) =>
                    hit ||
                    fetch(req).then((res) => {
                        const copy = res.clone()
                        caches.open(STATIC_CACHE).then((c) => c.put(req, copy))
                        return res
                    }),
            ),
        )
        return
    }

    // Network-first for everything else, falling back to cache.
    event.respondWith(
        fetch(req)
            .then((res) => {
                if (res.ok && url.origin === location.origin) {
                    const copy = res.clone()
                    caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy))
                }
                return res
            })
            .catch(() => caches.match(req).then((hit) => hit || caches.match('/'))),
    )
})
