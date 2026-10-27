// Habits service worker. Shares origin with other apps: only touch caches prefixed "habits-".
const VERSION='habits-v1', FILES=['./','index.html','setup.html','manifest.webmanifest','icon-180.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('habits-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||!u.pathname.includes('/hb-6ef8c5a016cd/'))return;
 e.respondWith((async()=>{const c=await caches.open(VERSION);try{const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),5000);const r=await fetch(e.request,{signal:ctl.signal});clearTimeout(t);if(r.ok)c.put(e.request,r.clone());return r;}
 catch(_){return (await c.match(e.request,{ignoreSearch:true}))||(await c.match('index.html'))||Response.error();}})());});
