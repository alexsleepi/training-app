// Trainingslogik: Entlastung nach Bedarf, Progressionsvorschläge, Wochensätze.
// Prüft die GEBAUTE index.html, also vorher `python3 tools/build.py`.
const assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');
const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8'),{runScripts:"dangerously",pretendToBeVisual:true,url:"https://x.test/training-app/",virtualConsole:vc,
 beforeParse(w){w.matchMedia=()=>({matches:false});w.scrollTo=()=>{};w.fetch=async()=>{throw new Error("kein Netz im Test")}}});
const w=dom.window;const E=x=>w.eval(x);
let n=0;const ok=(name,fn)=>{fn();n++;console.log('ok',name)};
const DAY=864e5;
// 18 Einheiten A/B/C. squat/rdl/pull: Funktion (Runde k) -> Sätze
function seed({squat,rdl,pull}){const arr=[];for(let i=0;i<18;i++){const day="ABC"[i%3],k=Math.floor(i/3);
  const ex=day==="A"?[{slot:"A1",name:"Kniebeuge",sets:squat(k)}]:day==="B"?[{slot:"B1",name:"Rumänisches Kreuzheben",sets:rdl(k)}]:[{slot:"C3",name:"Klimmzüge Untergriff",sets:pull(k)}];
  arr.push({id:"s_"+(i+1),date:new Date(Date.now()-(60-i*3)*DAY).toISOString(),day,bw:82,exercises:ex})}
  E(`S.sessions=${JSON.stringify(arr)}`)}
const flat=(kg,reps)=>()=>[{kg,reps},{kg,reps},{kg,reps}];
const grow=(kg0,step,reps)=>k=>[{kg:kg0+k*step,reps},{kg:kg0+k*step,reps}];

