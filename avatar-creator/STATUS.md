# Status

**Stand: ~90 %.** Lauffähig, getestet, exportiert animierte GLBs. Offen ist Feinschliff, kein fehlendes Kernstück.

## Fertig und geprüft
- Morphing, Skelett, Kleidungs-/Haar-Anpassung, Haut-Komposition, Animationen, GLB-Export, GLB-Vorschau, Speichern/Laden.
- 9 End-to-End-Tests grün gegen den Produktions-Build (`npm test`).

## Gemessen (Headless-Chromium, Software-GL)
| Größe | Wert |
|---|---|
| Download gesamt (`dist`) | 26,6 MB (Grenze 40 MB) |
| Form neu berechnen (Morph + Passform + Normalen) | 6,7 ms |
| Haut-Komposition | 0,1 ms CPU-Anteil |
| Draw Calls / Dreiecke | 13 / 37 136 |
| Shader-Kompilierungen während der Bedienung | 0 (17 Programme, alle beim Laden) |
| GLB mit Animationen | 8,5 MB, 163 Knochen, 4 Clips, 6 Morphs, 1,70 m |
| GLB-Export | 1,5 s |

## Nicht gemessen / nicht geprüft
- **60 fps auf echter Grafikkarte**: nicht gemessen. Hier lief nur Software-Rendering (26 fps bei 1440×900).
- Import des GLB in Blender, Unity, Unreal: nicht geprüft – nur three.js-GLTFLoader.
- Safari, Firefox, Touch-Geräte: nicht geprüft. Das Handy-Layout ist nur grob angelegt.
- Lizenz-Abgleich der gespiegelten Assets: siehe ASSETS.md.

## Bekannte Schwächen
- Haut-Quelle 512 px: in extremer Nahaufnahme weich.
- Haare sind Alpha-Karten in 512 px: Ansatz teils ausgefranst.
- Kleidung gegen Kleidung wird nicht entzerrt (z. B. hohe Stiefel unter enger Jeans).
- Sehr extreme Körperformen können Kleidung durchstoßen.

## Wiederaufnahme
`npm install && npm run dev`, dann `tools/sheet.mjs` für Kontrollbögen. Nächste Schritte stehen im Abschnitt „Bekannte Schwächen“.
