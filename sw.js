const C="training-v1794766005";const SHELL=["./","manifest.json","icon.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);if(u.origin!==location.origin)return;
  const scope=new URL(self.registration.scope);
  if(r.mode==="navigate"||u.pathname===scope.pathname||u.pathname===scope.pathname+"index.html"){
    e.respondWith((async()=>{const c=await caches.open(C);
      try{const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),3500);const res=await fetch(scope.href,{signal:ctl.signal,cache:"no-store"});clearTimeout(t);if(res.ok){c.put("./",res.clone());return res}throw 0}
      catch(err){const m=await c.match("./");return m||new Response("Offline und noch nicht gespeichert. Öffne die App einmal mit Internet.",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}})}})());
    return}
  e.respondWith(caches.open(C).then(c=>c.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res}))));
});
