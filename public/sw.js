// 하우스 엣지 서비스 워커: 앱 설치 + 오프라인 시 마지막으로 받은 화면 표시
// 페이지는 항상 네트워크를 먼저 시도해 최신 버전을 받고, 실패할 때만 캐시를 쓴다.
const CACHE = 'house-edge-v1';
const SHELL = ['/', '/admin', '/manifest.webmanifest', '/manifest-admin.webmanifest',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png', '/icons/apple-touch-icon.png', '/icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname === '/ws' || url.pathname === '/healthz') return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(url.pathname === '/admin' ? '/admin' : '/', copy));
      return res;
    }).catch(() => caches.match(url.pathname.startsWith('/admin') ? '/admin' : '/')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
