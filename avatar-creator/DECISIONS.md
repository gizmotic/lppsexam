# Entscheidungen

1. **Eigener Look statt Nachbau.** Die Xbox-Screenshots dienten nur als Maßstab für Umfang und Bedienung (Kategorien links,
   Figur rechts). Farben, Layout, Figur und Name sind eigenständig.
2. **MakeHuman-Daten als Basis** statt selbst modellierter Figur: nur so sind echte Gesichts- und Körperregler (Nase, Kinn,
   Muskeln, Brust …) in einer Sitzung erreichbar. 724 Morph-Ziele, alle über Regler ansprechbar.
3. **Morphing auf der CPU, nicht als GPU-Morphs.** Die Form wird pro Änderung neu berechnet (gemessen 6,7 ms), Kleidung und
   Haare werden danach an den Körper angepasst. Vorteil: der GLB-Export enthält die fertige Form ohne hunderte Morph-Ziele.
4. **Nur junge und alte Altersstufe**, keine Kinder-/Baby-Ziele – spart ~60 % Daten, der Zweck ist „sich selbst nachbauen“.
5. **Größe/Proportionen** nutzen nur die Ziele für mittlere Muskel-/Gewichtswerte (8 statt 216 dichte Ziele). Näherung.
6. **Haut als GPU-Komposition** in eine 2048er-Textur: Basishaut (512 px Quelle) × Hautton, darüber Poren, Sommersprossen,
   Punkterl, Lippen, Rouge, Lidschatten, Bart, Tattoos, Unterwäsche. Feine Details sind prozedural, weil die Quelle nur 512 px hat.
7. **Lippenmaske aus den Lippen-Volumen-Morphs**, nicht aus Knochengewichten oder Texturfarbe (beides gemessen und verworfen:
   zu breit bzw. bei dunkler Haut ohne Kontrast).
8. **Unterwäsche-Kanten aus einer Positionskarte** (Ruhepose pro Texel) statt aus Vertex-Masken – die waren ausgefranst.
9. **Passform ohne mhclo-Skalierungszeilen:** der Spiegel enthält sie nicht. Ersatz: Streuung der Bezugspunkte pro Achse,
   bei dünnen Teilen Mittel der breiten Achsen, begrenzt auf 0,78–1,3. Die Augen nutzen die echten Zeilen.
10. **Skelett mit achsparallelen Ruhe-Knochen.** Macht Animationen einfach und exportiert sauber; in Blender wirken die
    Knochen dadurch ungewohnt ausgerichtet, funktionieren aber.
11. **Animationen prozedural erzeugt** und als Keyframes abgetastet, damit sie identisch in der App und im GLB laufen.
12. **Mimik als Morph-Ziele** (Blinzeln links/rechts, Lächeln, Mund offen, Brauen hoch/runter), nicht über die Gesichtsknochen.
13. **Logos entfernt, Lizenz-unklare Teile weggelassen** – siehe ASSETS.md.
14. **Tests gegen den Produktions-Build** auf Port 5199.

## Gestrichen

- Foto-zu-Avatar, Shop/Accounts, Stoffsimulation (von Anfang an ausgeschlossen).
- Bärte als Geometrie (Lizenz unklar) → Bartschatten in der Haut.
- Import fremder Animationen (Mixamo-Retargeting): nicht gebaut.

## Nach den Kritiker-Runden

15. **Haarkanten geglättet statt Rohtextur.** Die 512-px-Strähnenmaske ergab ausgefranste Ränder (zwei Runden bemängelt). Die
    Deckung wird jetzt weichgezeichnet und neu gehärtet → eine ruhige Kontur. Ein zweiter, weicher Haar-Durchgang wurde
    versucht und abgeschaltet (heller Saum an der Stirn).
16. **Zwei Frisuren abgeschaltet** (`short01`, `afro01`): nach zwei Runden weiter schwach. Gepackt, aber nicht angeboten.
17. **Kleidung über Kleidung per Regel:** Hut blendet Haare im Hutkopf aus, langer Mantel blendet die Hose darunter aus,
    getrennte Outfit-Teile verstecken nur den Körper, den sie wirklich bedecken. Keine echte Kollisionsberechnung.
