# n8n-Anbindung

Instanz: `https://sleepi.app.n8n.cloud`, persönliches Projekt `3FZ2SBEIccRygh0T`.

## Workflows

| Workflow | ID | Zweck |
|---|---|---|
| Whoop → Trainings-App | `6a6whSJh7yrNGHCz` | Holt Recovery, HRV, Ruhepuls, Schlaf, Strain, Gewicht (Whoop API v2, OAuth2-Zugang „Whoop“). Zeitplan `0 6-10,14,20 * * *` Europe/Berlin, schreibt in „Whoop täglich“. |
| Withings → Trainings-App | `lcoGWM6rgrC3hwxK` | Holt Gewicht, Körperfett, Fett- und Muskelmasse der Withings Body Cardio. Zeitplan `15 7,9,12,21 * * *`. Token-Erneuerung über `POST https://wbsapi.withings.net/v2/oauth2` mit `action=requesttoken` (kleingeschrieben!), Secret über Query-Auth-Zugang „Withings Secret“. Neu verbinden: Webhook `GET /webhook/withings-callback`. |
| Trainings-App (Offline-Web-App) | `mJqwPH3BfHjTQqDZ` | Datenschnittstelle der App: `POST /webhook/training-api`. |

## API der App

`POST https://sleepi.app.n8n.cloud/webhook/training-api`
Header `Content-Type: text/plain` (vermeidet CORS-Preflight), erlaubte Herkunft `https://alexsleepi.github.io`.

Anfrage (JSON als Text):
```json
{ "key": "…", "sessions": [ /* geänderte Einheiten */ ], "deleted": ["s_…"], "settings": { /* nur wenn geändert */ } }
```
Antwort:
```json
{ "ok": true, "whoop": [...], "withings": [...], "sessions": [...], "deleted": [...], "settings": {...}, "at": "ISO-Zeit" }
```
Falscher Schlüssel → HTTP 401 `{"ok":false,"error":"key"}`.

Ablauf im Workflow: Anfrage lesen → Schlüssel laden (Tabelle „Withings Zugang“, Zeile `trainings-app`) → prüfen → Whoop/Withings/Einheiten lesen → Antwort bauen → antworten → danach Einheiten speichern (Upsert nach `sid`).

Hinweis: n8n liefert HTML aus Webhooks in einer Sandbox ohne localStorage aus. Deshalb liegt die App selbst auf GitHub Pages, nicht in n8n.

## Datentabellen

| Tabelle | ID | Spalten |
|---|---|---|
| Whoop täglich | `I8sfrL6DhPCNqqjx` | datum, recovery, hrv, ruhepuls, schlaf, strain, gewicht, … |
| Withings täglich | `9b1qBqdVuOTitwrZ` | datum, gewicht, fett_prozent, fettmasse, muskelmasse, aktualisiert |
| Withings Zugang | `67MgbjRlpinm68cl` | schluessel, access_token, refresh_token, aktualisiert (Zeilen `withings` und `trainings-app`) |
| Training Einheiten | `LjVozD8eYq4gyDgc` | sid, daten (JSON), geloescht, aktualisiert. Zeile `settings` enthält die App-Einstellungen. |
