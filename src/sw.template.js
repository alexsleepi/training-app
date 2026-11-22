const C="training-v__VER__",A="training-assets-__AHASH__";const SHELL=["./","manifest.json","icon.png"];
/* Schriften und Fotos ändern sich selten: eigener Speicher, der App-Updates überlebt. Sein Name ändert sich nur, wenn sich eine Datei ändert. */
const ASSETS=[__ASSETS__];
self.addEventListener("install",e=>{e.waitUntil(Promise.all([caches.open(C).then(c=>c.addAll(SHELL)),
  caches.open(A).then(async c=>{const have=new Set((await c.keys()).map(r=>r.url));await c.addAll(ASSETS.filter(u=>!have.has(new URL(u,self.registration.scope).href)))})]).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C&&k!==A).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
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
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(/\/(fonts|img)\//.test(u.pathname)?A:C).then(c=>c.put(r,cp))}return res})));
});
