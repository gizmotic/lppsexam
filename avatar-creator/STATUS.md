# Status

**Stand: ~85 %.** Lauffähig, getestet, exportiert animierte GLBs. Die unabhängigen Kritiker haben bisher **nicht** „ja" gesagt –
siehe unten. Offen ist Qualität an Haaren und Nahaufnahme, kein fehlendes Kernstück.

## Fertig und geprüft
- Morphing (139 Gesichts- und Körperregler + 8 Grundform-Regler), Skelett, Kleidungs-/Haar-Anpassung, Haut-Komposition,
  4 Animationen, GLB-Export, GLB-Vorschau, Speichern/Laden, Zufall, Vorlagen.
- 9 End-to-End-Tests grün gegen den Produktions-Build (`npm test`).

## Gemessen (Headless-Chromium, Software-GL)
| Größe | Wert |
|---|---|
| Download gesamt (`dist`) | 26,4 MB (Grenze 40 MB) |
| Form neu berechnen (Morph + Passform + Normalen) | 4,0 ms |
| CPU-Anteil pro Bild | 0,9 ms |
| Draw Calls / Dreiecke | 13 / 36 274 |
| Shader-Kompilierungen während der Bedienung | 0 (17 Programme, alle beim Laden) |
| GLB mit Animationen | 9,2 MB, 163 Knochen, 4 Clips, 6 Morphs, 1,70 m |

## Kritiker-Runden (frische Agenten, nur Bilder, ohne meine Begründungen)
| Runde | Urteil | Kern |
|---|---|---|
| 1 | nein | Haare ausgefranst, Hut/Mantel kollidieren, Haut-Overlays fleckig, weißer Streifen am Hosenbund, Vorschaubilder uneinheitlich |
| 2 | nein | Vorschaubilder behoben, Hosenbund behoben; Haare, Nahaufnahme, Hut/Mantel, gealterte Haut nur teilweise |
| 3 | nein | Hut sitzt, Fedora erkennbar, Ansichts-Knöpfe ok; Haaransatz weiter stufig, Bartschatten/Alterung „wie Schmutz“, Mantel-Flecken, Zufallsgesichter „teilweise verschieden“ (Mund fast gleich) |
| danach | nicht erneut geprüft (inzwischen: 27 erzeugte Frisuren, Kleidung Pflicht, Rock/Hose unter dem Saum abgeschnitten, eigene Kopftextur) |
| — | — | Mund/Kinn/Nase streuen im Zufall jetzt breiter, Standardfrisur ohne Pony über dem Auge, Bartschatten weicher |

## Nicht gemessen / nicht geprüft
- **60 fps auf echter Grafikkarte**: nicht gemessen. Hier lief nur Software-Rendering.
- Import des GLB in Blender, Unity, Unreal: nicht geprüft – nur three.js-GLTFLoader.
- Safari, Firefox, Touch-Geräte: nicht geprüft. Das Handy-Layout ist angelegt und einmal im Bild kontrolliert.
- Die veröffentlichte Vorschauseite: auf claude.ai selbst nicht geöffnet. Derselbe Build läuft lokal in einem abgeschotteten
  Rahmen ohne eigene Herkunft fehlerfrei (`node tools/sandbox-check.mjs`).
- Lizenz-Abgleich der gespiegelten Assets: siehe ASSETS.md.

## Bekannte Schwächen
- Haut- und Kleidungsquellen haben 512 px: in Nahaufnahme weich.
- Haare sind Alpha-Karten: geglättete Kontur, aber wenig Strähnenzeichnung; zwei Frisuren abgeschaltet.
- Kleidung gegen Kleidung nur per Regel (Hut/Haare, Mantel/Hose), keine echte Kollision.
- Sehr extreme Körperformen können Kleidung durchstoßen.
- Auf der veröffentlichten Seite sind Downloads (GLB, PNG, JSON) von der Plattform gesperrt.

## Wiederaufnahme
`npm install && npm run dev`, dann `node tools/sheet.mjs <shots.json> <out.png>` für Kontrollbögen.
