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
 // Abgleich ohne Änderung darf das Training nicht neu zeichnen
 const art=()=>d.querySelector('#v-heute article[data-slot]');const cue=()=>art().querySelector('details.cue');
 cue().open=true;const node0=art();
 await E('sync()');
 ok('Abgleich ohne Änderung zeichnet nicht neu',()=>{assert.equal(art(),node0);assert.ok(cue().open)});
 w.server.sessions.push({id:"s_9",date:"2026-11-12T10:00:00Z",day:"C",exercises:[{slot:"C1",name:"Bulgarische Split Squats",sets:[{kg:12,reps:10}]}]});
 await E('sync()');
 ok('Abgleich mit Änderung zeichnet neu, offene Ausführung bleibt offen',()=>{assert.notEqual(art(),node0);assert.ok(cue().open);assert.ok(E('S.sessions.some(x=>x.id==="s_9")'))});
 // Offline: nur der Hinweis ändert sich
 const node1=art();Object.defineProperty(w.navigator,'onLine',{get:()=>false,configurable:true});w.dispatchEvent(new w.Event('offline'));
 ok('offline: Hinweis erscheint, Training bleibt stehen',()=>{assert.match(d.querySelector('#offnote').textContent,/Offline-Modus/);assert.equal(art(),node1);assert.match(pill(),/Offline/)});
 Object.defineProperty(w.navigator,'onLine',{get:()=>true,configurable:true});w.dispatchEvent(new w.Event('online'));await wait(100);
 ok('wieder online: Hinweis verschwindet',()=>assert.equal(d.querySelector('#offnote').textContent,''));
 // Pausen-Timer
 E('startTimer(90,"Satzpause Test")');
 ok('Timer speichert seine Endzeit',()=>{const t=JSON.parse(w.localStorage.getItem('hp3_timer'));assert.ok(t.end>Date.now()+80000);assert.equal(t.label,'Satzpause Test')});
 c('[data-act=t-plus]');
 ok('+15 verlängert und speichert',()=>assert.ok(JSON.parse(w.localStorage.getItem('hp3_timer')).end>Date.now()+100000));
 E('T.end=Date.now()-1000;T.rang=false;tick()');
 ok('Ende: Timer wird grün',()=>{assert.ok(d.querySelector('#timer').classList.contains('end'));assert.match(d.querySelector('#tLbl').textContent,/Pause vorbei/)});
 c('[data-act=t-stop]');
 ok('Stopp löscht den Timer',()=>{assert.equal(w.localStorage.getItem('hp3_timer'),null);assert.ok(!d.querySelector('#timer').classList.contains('on'))});
 ok('keine Skriptfehler',()=>assert.deepEqual(errors,[]));
 console.log(`${n} Prüfungen bestanden`);process.exit(0)})().catch(e=>{console.error('FEHLER',e.message);process.exit(1)});
