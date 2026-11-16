/* ---------- Abgleich mit n8n (per Schlüssel). Der Build fügt diese Datei in src/app.html an der Marke @SYNC@ ein. ---------- */
const API="https://sleepi.app.n8n.cloud/webhook/training-api";
function apiKey(){try{return localStorage.getItem("hp3_key")||""}catch(e){return ""}}
let syncing=null,syncAgain=false,syncMsg="";
function delPend(){return S._delPending||(S._delPending={})}
/* Stabile Signatur (Schlüssel sortiert), um echte Änderungen zu erkennen */
function stableStr(v){return JSON.stringify(v,(k,x)=>x&&typeof x==="object"&&!Array.isArray(x)?Object.keys(x).sort().reduce((o,k2)=>(o[k2]=x[k2],o),{}):x)}
function dataSig(){return stableStr({s:S.sessions.map(cleanSession).sort((a,b)=>a.id<b.id?-1:1),t:S.settings})}
function extSig(){return stableStr([whoop.today,whoop.hist,whoop.weight,withings.rows])}
function processWhoopRows(rows){
  rows=(rows||[]).filter(x=>x&&typeof x.datum==="string");
  if(!rows.length){whoop.state="nodata";whoop.msg="Noch keine Whoop-Daten in n8n.";return}
  rows.sort((a,b)=>a.datum<b.datum?-1:1);
  const t=ymd(new Date());const R=rows.find(x=>x.datum===t);const n=v=>v==null||v===""?null:Number(v);
  whoop.today=R?{d:t,rec:n(R.recovery),hrv:n(R.hrv)!=null?Math.round(n(R.hrv)):null,rhr:n(R.ruhepuls),sleep:n(R.schlaf),strain:n(R.strain)}:null;
  whoop.hist={recs:rows.filter(x=>n(x.recovery)!=null).map(x=>({d:x.datum,rec:n(x.recovery)})),sleeps:rows.filter(x=>n(x.schlaf)!=null).map(x=>({d:x.datum,perf:n(x.schlaf)})),hrvs:rows.filter(x=>n(x.hrv)!=null).map(x=>({d:x.datum,v:n(x.hrv)})),lastRec:rows[rows.length-1].datum};
  const wr=[...rows].reverse().find(x=>n(x.gewicht)!=null);whoop.weight=wr?n(wr.gewicht):null;
  whoop.at=Date.now();whoop.state="ok";whoop.msg="";saveWhoop();return applyWhoop();
}
function processWithingsRows(rows){const n=v=>v==null||v===""?null:Number(v);
  const r=(rows||[]).filter(x=>x&&typeof x.datum==="string").map(x=>({d:x.datum,w:n(x.gewicht),bf:n(x.fett_prozent),fm:n(x.fettmasse),mm:n(x.muskelmasse)})).sort((a,b)=>a.d<b.d?-1:1);
  withings={rows:r,at:Date.now()};lsSet("hp3_withings",withings)}
