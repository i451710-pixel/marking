const CACHE_NAME = 'ledger-cache-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// 安裝時，把網頁跟圖表套件快取起來
self.addEventListener('install', event => {
  self.skipWaiting(); // 強制立刻接手
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 啟動時，清理舊的快取
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 攔截網路請求（採用「網路優先，失敗則用快取」策略）
// 這樣只要你有網路，就會去抓最新的 index.html（實現熱更新）
// 如果沒網路，就會拿出手機裡的上次快取（實現離線可用）
self.addEventListener('fetch', event => {
  // 如果是去抓 GitHub API (Gist)，不要快取，交給程式碼自己處理
  if (event.request.url.includes('api.github.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 如果抓到新檔案，順便更新快取
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // 沒網路時，從快取拿檔案
        return caches.match(event.request);
      })
  );
});
