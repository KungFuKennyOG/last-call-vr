// Caches the game shell and three.js so the installed app keeps working offline after the first launch.
const CACHE = 'last-call-v25';
const SHELL = [
  './',
  './index.html',
  './showdowns/',
  './showdowns/index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './engine/bullet-time.js', './engine/index.js', './engine/input.js', './engine/loop.js', './engine/stage.js', './engine/xr.js',
  './fx/billboards.js', './fx/blood.js', './fx/decals.js', './fx/fire.js', './fx/index.js', './fx/particles.js', './fx/popups.js', './fx/weather.js',
  './actors/animate.js', './actors/body.js', './actors/damage.js', './actors/faces.js', './actors/index.js', './actors/ragdoll.js',
  './combat/guns.js', './combat/index.js', './combat/melee.js', './combat/throw.js', './combat/tracers.js',
  './drop/', './drop/index.html',
  './drop/art/faces.js', './drop/art/palette.js', './drop/art/pixels.js', './drop/art/surfaces.js', './drop/art/textures.js', './drop/audio/score.js', './drop/bag.js', './drop/bosses/expediter.js', './drop/ch1/beats.js', './drop/ch1/script.js', './drop/ch1/spaces.js', './drop/checkpoint.js', './drop/codes.js', './drop/disarm.js', './drop/game/arms.js', './drop/game/bag-world.js', './drop/game/boss.js', './drop/game/chapter.js', './drop/game/combat.js', './drop/game/enemies.js', './drop/game/fx.js', './drop/game/game.js', './drop/game/hazards.js', './drop/game/pickups.js', './drop/game/player.js', './drop/game/projectiles.js', './drop/game/setpiece.js', './drop/game/stunned.js', './drop/game/world.js', './drop/main.js', './drop/radio.js', './drop/rating.js', './drop/render/atlas.js', './drop/render/cast.js', './drop/render/geo.js', './drop/render/mats.js', './drop/render/props.js', './drop/render/ps1.js', './drop/render/space.js', './drop/runner.js', './drop/save.js', './drop/stun.js', './drop/ui/cards.js', './drop/ui/hud.js', './drop/ui/keypad.js', './drop/ui/subtitles.js', './drop/ui/title.js', './drop/ui/voice.js', './drop/ui/wrist.js',
  './audio/core.js', './audio/index.js', './audio/music.js', './audio/sfx.js',
  'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.module.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first for our own files (pages and modules, so pushes show up), cache first for the CDN.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const isPage = e.request.mode === 'navigate';
  const isOwn = new URL(e.request.url).origin === self.location.origin;
  if (isPage || isOwn) {
    e.respondWith(
      fetch(e.request)
        .then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })
        .catch(() => caches.match(e.request).then(r => r || (isPage ? caches.match('./index.html') : Response.error())))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }))
  );
});