function sync(manual){
  if(!apiKey()){syncState="nokey";renderHeader();renderWhoop();return Promise.resolve()}
  if(navigator.onLine===false){syncState="local";if(whoop.state!=="ok")whoop.state="offline";renderHeader();renderWhoop();return Promise.resolve()}
  if(syncing){syncAgain=true;return syncing}
  syncing=(async()=>{
    const pend=S.sessions.filter(x=>x._pending);const sent=new Map(pend.map(p=>[p.id,JSON.stringify(cleanSession(p))]));
    const dels=Object.keys(delPend());const setTs=S._setPending?(S.settings._ts||0):null;
    const body={key:apiKey(),sessions:pend.map(cleanSession),deleted:dels,settings:S._setPending?JSON.parse(JSON.stringify(S.settings)):null};
    if(manual){whoop.state="loading";whoop.msg="Gleiche mit n8n ab…";renderWhoop()}
    syncState=syncState==="cloud"?"cloud":"loading";renderHeader();
    const ctl=new AbortController();const to=setTimeout(()=>ctl.abort(),20000);
    let r;try{r=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},credentials:"omit",body:JSON.stringify(body),cache:"no-store",signal:ctl.signal})}finally{clearTimeout(to)}
    if(r.status===401){syncState="badkey";whoop.state="error";whoop.msg="Der Zugangsschlüssel stimmt nicht.";renderHeader();renderWhoop();return}
    if(!r.ok)throw new Error("HTTP "+r.status);
    const j=await r.json();if(!j||!j.ok)throw new Error("Antwort");
    const sig0=dataSig(),ext0=extSig();
    pend.forEach(p=>{if(JSON.stringify(cleanSession(p))===sent.get(p.id))p._pending=false});
    dels.forEach(id=>delete delPend()[id]);
    if(setTs!=null&&(S.settings._ts||0)===setTs)S._setPending=false;
    const dead=tombs();(j.deleted||[]).forEach(id=>{dead[id]=dead[id]||Date.now()});
    if(j.settings&&!S._setPending){const del=Object.assign({},j.settings.deleted||{},S.settings.deleted||{});S.settings=Object.assign({swaps:{},startDate:null},j.settings,{swaps:Object.assign({},j.settings.swaps||{}),deleted:del})}
    else if(!j.settings){S._setPending=true;S.settings._ts=S.settings._ts||Date.now()}
    const dead2=tombs();const byId=new Map();
    S.sessions.forEach(x=>{if(!dead2[x.id])byId.set(x.id,x)});
    const remoteIds=new Set();
    (j.sessions||[]).forEach(rs=>{if(!rs||!rs.id||dead2[rs.id])return;remoteIds.add(rs.id);const l=byId.get(rs.id);if(!l||!l._pending)byId.set(rs.id,rs)});
    byId.forEach(x=>{if(!remoteIds.has(x.id))x._pending=true});
    S.sessions=[...byId.values()];
    const draftCh=!!processWhoopRows(j.whoop);processWithingsRows(j.withings);
    syncState="cloud";syncMsg="";S._lastSync=Date.now();saveLocal();
    const ae=document.activeElement;const typing=ae&&ae.closest&&(ae.closest("#v-heute")||ae.closest("#focus"));
    /* Nur neu zeichnen, wenn sich etwas geändert hat. Sonst klappt mitten im Training nichts zu. */
    renderHeader();renderWhoop();
    if(dataSig()!==sig0||draftCh||document.getElementById("k-in")){renderAll(!!typing);renderWhoop();if(ui.focus&&!typing)renderFocus()}
    else if(extSig()!==ext0){renderAll(!!typing);renderWhoop()}
  })().catch(e=>{syncState="error";if(manual||whoop.state==="loading"){whoop.state=whoop.at?"ok":"error";whoop.msg="n8n gerade nicht erreichbar."}renderHeader();renderWhoop()})
  .finally(()=>{syncing=null;if(syncAgain){syncAgain=false;setTimeout(sync,300)}});
  return syncing;
}
let syncT=null;function syncSoon(){clearTimeout(syncT);syncT=setTimeout(()=>sync(),800)}
async function putSession(s){s._pending=true;saveLocal();renderHeader();syncSoon()}
async function putSettings(){S.settings._ts=Date.now();S._setPending=true;saveLocal();syncSoon()}
function saveKey(v){v=String(v||"").trim();if(v.length<10){toast("Bitte den kompletten Schlüssel einfügen.");return}try{localStorage.setItem("hp3_key",v)}catch(e){}syncState="loading";renderHeader();sync(true).then(()=>{if(syncState==="cloud")toast("Verbunden. Daten sind synchronisiert.")})}
function keyCardHtml(){return `<div class="card"><h2>Mit n8n verbinden</h2><p class="small muted">Einmalig: Füge den Zugangsschlüssel ein, den Claude dir gegeben hat. Danach holt die App Whoop- und Waagenwerte und sichert deine Trainings automatisch.</p>
  <div class="row"><div class="field" style="flex:1"><label for="k-in">Zugangsschlüssel</label><input id="k-in" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Schlüssel einfügen"></div><button class="btn sm" data-act="keysave" style="align-self:flex-end">Verbinden</button></div></div>`}
window.addEventListener("online",()=>{renderHeader();renderOffNote();sync()});
window.addEventListener("offline",()=>{syncState="local";renderHeader();renderOffNote()});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&(!S._lastSync||Date.now()-S._lastSync>120000))sync()});
setInterval(()=>{if(document.visibilityState==="visible")sync()},10*60000);
if("serviceWorker" in navigator){window.addEventListener("load",()=>{navigator.serviceWorker.register("sw.js").catch(()=>{})})}
/* Neue Version: Der Service Worker meldet sich, die App bietet "Neu laden" an. Ohne Tippen kommt sie beim nächsten Öffnen. */
let updShown=false;function showUpdate(){if(updShown)return;updShown=true;toastAct("Neue Version der App geladen.","Neu laden","appreload")}
if("serviceWorker" in navigator){const hadCtl=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("message",e=>{if(e.data&&e.data.type==="update")showUpdate()});
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(hadCtl)showUpdate()})}
document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest('[data-act="appreload"]'))location.reload()});
