#!/usr/bin/env python3
"""Baut die iPhone-App (GitHub Pages) aus src/app.html.

src/app.html ist die Quelle (läuft auch als Claude-Artefakt mit claude.use()).
Dieses Skript ersetzt die Claude-Anbindung durch den n8n-Abgleich (src/sync.js),
ergänzt PWA-Metadaten und schreibt index.html, sw.js, manifest.json, icon.png ins Repo-Root.

Aufruf:  python3 tools/build.py
"""
import json, shutil, time
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
API = "https://sleepi.app.n8n.cloud/webhook/training-api"

s = (SRC / "app.html").read_text(encoding="utf-8")
def rep(a, b):
    global s
    assert s.count(a) == 1, f"Ersetzung nicht eindeutig: {a[:80]!r} ({s.count(a)}x)"
    s = s.replace(a, b)

ver = str(int(time.time()))
rep('<title>Hypertrophie 3×</title>', f'''<title>Hypertrophie 3×</title>
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Training">
<meta name="theme-color" content="#111212">
<meta name="app-version" content="{ver}">''')
rep('tombs()[id]=Date.now();ui.delId=null;', 'tombs()[id]=Date.now();delPend()[id]=1;ui.delId=null;')
rep('function undoDelete(){const s=ui.lastDel;if(!s)return;delete tombs()[s.id];', 'function undoDelete(){const s=ui.lastDel;if(!s)return;delete tombs()[s.id];delete delPend()[s.id];')
rep('syncState==="cloud"?"Synchronisiert":syncState==="local"?"Nur auf diesem Gerät":"Verbinde…"',
    'syncState==="cloud"?"Synchronisiert":syncState==="nokey"?"Nicht verbunden":syncState==="badkey"?"Schlüssel falsch":syncState==="error"?"n8n nicht erreichbar":syncState==="local"?"Nur auf diesem Gerät":"Verbinde…"')
rep('  const today=ymd(new Date());\n  if(d.created&&d.created!==today){', '  if(!apiKey()||syncState==="badkey")h+=keyCardHtml();\n  const today=ymd(new Date());\n  if(d.created&&d.created!==today){')
rep('  if(act==="fopen"){openFocus();return}', '  if(act==="fopen"){openFocus();return}\n  if(act==="keysave"){saveKey($("#k-in").value);return}\n  if(act==="keyreset"){try{localStorage.removeItem("hp3_key")}catch(e){}syncState="nokey";renderAll();document.querySelector(\'[data-tab="heute"]\').click();return}\n  if(act==="syncnow"){sync(true);return}')
rep('Gespeicherte Trainings werden automatisch hochgeladen, sobald du wieder Netz hast. Die Seite jetzt nicht neu laden.', 'Gespeicherte Trainings werden automatisch zu n8n gesichert, sobald du wieder Netz hast.')
rep('<button class="btn sec sm" data-act="copy">Alle Daten kopieren</button>', '''<p class="small muted">Verbindung zu n8n: ${apiKey()?(S._lastSync?"zuletzt abgeglichen "+new Date(S._lastSync).toLocaleString("de-DE",{weekday:"short",hour:"2-digit",minute:"2-digit"}):"noch nicht abgeglichen"):"nicht verbunden"}.</p><div class="row" style="gap:8px;margin-bottom:10px"><button class="btn sec sm" data-act="syncnow">Jetzt abgleichen</button><button class="btn sec sm" data-act="keyreset">Schlüssel ändern</button></div>
   <button class="btn sec sm" data-act="copy">Alle Daten kopieren</button>''')
sync = (SRC / "sync.js").read_text(encoding="utf-8")
sync = sync.replace('const API="training-api";', f'const API="{API}";')
sync = sync.replace('headers:{"Content-Type":"application/json"}', 'headers:{"Content-Type":"text/plain;charset=UTF-8"},credentials:"omit"')
sync = sync.replace('navigator.serviceWorker.register("training-sw",{scope:"./"})', 'navigator.serviceWorker.register("sw.js")')
a = s.index('ui.day=nextDay();\napplyWhoop();\nrenderAll();\nconnect();')
b = s.index('</script>', a)
s = s[:a] + sync + '\nsyncState=apiKey()?"loading":"nokey";\nui.day=nextDay();\napplyWhoop();\nrenderAll();\nsync();\n' + s[b:]

(ROOT / "index.html").write_text(s, encoding="utf-8")
fonts = sorted(f.name for f in (SRC / "fonts").glob("*.woff2"))
assert fonts, "Keine Schriften in src/fonts"
(ROOT / "fonts").mkdir(exist_ok=True)
for f in (ROOT / "fonts").iterdir():
    f.unlink()
for f in (SRC / "fonts").iterdir():
    shutil.copy(f, ROOT / "fonts" / f.name)
(ROOT / "sw.js").write_text((SRC / "sw.template.js").read_text().replace("__VER__", ver)
                            .replace("__FONTS__", ",".join(json.dumps("fonts/" + f) for f in fonts)))
m = {"name": "Hypertrophie 3×", "short_name": "Training", "id": "./", "start_url": "./", "scope": "./", "display": "standalone",
     "orientation": "portrait", "background_color": "#111212", "theme_color": "#111212", "lang": "de",
     "icons": [{"src": "icon.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
               {"src": "icon.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}
(ROOT / "manifest.json").write_text(json.dumps(m, ensure_ascii=False))
shutil.copy(SRC / "icon.png", ROOT / "icon.png")
print("Gebaut, Version", ver)
