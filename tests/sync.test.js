const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');
const vc=new VirtualConsole();vc.on('jsdomError',e=>console.log('ERR',e.message));
const dom=new JSDOM(fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8'),{runScripts:"dangerously",pretendToBeVisual:true,url:"https://x.test/training-app/",virtualConsole:vc,
 beforeParse(w){w.matchMedia=()=>({matches:false});w.scrollTo=()=>{};
  w.server={sessions:[{id:"s_1",date:"2026-11-10T10:00:00Z",day:"A",exercises:[{slot:"A1",name:"Kniebeuge",sets:[{kg:70,reps:8}]}]}],deleted:[],settings:null,calls:[]};
  w.fetch=async(url,opt)=>{const b=JSON.parse(opt.body);w.server.calls.push(b);if(b.key!=="GOODKEY123")return {status:401,ok:false,json:async()=>({ok:false})};
   (b.sessions||[]).forEach(s=>{w.server.sessions=w.server.sessions.filter(x=>x.id!==s.id).concat([s])});(b.deleted||[]).forEach(id=>{w.server.sessions=w.server.sessions.filter(x=>x.id!==id);w.server.deleted.push(id)});if(b.settings)w.server.settings=b.settings;
   return {status:200,ok:true,json:async()=>({ok:true,whoop:[{id:1,datum:new Date().toLocaleDateString('sv-SE'),recovery:61,hrv:47,schlaf:88,strain:8}],withings:[{id:1,datum:"2026-11-13",gewicht:84.2,fett_prozent:24.6,muskelmasse:59.7}],sessions:w.server.sessions,deleted:w.server.deleted,settings:w.server.settings})}};}});
const w=dom.window;const d=w.document;const E=x=>w.eval(x);const c=sel=>d.querySelector(sel).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{await wait(300);
 console.log('pill',d.querySelector('#sync span').textContent,'keycard',!!d.querySelector('#k-in'));
 d.querySelector('#k-in').value="WRONGKEY123";c('[data-act=keysave]');await wait(200);console.log('bad',d.querySelector('#sync span').textContent);
 d.querySelector('#k-in').value="GOODKEY123";c('[data-act=keysave]');await wait(300);
 console.log('good',d.querySelector('#sync span').textContent,'sessions',E('S.sessions.length'),'rec',E('drafts[ui.day].recovery'),'withings',E('withings.rows.length'));
 E('deleteSession("s_1")');await wait(1200);console.log('server after del',w.server.sessions.length,w.server.deleted);
 E('S.sessions.push({id:"s_5",date:new Date().toISOString(),day:"B",exercises:[]});putSession(S.sessions[S.sessions.length-1])');await wait(1200);console.log('server has s_5',w.server.sessions.some(x=>x.id==="s_5"),'pending',E('S.sessions.filter(x=>x._pending).length'));
 console.log('settings on server',!!w.server.settings);
 process.exit(0)})();
