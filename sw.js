const C="training-v1795249840";const SHELL=["./","manifest.json","icon.png","fonts/barlow-condensed-latin-600-normal.woff2","fonts/barlow-condensed-latin-700-normal.woff2","fonts/barlow-latin-400-normal.woff2","fonts/barlow-latin-500-normal.woff2","fonts/barlow-latin-600-normal.woff2","fonts/barlow-latin-700-normal.woff2"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
/* Version aus <meta name="app-version"> der Seite */
const verOf=t=>{const m=/name="app-version" content="([^"]*)"/.exec(t||"");return m?m[1]:""};
/* Holt die Seite im Hintergrund. Ist sie neuer als die gespeicherte, wird sie gespeichert und die App bekommt Bescheid. */
async function refresh(scope,c,cachedVer){
  const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),15000);
  try{const res=await fetch(scope.href,{signal:ctl.signal,cache:"no-store"});if(!res.ok)return null;
    const txt=await res.clone().text();await c.put("./",res.clone());
    if(cachedVer!=null&&verOf(txt)!==cachedVer){const cl=await self.clients.matchAll({type:"window"});cl.forEach(x=>x.postMessage({type:"update"}))}
    return res}
  catch(err){return null}finally{clearTimeout(t)}
}
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);if(u.origin!==location.origin)return;
  const scope=new URL(self.registration.scope);
  if(r.mode==="navigate"||u.pathname===scope.pathname||u.pathname===scope.pathname+"index.html"){
    /* Speicher zuerst: Die App startet sofort, auch bei schlechtem Netz im Studio. Aktualisiert wird im Hintergrund. */
    e.respondWith((async()=>{const c=await caches.open(C);const m=await c.match("./");
      if(m){const v=verOf(await m.clone().text());e.waitUntil(refresh(scope,c,v));return m}
      const res=await refresh(scope,c,null);
      return res||new Response("Offline und noch nicht gespeichert. Öffne die App einmal mit Internet.",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}})})());
    return}
  e.respondWith(caches.open(C).then(c=>c.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res}))));
});
