#!/usr/bin/env python3
"""Baut die App (GitHub Pages) aus src/.

src/app.html ist die Quelle. Der Build fügt src/sync.js an der Marke /*@SYNC@*/ ein,
setzt die Version (__VER__) und schreibt index.html, sw.js, manifest.json, icon.png und fonts/ ins Repo-Root.

Aufruf:  python3 tools/build.py
"""
import json, shutil, time
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
