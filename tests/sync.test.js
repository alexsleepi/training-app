// Abgleich mit n8n (simuliert): Schlüssel, Laden, Löschen, Nachsichern.
// Prüft die GEBAUTE index.html, also vorher `python3 tools/build.py`.
const assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');
const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8'),{runScripts:"dangerously",pretendToBeVisual:true,url:"https://x.test/training-app/",virtualConsole:vc,
 beforeParse(w){w.matchMedia=()=>({matches:false});w.scrollTo=()=>{};
  w.server={sessions:[{id:"s_1",date:"2026-11-10T10:00:00Z",day:"A",exercises:[{slot:"A1",name:"Kniebeuge",sets:[{kg:70,reps:8}]}]}],deleted:[],settings:null,calls:[]};
  w.fetch=async(url,opt)=>{const b=JSON.parse(opt.body);w.server.calls.push(b);if(b.key!=="GOODKEY123")return {status:401,ok:false,json:async()=>({ok:false})};
   (b.sessions||[]).forEach(s=>{w.server.sessions=w.server.sessions.filter(x=>x.id!==s.id).concat([s])});(b.deleted||[]).forEach(id=>{w.server.sessions=w.server.sessions.filter(x=>x.id!==id);w.server.deleted.push(id)});if(b.settings)w.server.settings=b.settings;
   return {status:200,ok:true,json:async()=>({ok:true,whoop:[{id:1,datum:new Date().toLocaleDateString('sv-SE'),recovery:61,hrv:47,schlaf:88,strain:8}],withings:[{id:1,datum:"2026-11-13",gewicht:84.2,fett_prozent:24.6,muskelmasse:59.7}],sessions:w.server.sessions,deleted:w.server.deleted,settings:w.server.settings})}};}});
const w=dom.window;const d=w.document;const E=x=>w.eval(x);const c=sel=>d.querySelector(sel).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const pill=()=>d.querySelector('#sync span').textContent;
let n=0;const ok=(name,fn)=>{fn();n++;console.log('ok',name)};
(async()=>{await wait(300);
 ok('ohne Schlüssel: Hinweis und Eingabefeld',()=>{assert.equal(pill(),'Nicht verbunden');assert.ok(d.querySelector('#k-in'))});
 d.querySelector('#k-in').value="WRONGKEY123";c('[data-act=keysave]');await wait(200);
 ok('falscher Schlüssel wird erkannt',()=>assert.equal(pill(),'Schlüssel falsch'));
 d.querySelector('#k-in').value="GOODKEY123";c('[data-act=keysave]');await wait(300);
 ok('richtiger Schlüssel: Daten werden geladen',()=>{assert.equal(pill(),'Synchronisiert');assert.equal(E('S.sessions.length'),1);assert.equal(E('drafts[ui.day].recovery'),'61');assert.equal(E('withings.rows.length'),1)});
 ok('Statusanzeige hat ihren farbigen Punkt (CSS nicht überschrieben)',()=>{const p=d.querySelector('#sync');assert.match(p.className,/\bcloud\b/);assert.notEqual(w.getComputedStyle(p).height,'40px')});
 E('deleteSession("s_1")');await wait(1200);
 ok('Löschen landet in n8n',()=>{assert.equal(w.server.sessions.length,0);assert.deepEqual(w.server.deleted,['s_1'])});
 E('S.sessions.push({id:"s_5",date:new Date().toISOString(),day:"B",exercises:[]});putSession(S.sessions[S.sessions.length-1])');await wait(1200);
 ok('neue Einheit wird gesichert',()=>{assert.ok(w.server.sessions.some(x=>x.id==="s_5"));assert.equal(E('S.sessions.filter(x=>x._pending).length'),0)});
 ok('Einstellungen liegen in n8n',()=>assert.ok(w.server.settings));
 ok('keine Skriptfehler',()=>assert.deepEqual(errors,[]));
 console.log(`${n} Prüfungen bestanden`);process.exit(0)})().catch(e=>{console.error('FEHLER',e.message);process.exit(1)});
