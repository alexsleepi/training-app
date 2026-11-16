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
 ok('keine externen Schriften oder Skripte',()=>{const html=w.document.documentElement.outerHTML;
  assert.doesNotMatch(html,/fonts\.googleapis|fonts\.gstatic|<script[^>]+src=/)});
 ok('keine Skriptfehler',()=>assert.deepEqual(errors,[]));
 console.log(`${n} Prüfungen bestanden`);process.exit(0)})().catch(e=>{console.error('FEHLER',e.message);process.exit(1)});
