// DOC Hub service worker — caches file downloads as they're viewed so a
// technician can re-open a manual they already looked at with no signal.
// Deliberately does NOT cache folder/search pages: those are personalized,
// database-backed views that would just go stale, unlike a PDF's bytes.
const CACHE_NAME = "dochub-files-v1";
const OFFLINE_URL = "/offline.html";
const MAX_CACHED_FILES = 20;
const META_URL = "/__dochub_cache_meta__";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(OFFLINE_URL))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isFileDownload(pathname) {
  return /^\/api\/files\/[^/]+\/download$/.test(pathname);
}

async function getMeta(cache) {
  const res = await cache.match(META_URL);
  if (!res) return [];
  try {
    return await res.json();
  } catch {
    return [];
  }
}

async function setMeta(cache, list) {
  await cache.put(META_URL, new Response(JSON.stringify(list), { headers: { "Content-Type": "application/json" } }));
}

/** Records `key` as most-recently-used, evicting the oldest entry past MAX_CACHED_FILES. */
async function trackAndTrim(cache, key) {
  let list = await getMeta(cache);
  list = list.filter((k) => k !== key);
  list.unshift(key);
  while (list.length > MAX_CACHED_FILES) {
    const evicted = list.pop();
    await cache.delete(evicted);
  }
  await setMeta(cache, list);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isFileDownload(url.pathname)) {
    // Cache key ignores ?download=1 — the inline-view and attachment-download
    // variants are the same underlying file, so either one satisfies both.
    const cacheKey = url.pathname;

    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            await cache.put(cacheKey, networkResponse.clone());
            await trackAndTrim(cache, cacheKey);
          }
          return networkResponse;
        } catch (err) {
          const cached = await cache.match(cacheKey);
          if (cached) return cached;
          throw err;
        }
      })()
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(OFFLINE_URL)) || Response.error();
      })
    );
  }
});
