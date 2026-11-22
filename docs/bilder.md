# Übungsfotos

Zu jeder Übung und Ausweichübung gibt es zwei Fotos: Start (`-a`) und Endposition (`-b`). Sie liegen in `src/img/` als WebP (800 × 640 px, zusammen ca. 1,2 MB), der Build kopiert sie nach `img/`, der Service Worker speichert sie offline. Die Zuordnung Übungsname → Bildschlüssel steht in `PHOTO` in `src/app.html`. Übungen ohne Eintrag zeigen stattdessen die gezeichneten Standbilder.

Die Bilder sind KI-erzeugt (Higgsfield, Modell `gpt_image_2_6`, Qualität `high`, Auflösung `1k`, Seitenverhältnis 5:4, ca. 1,25 Credits pro Bild). Das Repo ist öffentlich, die Bilder also auch.

## So entsteht ein neues Bildpaar

1. **Startbild:** `src/img/squat-a.webp` als Vorlage (Rolle `image_references`) mitgeben, damit Person, Kleidung, Licht und Hintergrund gleich bleiben. Im Prompt steht:
   - Vorlage nur für Person und Look nutzen, das Gerät der Vorlage nicht zeigen.
   - Kamera: reine Seitenansicht, Person schaut nach rechts. Von vorn bei Seitheben, Fliegenden und Klimmzügen.
   - Gerät und Startposition genau beschreiben (Griff, Gelenkwinkel, Fußstellung, Rückenhaltung).
   - „No text, no labels, no arrows, no logos, no watermark, no other people.“
2. **Endbild:** das eigene Startbild als Vorlage. „Same man, same equipment, same camera … Change only the pose“, dann die Endposition genau beschreiben.
3. **Prüfen:** Jedes Bild auf richtige Technik ansehen. Typische Fehler der KI bisher:
   - Wadenheben: unsinniges Gerät. Abhilfe: das Beinpresse-Startbild als Vorlage nehmen und nur die Füße ändern.
   - Kabel-Crunch: Die Figur setzt sich auf die Fersen. Abhilfe: im Prompt festhalten, dass der Unterkörper wie in der Vorlage bleibt.
4. **Verkleinern:** auf 800 px Breite, WebP mit Qualität 80, nach `src/img/<schlüssel>-a.webp` und `-b.webp`.
5. In `PHOTO` eintragen, `python3 tools/build.py`, `npm test`. Ein Test prüft, dass jede Übung des Plans zwei Bilder hat und alle im Service Worker stehen.

## Stand

Alle 20 Übungen des Plans und alle 17 Ausweichübungen haben Fotos (74 Bilder, ca. 1,2 MB). „Reverse Flys Kurzhantel“ hat keine Animation und zeigt nur die Fotos. Eigene Bildunterschriften stehen in `PCAP`.

Weitere Fehler der KI, die neu erzeugt wurden: Hyperextension (Oberkörper hing in der Endposition zu wenig nach unten).
