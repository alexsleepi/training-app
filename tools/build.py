#!/usr/bin/env python3
"""Baut die App (GitHub Pages) aus src/.

src/app.html ist die Quelle. Der Build fügt src/sync.js an der Marke /*@SYNC@*/ ein,
setzt die Version (__VER__) und schreibt index.html, sw.js, manifest.json, icon.png, fonts/ und img/ ins Repo-Root.

Aufruf:  python3 tools/build.py
"""
import hashlib, json, shutil, time
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

ver = str(int(time.time()))
s = (SRC / "app.html").read_text(encoding="utf-8")
sync = (SRC / "sync.js").read_text(encoding="utf-8")
for mark in ("/*@SYNC@*/", "__VER__"):
    assert s.count(mark) == 1, f"Marke {mark} muss genau einmal in src/app.html stehen ({s.count(mark)}x)"
assert "__VER__" not in sync and "/*@SYNC@*/" not in sync
s = s.replace("/*@SYNC@*/", sync).replace("__VER__", ver)

(ROOT / "index.html").write_text(s, encoding="utf-8")
# Schriften und Fotos kopieren; ihre Liste und eine Prüfsumme gehen in den Service Worker
assets = []
h = hashlib.sha1()
for sub, pat in (("fonts", "*.woff2"), ("img", "*.webp")):
    names = sorted(f.name for f in (SRC / sub).glob(pat))
    assert names, f"Keine Dateien in src/{sub}"
    (ROOT / sub).mkdir(exist_ok=True)
    for f in (ROOT / sub).iterdir():
        f.unlink()
    for f in sorted((SRC / sub).iterdir()):
        shutil.copy(f, ROOT / sub / f.name)
    for n in names:
        assets.append(f"{sub}/{n}")
        h.update(n.encode()); h.update((SRC / sub / n).read_bytes())
(ROOT / "sw.js").write_text((SRC / "sw.template.js").read_text(encoding="utf-8").replace("__VER__", ver)
                            .replace("__AHASH__", h.hexdigest()[:10])
                            .replace("__ASSETS__", ",".join(json.dumps(a) for a in assets)), encoding="utf-8")
m = {"name": "Hypertrophie 3×", "short_name": "Training", "id": "./", "start_url": "./", "scope": "./", "display": "standalone",
     "orientation": "portrait", "background_color": "#111212", "theme_color": "#111212", "lang": "de",
     "icons": [{"src": "icon.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
               {"src": "icon.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}
(ROOT / "manifest.json").write_text(json.dumps(m, ensure_ascii=False))
shutil.copy(SRC / "icon.png", ROOT / "icon.png")
print("Gebaut, Version", ver)