18. **Kleidung bekommt Luft** (3–17 mm entlang der Normalen, mehr bei hohem Gewicht) gegen durchstoßende Körper.
19. **Altern überträgt nur Hell/Dunkel** der älteren Hauttextur (Falten), nicht deren Farbstich.
20. **„Muskelmasse" zieht ab der Mitte die Muskel-Detailformen mit** – das Makro allein brachte fast nur Masse.
21. **Eigene Vorschaubilder** aus der App gerendert statt der uneinheitlichen mitgelieferten.
22. **Hauttöne als gedämpfte Albedo-Werte**, plus 10 % Entsättigung: die Quellen wirkten im Studiolicht orange.
23. **Zufall würfelt jeden Gesichtsregler einzeln** (meist klein, jeder fünfte kräftig) plus Kopfform-Typ, Körperbau-Mix,
    Alter, Haut und Haare.
24. **Veröffentlichte Vorschau als Seite:** Binärdateien dort unter `.wasm`, weil `.bin` nicht ausgeliefert wird.

## Schulbetrieb, Haare, eigene Kopftextur

25. **Kleidung ist Pflicht, die aufgemalte Grundschicht ist aus** (`paintedBase: false`). Oberteil und Hose/Rock lassen sich nicht
    entfernen; ein Wechsel tauscht erst, wenn das neue Teil samt Textur geladen ist (Test: kein Frame ohne Kleidung).
    Die weiße Haut an Kurztops und Röcken entfällt dadurch. Brustwarzen und Becken-Wölbung sind immer geglättet.
26. **Rock/Hose werden unter dem Saum des Oberteils abgeschnitten** (Saum = tiefster Punkt in der Rumpfmitte, Ärmel ausgenommen),
    sonst ragt der Rock durchs T-Shirt. Ein kurzes Top hat den Saum über dem Bund: dann bleibt alles stehen.
27. **Frisuren sind erzeugt** (`src/hair.js`, 27 Stile) auf der Kopfhaut des Avatars: Haaransatz-Linie, Dicke-Feld, Längen, Anbauteile
    (Dutt, Zopf, Locken). Kurze Haare (Buzz, Fade-Seiten) sind in die Haut gemalt. Sie folgen allen Kopfreglern.
28. **Eigene Kopftextur** (`setFaceTexture`): Kopf-Abwicklung (Gesicht in der Mitte) wird auf den Basiskopf zylindrisch projiziert
    (u = Azimut, v = Höhe, gemessen auf dem unveränderten Kopf – Augenabstand und Ohrenlage passen ohne Anpassung). Haare, Brauen,
    Augäpfel und der schwarze Hintergrund werden mit Wangenfarbe und örtlicher Helligkeit übermalt. Körperhaut zieht die Farbe nach.
    Das Bild bleibt im Speicher (nicht hochgeladen, nicht gespeichert, nicht im JSON).

## Frisuren-Runden und Kopfbedeckungen

29. **Haaransatz gesenkt** (Stirn 10° statt 27°), **Volumen** über einen Faktor je Stil (`vol`, Standard 1,55), Haarwurzeln per Vertex-Farbe
    abgedunkelt (die dünne Vorderkante wirkte sonst als heller Streifen).
30. **Lange Haare fallen seitlich nach vorn über die Schultern**, Haare vom Hinterkopf hinter den Körper – wie in den Kundenvorlagen.
    Vorher verschwand alles hinter den Schultern und die langen Frisuren sahen am Kinn abgeschnitten aus.
31. **Kopfbedeckungen als erzeugte Teile** (`slot: 'hat'`): Kappe, verkehrt herum, Snapback, Mütze, Stirnband. Kappenlinie nach Azimut (vorn hoch, im
    Nacken tief), Schirm als gebogener Streifen. Haare unter der Kappe werden entlang dieser Linie ausgeblendet, nicht nach fester Höhe.
32. **Nichts von zonk.me übernommen:** die Seite ist von hier nicht erreichbar, und ihre Modelle sind urheberrechtlich geschützt. Die Kappen und
    Frisuren sind eigene Modelle in den üblichen Formen.
