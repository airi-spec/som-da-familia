const CACHE = 'som-familia-v4';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './offline-audio.js',
  './ranking-sertanejo.js',
  './radios-sertanejo.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];


function isLiveRadio(url) {
  try {
    const u = new URL(url);
    return /streamtheworld|zeno\.fm|xcast\.com\.br|virtualcast|mgtradio|maxcast|webnow\.com\.br|cdn\.upx\.com/i.test(u.hostname + u.pathname);
  } catch {
    return false;
  }
}

function isYouTube(url) {
  try {
    const u = new URL(url);
    return /youtube\.com|youtu\.be|ytimg\.com|googlevideo\.com|youtube-nocookie\.com/i.test(u.hostname);
  } catch {
    return false;
  }
}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE && k !== 'sdf-audio-offline-v1').map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // NUNCA cachear YouTube nem streams de rádio ao vivo
  if (isYouTube(e.request.url) || isLiveRadio(e.request.url)) {
    e.respondWith(fetch(e.request));
    return;
  }
  // Áudio SoundHelix / MP3: tenta cache offline dedicado, senão rede
  if (url.pathname.endsWith('.mp3') || url.hostname.includes('soundhelix')) {
    e.respondWith(
      caches.open('sdf-audio-offline-v1').then((c) =>
        c.match(e.request).then((hit) => hit || fetch(e.request).catch(() => caches.match(e.request)))
      )
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
      const copy = res.clone();
      if (e.request.method === 'GET' && res.status === 200 && url.origin === self.location.origin && !isYouTube(e.request.url)) {
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});


self.addEventListener('message', (e) => {
  const data = e.data || {};
  if (data.type === 'CACHE_AUDIO' && data.url) {
    const url = data.url;
    if (/youtube\.com|youtu\.be|ytimg\.com|googlevideo\.com|youtube-nocookie\.com/i.test(url)) return;
    e.waitUntil(
      caches.open('sdf-audio-offline-v1').then((c) =>
        fetch(url, { mode: 'no-cors' }).then((res) => c.put(url, res)).catch(() => {})
      )
    );
  }
});
