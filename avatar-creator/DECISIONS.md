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
