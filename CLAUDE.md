# Trainings-App – Anleitung für Claude Code

Persönliche Krafttrainings-App von Alexander (Muskelaufbau, 3× pro Woche Di/Fr/So). Oberfläche komplett auf Deutsch, für das iPhone optimiert, muss im Studio **ohne Internet** funktionieren.

## Aufbau

```
src/app.html          Quelle der App (HTML, CSS, JS). Marken: /*@SYNC@*/ (dort kommt sync.js hin) und __VER__ (Version).
src/sync.js           Abgleich mit n8n per Schlüssel (API-Adresse, Schlüsselkarte, Service-Worker-Anmeldung, Update-Hinweis).
src/sw.template.js    Service Worker (Speicher zuerst, Aktualisierung im Hintergrund). __VER__ und __FONTS__ setzt der Build.
src/icon.png          App-Icon (erzeugt mit tools/icon.py)
src/fonts/            Schrift Barlow als woff2 (SIL Open Font License), wird nach fonts/ kopiert und vom Service Worker gecacht
tools/build.py        Baut aus src/ die veröffentlichte App ins Repo-Root (fügt sync.js ein, setzt Version, kopiert Dateien)
index.html, sw.js, manifest.json, icon.png, fonts/   GEBAUTE Dateien → nie direkt bearbeiten
tests/sync.test.js    jsdom-Test für Schlüssel, Abgleich, Löschen, Nachsichern (n8n wird simuliert)
tests/logic.test.js   jsdom-Test für Entlastung, Progression, Wochensätze, keine externen Quellen
docs/n8n.md           Die n8n-Workflows und Datentabellen
```

Veröffentlicht über GitHub Pages: https://alexsleepi.github.io/training-app/ (Branch `main`, Root). Ein Push auf `main` ist das Deployment.

## Arbeitsablauf

1. Änderungen nur in `src/app.html` (bzw. `src/sync.js`, `src/sw.template.js`).
2. `python3 tools/build.py` – bricht ab, wenn eine Marke fehlt oder doppelt vorkommt.
3. Prüfen: `npm install && npm test` (bricht bei Fehlern mit Exit-Code 1 ab; neue Logik bekommt eine Prüfung in `tests/`), außerdem Syntax-Check:
   `node -e "const s=require('fs').readFileSync('index.html','utf8');new Function(s.match(/<script>([\s\S]*)<\/script>/)[1])"`
4. Sichtprüfung im Handyformat (390×844), z. B. mit Playwright-Screenshot.
5. Committen und pushen. Die App aktualisiert sich auf dem iPhone von selbst: Der Service Worker startet sofort aus dem Speicher, lädt im Hintergrund die neue Version und zeigt „Neu laden“. Ohne Tippen erscheint sie beim nächsten Öffnen.

## Wichtige Regeln

- **Offline zuerst:** Alles muss ohne Netz laufen. Keine externen Skripte, Schriften, Bilder oder CDNs. Einzige Netzverbindung ist die n8n-API.
- **Keine Geheimnisse ins Repo.** Das Repo ist öffentlich. Der Zugangsschlüssel zur n8n-API steht nur in n8n (Tabelle „Withings Zugang“, Zeile `trainings-app`) und im localStorage der App.
- **Daten:** Alles liegt lokal im localStorage (`hp3_*`) und wird über n8n gesichert. Einheiten haben IDs `s_<zahl>`, Löschungen laufen über Grabsteine (`settings.deleted`) plus `_delPending`. Bestehende Daten nie verwerfen; Formatänderungen abwärtskompatibel halten.
- **Fachliche Basis:** Ganzkörper A/B/C, doppelte Progression (Grundübungen steigen bei Schnitt ≥ oberes Ende − 1 ohne Satz unter dem Bereich, Isolationsübungen erst wenn alle Sätze oben sind; `suggest()`), Reserve (RIR) im letzten Satz, Entlastung nach Bedarf (`deloadStatus()`), Tagesform aus HRV relativ zum eigenen 30-Tage-Schnitt (`readiness()`). Ernährung bewusst minimal: nur Eiweißziel (~1,9 g/kg) mit vier Portionen. Ziel aktuell Rekomposition.
- **Geräte im Studio:** Technogym-Beinpresse, Bankdrückstation, Smith-Maschine/Rack mit verstellbarer Bank, Kabelturm (4 Stapel) mit Latzug- und Ruderbank, Beinstrecker (Scheiben), Abduktor, 45°-Hyperextension, Kurzhanteln, Rudergerät, Spinning-Bike, Laufband, Pool, Sauna. Keine Beinbeuger-Maschine.
- **Animationen:** Reines SVG in `src/app.html` (Objekt `FIG`, Zuordnung `PAT`, Zeichnen in `drawFig`). Koordinaten im Rahmen 200×160, Boden bei y=152.
- Sprache in der App: Deutsch, kurze klare Sätze, Zahlen mit Komma.

## n8n

Siehe `docs/n8n.md`. Für Änderungen an n8n braucht Claude Code den n8n-MCP-Connector (Instanz `sleepi.app.n8n.cloud`).

## Offene Punkte

- Auf dem iPhone noch nicht real getestet: Offline-Start, Bildschirm bleibt an (Wake Lock), Piepton am Pausenende. Der Piepton ist bei Stummschalter stumm und kommt bei gesperrtem Bildschirm erst nach dem Entsperren (Grenze von Web-Apps).
- Fehler ohne Fehlermeldung (z. B. keine neuen Whoop-Daten, weil der Strap nicht synchronisiert) meldet niemand. Fehler mit Meldung gehen per Mail über „Fehler-Melder Training“ (siehe docs/n8n.md).
- n8n-Ausführungskontingent prüfen (Whoop ~7×/Tag, Withings 4×/Tag, App-Abgleich).
- Optional: echte Übungsvideos statt SVG (eigene Aufnahmen oder KI-generiert, offline gecacht).