(async()=>{await new Promise(r=>setTimeout(r,200));
 ok('Klimmzüge mit mehr Wdh. bei 0 kg gelten nicht als Stillstand',()=>{
  seed({squat:grow(70,2.5,8),rdl:flat(60,8),pull:k=>[{kg:0,reps:5+k},{kg:0,reps:5+k}]});
  const ds=E('deloadStatus()');assert.equal(ds.stuck,1,'nur das Kreuzheben stagniert');assert.equal(ds.due,false)});
 ok('Klimmzüge ohne Fortschritt zählen weiter als Stillstand',()=>{
  seed({squat:grow(70,2.5,8),rdl:flat(60,8),pull:()=>[{kg:0,reps:6},{kg:0,reps:6}]});
  const ds=E('deloadStatus()');assert.equal(ds.stuck,2);assert.equal(ds.due,true)});
 ok('alles steigt: keine Entlastung vor 24 Einheiten',()=>{
  seed({squat:grow(70,2.5,8),rdl:grow(60,2.5,8),pull:grow(0,2.5,8)});
  const ds=E('deloadStatus()');assert.equal(ds.stuck,0);assert.equal(ds.due,false)});
 ok('alle Sätze am oberen Ende: Gewicht steigt um den Schritt der Übung',()=>{
  E(`S.sessions=[{id:"s_1",date:new Date(Date.now()-3*864e5).toISOString(),day:"A",exercises:[{slot:"A1",name:"Kniebeuge",planned:3,sets:[{kg:80,reps:10},{kg:80,reps:10},{kg:80,reps:10}]}]}]`);
  const sg=E('suggest(PROGRAM.A.ex[0],"Kniebeuge",{deload:false,recovery:"",hrv:""})');assert.equal(sg.kg,"82.5")});
const last=(slot,name,sets)=>E(`S.sessions=[{id:"s_1",date:new Date(Date.now()-3*864e5).toISOString(),day:"${slot[0]}",exercises:[{slot:"${slot}",name:"${name}",planned:${sets.length},sets:${JSON.stringify(sets)}}]}]`);
 const sug=(day,i,name)=>E(`suggest(PROGRAM.${day}.ex[${i}],"${name}",{deload:false,recovery:"",hrv:""})`);
 const S3=(kg,...r)=>r.map(reps=>({kg,reps}));
 ok('Grundübung 10 · 9 · 8 bei 6–10: steigern',()=>{last("A1","Kniebeuge",S3(80,10,9,8));const sg=sug("A",0,"Kniebeuge");assert.equal(sg.kg,"82.5");assert.match(sg.html,/Im Schnitt 9 Wdh/)});
 ok('Grundübung 10 · 9 · 7: halten (Schnitt unter 9)',()=>{last("A1","Kniebeuge",S3(80,10,9,7));assert.equal(sug("A",0,"Kniebeuge").kg,"80")});
 ok('Grundübung mit Satz unter dem Bereich: halten',()=>{last("A1","Kniebeuge",S3(80,10,10,5));assert.equal(sug("A",0,"Kniebeuge").kg,"80")});
 ok('Isolation 20 · 19 · 18 · 18 bei 12–20: halten',()=>{last("A5","Seitheben am Kabel",S3(10,20,19,18,18));assert.equal(sug("A",4,"Seitheben am Kabel").kg,"10")});
 ok('Isolation alle Sätze bei 20: steigern',()=>{last("A5","Seitheben am Kabel",S3(10,20,20,20,20));const sg=sug("A",4,"Seitheben am Kabel");assert.equal(sg.kg,"12.5");assert.match(sg.html,/Alle Sätze am oberen Ende/)});
 ok('alte Einheit mit 3 geplanten Sätzen zählt nach Umstellung auf 4',()=>{last("A5","Seitheben am Kabel",S3(10,20,20,20));assert.equal(sug("A",4,"Seitheben am Kabel").kg,"12.5")});
 ok('Schultern: seitlich 8, hinten 4,5 Sätze pro Woche',()=>{const v=E('weeklyVolume()');assert.equal(v.side,8);assert.equal(v.rear,4.5)});
 ok('Text "ca. 65 Sätze pro Woche" passt zum Plan',()=>{
  const full=E('ORDER.reduce((a,k)=>a+PROGRAM[k].ex.reduce((b,x)=>b+x.sets,0),0)');
  const del=E('ORDER.reduce((a,k)=>a+PROGRAM[k].ex.reduce((b,x)=>b+plannedSets(x,{deload:true}),0),0)');
  assert.ok(Math.abs(full-65)<=2,`voller Plan ${full}`);assert.ok(Math.abs(del-40)<=3,`Entlastung ${del}`);
  assert.match(E('document.querySelector("#v-fortschritt").textContent'),/ca\. 65 Sätze pro Woche/)});
 ok('Gewichte im Eingabefeld mit Komma, gespeichert als Zahl',()=>{
  last("A1","Kniebeuge",S3(80,10,9,8));E('drafts={};ui.day="A";renderHeute()');
  const inp=w.document.querySelector('input[data-slot="A1"][data-i="0"][data-k="kg"]');assert.equal(inp.value,"82,5");
  E('const d=getDraft("A");d.ex.A1.sets.forEach(x=>{x.kg="82,5";x.reps="8";x.done=true});saveSession()');
  const saved=JSON.parse(E('JSON.stringify(S.sessions[S.sessions.length-1].exercises.find(e=>e.slot==="A1").sets.map(x=>x.kg))'));assert.deepEqual(saved,[82.5,82.5,82.5])});
 // Supersätze
 const doneAll=(day,ids)=>E(`(()=>{const d=getDraft("${day}");${JSON.stringify(ids)}.forEach(id=>d.ex[id].sets.forEach(x=>{x.kg="10";x.reps="12";x.done=true}))})()`);
 ok('Supersatz: nach Seitheben folgt Bizeps mit 40 s, im Fokusmodus springt die Übung um',()=>{
  E('S.sessions=[];drafts={};ui.day="B"');doneAll("B",["B1","B2","B3","B4","B5"]);
  E('(()=>{const d=getDraft("B");["B6","B7"].forEach(id=>d.ex[id].sets.forEach(x=>x.kg="8"))})()');
  E('openFocus()');assert.equal(E('PROGRAM.B.ex[ui.fx].id'),"B6");
  E('focusAct("fdone",null)');assert.equal(E('PROGRAM.B.ex[ui.fx].id'),"B7");
  assert.match(w.document.querySelector('#tLbl').textContent,/Wechsel: Bizeps-Curls Kurzhantel/);
  assert.equal(Math.round(E('(T.end-Date.now())/1000')),40);
  E('focusAct("fdone",null)');assert.equal(E('PROGRAM.B.ex[ui.fx].id'),"B6");
  assert.match(w.document.querySelector('#focus').textContent,/Supersatz mit B7/);
  E('closeFocus();stopTimer()')});
 ok('Supersatz: ist der Partner fertig, gilt die normale Pause',()=>{
  E('drafts={}');doneAll("B",["B7"]);const r=E('afterSet("B",PROGRAM.B.ex[5],getDraft("B"))');assert.equal(r.sec,75);assert.equal(r.next,null)});
 ok('Plan zeigt die Supersatz-Paare',()=>{const t=w.document.querySelector('#v-plan').textContent;
  for(const x of ["Supersatz mit A6","Supersatz mit A5","Supersatz mit B7","Supersatz mit C6","Supersatz mit C8"])assert.ok(t.includes(x),x)});
 // Aufwärmen
 ok('Aufwärmen mit berechneten Gewichten vor den ersten Grundübungen',()=>{
  last("A1","Kniebeuge",S3(80,10,10,10));E('drafts={};ui.day="A";renderHeute()');
  const t=w.document.querySelector('article[data-slot="A1"]').textContent;assert.match(t,/Aufwärmen: 42,5 kg × 8 · 62,5 kg × 4/);
  assert.ok(!w.document.querySelector('article[data-slot="A3"]').textContent.includes("Aufwärmen:"),"nicht bei der dritten Übung")});
 ok('Aufwärmen: unter 20 kg an der Langhantel steht "leere Stange"',()=>{
  last("A2","Bankdrücken Langhantel",S3(30,8,8,8));E('drafts={};renderHeute()');
  assert.match(w.document.querySelector('article[data-slot="A2"]').textContent,/leere Stange × 8 · 22,5 kg × 4/)});
 ok('Aufwärmen verschwindet nach dem ersten Satz',()=>{
  E('const d=getDraft("A");d.ex.A1.sets[0].reps="8";d.ex.A1.sets[0].done=true;renderHeute()');
  assert.ok(!w.document.querySelector('article[data-slot="A1"]').textContent.includes("Aufwärmen:"))});
 // Geräte-Notiz
 ok('Geräte-Einstellung notieren, anzeigen und wieder löschen',()=>{
  w.prompt=()=>"Sitz 4, Polster 2";w.document.querySelector('article[data-slot="A1"] [data-act="gnote"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  assert.equal(E('S.settings.gnotes["Kniebeuge"]'),"Sitz 4, Polster 2");assert.match(w.document.querySelector('article[data-slot="A1"]').textContent,/⚙ Sitz 4, Polster 2/);
  w.prompt=()=>"";w.document.querySelector('article[data-slot="A1"] [data-act="gnote"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  assert.equal(E('S.settings.gnotes["Kniebeuge"]'),undefined)});
 ok('Beinbeuger: sitzende Maschine an Tag B und C, Kabel und Nordic als Ausweichübung, mit Animation',()=>{
  for(const [d,i] of [["B",4],["C",3]]){const ex=E(`PROGRAM.${d}.ex[${i}]`);assert.equal(ex.name,"Beinbeuger-Curl sitzend");assert.deepEqual([...ex.alts],["Beinbeuger-Curl am Kabel","Nordic Curls"])}
  assert.equal(E('PAT["Beinbeuger-Curl sitzend"]'),"legcurlseat");assert.ok(E('!!FIG.legcurlseat&&!!TECH["Beinbeuger-Curl sitzend"]'));
  assert.equal(E('weeklyVolume().hams'),9)});
 // Animationen: starres Skelett
 ok('Animation: Gliedmaßen behalten in jeder Übung ihre Länge',()=>{
  const bad=E(`(()=>{const out=[];const D=(A,B)=>Math.hypot(A[0]-B[0],A[1]-B[1]);
   for(const k of Object.keys(FIG)){const f=FIG[k];if(!f||f.lin)continue;
    for(const [x,y] of [["hp","kn"],["kn","an"],["sh","el"],["el","ha"],["hp","sh"],["hp","kn2"],["kn2","an2"],["shR","elR"],["elR","haR"]]){if(!f.a[x]||!f.a[y])continue;
     let mn=1e9,mx=0;for(let i=0;i<=20;i++){const d=D(poseAt(f,i/20)[x],poseAt(f,i/20)[y]);mn=Math.min(mn,d);mx=Math.max(mx,d)}
     if(mx-mn>3)out.push(k+" "+x+"-"+y+" "+mn.toFixed(0)+".."+mx.toFixed(0))}}
   return out.join("; ")})()`);assert.equal(bad,"")});
 ok('Animation: Füße bleiben am Boden, Hände an der Stange',()=>{
  const r=JSON.parse(E(`JSON.stringify([0,0.3,0.6,1].map(t=>({sq:poseAt(FIG.squat,t).an,pu:poseAt(FIG.pullup,t).ha,sp:poseAt(FIG.split,t).an})))`));
  r.forEach(x=>{assert.deepEqual(x.sq,[98,150]);assert.deepEqual(x.pu,[100,22]);assert.deepEqual(x.sp,[122,150])})});
 ok('Animation: jede Übung im Plan hat eine Figur mit vier Anweisungen',()=>{
  const miss=E(`(()=>{const out=[];ORDER.forEach(d=>PROGRAM[d].ex.forEach(x=>[x.name,...x.alts].forEach(n=>{const f=FIG[PAT[n]];if(!f){if(n!=="Reverse Flys Kurzhantel")out.push("keine Figur: "+n);return}
    if(!f.tips||f.tips.length!==4||f.tips.some(t=>!t))out.push("Anweisungen fehlen: "+n)})));return out.join("; ")})()`);assert.equal(miss,"")});
 ok('Animation: Anweisung nennt Phase, Atmung und Hinweis',()=>{
  assert.deepEqual(JSON.parse(E('JSON.stringify(coachTxt(FIG.squat,0))')),["Runter · einatmen","Hüfte nach hinten-unten, Knie nach außen über die Zehen"]);
  assert.equal(E('coachTxt(FIG.squat,2)[0]'),"Hochdrücken · ausatmen");assert.equal(E('coachTxt(FIG.latpull,0)[0]'),"Ziehen · ausatmen");assert.equal(E('coachTxt(FIG.nordic,0)[0]'),"Langsam nach vorn · einatmen");
  E('ui.day="A";drafts={};renderHeute()');const c=w.document.querySelector('article[data-slot="A1"] .figcoach');assert.ok(c&&c.textContent.includes("Runter"))});
 ok('Keine Pause ist länger als 1:30',()=>{assert.equal(E('Math.max(...ORDER.map(d=>Math.max(...PROGRAM[d].ex.map(x=>x.rest))))'),90);
  for(const [d,i] of [["A",0],["A",1],["B",0]])assert.equal(E(`PROGRAM.${d}.ex[${i}].rest`),90)});
 ok('Ausführung zeigt Fotos für Start und Endposition mit Hinweis',()=>{
  E('ui.day="A";drafts={};renderHeute()');const f=w.document.querySelectorAll('article[data-slot="A1"] .figphotos figure');assert.equal(f.length,2);
  assert.equal(f[0].querySelector('img').getAttribute('src'),'img/squat-a.webp');assert.equal(f[1].querySelector('img').getAttribute('src'),'img/squat-b.webp');
  assert.match(f[0].textContent,/^Start/);assert.match(f[1].textContent,/Endposition.*Oberschenkel mindestens waagerecht/);
  assert.equal(w.document.querySelectorAll('article[data-slot="A1"] .figstills').length,0,"keine doppelten Standbilder");
  assert.ok(w.document.querySelector('article[data-slot="A1"] .fig svg.anim'),"Animation bleibt")});
 ok('Übung ohne Foto zeigt gezeichnete Standbilder',()=>{
  const d=w.document.createElement('div');d.innerHTML=E('(()=>{const k=PHOTO["Nordic Curls"];delete PHOTO["Nordic Curls"];const h=figHtml("Nordic Curls");PHOTO["Nordic Curls"]=k;return h})()');const f=d.querySelectorAll('.figstills figure');assert.equal(f.length,2);
  assert.ok(f[0].querySelector('svg path.bf')&&f[1].querySelector('svg path.bf'),"Figur gezeichnet");assert.equal(d.querySelectorAll('.figphotos').length,0)});
 ok('Ausweichübung ohne Animation zeigt trotzdem ihre Fotos mit eigener Unterschrift',()=>{
  const d=w.document.createElement('div');d.innerHTML=E('figHtml("Reverse Flys Kurzhantel")');const f=d.querySelectorAll('.figphotos figure');assert.equal(f.length,2);
  assert.equal(f[0].querySelector('img').getAttribute('src'),'img/revfly-a.webp');assert.match(f[1].textContent,/Arme seitlich bis Schulterhöhe/);assert.equal(d.querySelectorAll('svg').length,0);
  const n=w.document.createElement('div');n.innerHTML=E('figHtml("Nordic Curls")');assert.match(n.querySelectorAll('.figphotos figure')[1].textContent,/gerade Linie/)});
 ok('Fotos: alle Übungen und Ausweichübungen haben zwei Bilder, die Dateien liegen lokal und im Offline-Speicher',()=>{
  const fs=require('fs'),path=require('path'),root=path.join(__dirname,'..');const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  const names=JSON.parse(E('JSON.stringify(ORDER.flatMap(d=>PROGRAM[d].ex.map(x=>x.name)))'));const PH=JSON.parse(E('JSON.stringify(PHOTO)'));
  names.forEach(n=>assert.ok(PH[n],"Foto fehlt: "+n));
  JSON.parse(E('JSON.stringify(ORDER.flatMap(d=>PROGRAM[d].ex.flatMap(x=>x.alts)))')).forEach(n=>assert.ok(PH[n],"Foto für Ausweichübung fehlt: "+n));
  new Set(Object.values(PH)).forEach(k=>["a","b"].forEach(x=>{const f=`img/${k}-${x}.webp`;
    assert.ok(fs.statSync(path.join(root,f)).size>3000,f);assert.ok(fs.existsSync(path.join(root,'src',f)),"src/"+f);assert.ok(sw.includes(`"${f}"`),"nicht im Service Worker: "+f)}));
  assert.equal(fs.readdirSync(path.join(root,'img')).length,new Set(Object.values(PH)).size*2,"keine überzähligen Bilder")});
 ok('Whoop-Check ist eine schmale, zugeklappte Zeile mit Wert und Ampel',()=>{
  E('S.sessions=[];drafts={};ui.day="A";renderHeute()');let d=w.document.querySelector('#v-heute details.wchk');assert.ok(d&&!d.open);
  assert.match(d.querySelector('summary').textContent,/offen.*Recovery fehlt noch/);assert.ok(d.querySelector('#f-rec')&&d.querySelector('#f-deload')&&d.querySelector('#wstat'),"Felder bleiben erreichbar");
  E('getDraft("A").recovery="72";renderHeute()');d=w.document.querySelector('#v-heute details.wchk');
  assert.match(d.querySelector('summary').textContent,/72 %.*Grün – voll trainieren/);assert.ok(d.classList.contains("good"));
  d.open=true;E('getDraft("A").deload=true;renderHeute()');d=w.document.querySelector('#v-heute details.wchk');assert.ok(d.open,"bleibt offen");assert.match(d.querySelector('summary').textContent,/Entlastung/)});
 ok('keine externen Schriften oder Skripte',()=>{const html=w.document.documentElement.outerHTML;
  assert.doesNotMatch(html,/fonts\.googleapis|fonts\.gstatic|<script[^>]+src=/)});
 ok('keine Skriptfehler',()=>assert.deepEqual(errors,[]));
 console.log(`${n} Prüfungen bestanden`);process.exit(0)})().catch(e=>{console.error('FEHLER',e.message);process.exit(1)});
