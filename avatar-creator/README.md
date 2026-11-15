# Avatar-Studio

Avatar-Creator in three.js: sich selbst nachbauen – Gesicht, Körper, Haut, Haare, Kleidung, Schuhe, Deko – und als
animierbares GLB exportieren. Eigenständiges Unterprojekt, unabhängig vom restlichen Repository.

```bash
npm install
```

```bash
npm run dev
```

Öffnet auf dem festen Port **http://localhost:5199/** (GLB-Vorschau: `/viewer.html`).

```bash
npm test
```

Baut die Produktionsversion und lässt die 9 End-to-End-Tests dagegen laufen.

## Was drin ist

| Bereich | Inhalt |
|---|---|
| Körper | Geschlecht, Alter, Größe, Gewicht, Muskelmasse, Proportionen, Körperbau-Typ; Oberkörper, Brust (Größe, Festigkeit, Form), Bauch & Hüfte, Arme & Hände, Beine & Füße |
| Gesicht | Kopfform, Stirn, Augen (+ freie Augenfarbe, Wimpern), Augenbrauen (12 Formen, Farbe), Nase, Mund, Wangen, Kinn & Kiefer, Ohren, Hals – 139 Regler |
| Haut | 20 Hauttypen, Hautton, Falten, Sommersprossen (Gesicht/Körper), Punkterl per Klick, Lippen, Rouge, Lidschatten, Bartschatten |
| Haare | 8 Frisuren + Glatze, freie Haarfarbe (2 weitere gepackt, aber abgeschaltet) |
| Kleidung | 18 Oberteile, 10 Hosen/Röcke, 10 Kleider/Outfits, 7 Paar Schuhe, jeweils umfärbbar; Unterwäsche-Grundschicht |
| Deko | 3 Hüte, Brille, Armstulpen, Tattoos per Klick (16 Motive) |
| Bewegung | Stehen, Winken, Gehen, Tanzen, A-Pose – mit Blinzeln und Lächeln |
| Export | GLB (163 Knochen, Skinning, 6 Mimik-Morphs, 4 Animationen, Texturen), PNG-Foto, Avatar als JSON speichern/laden |

## Schalter

Alle Funktionen sind Schalter in [`src/config.js`](src/config.js): `shadows`, `skinDetailNormal`, `hairCleanEdge`, `hairSoftPass`, `hiddenParts`,
`expressions`, `moles`, `tattoos`, `underwear`, `autosave`, `glbAnimations`, `skinSize`, `maxPixelRatio`. Ausschalten statt löschen.

## Assets neu bauen

Die gepackten Assets liegen fertig in `public/assets` (25,7 MB). Neu erzeugen:

```bash
MH_DATA=<makehuman>/makehuman/data MH_MIRROR=<makehuman-data>/public/data npm run assets
```

Vorschaubilder neu rendern (Dev-Server muss laufen): `node tools/make-thumbs.mjs`. Build für Hoster, die kein `.bin` ausliefern: `node tools/build-page.mjs` (→ `dist-page/`).

Quellen und Lizenzen: [ASSETS.md](ASSETS.md). Stand und Entscheidungen: [STATUS.md](STATUS.md), [DECISIONS.md](DECISIONS.md).
