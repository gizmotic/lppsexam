# Assets: Quellen und Lizenzen

Der Programmcode in `src/`, `tools/`, `tests/` ist neu geschrieben. Die 3D-Daten stammen aus dem MakeHuman-Projekt.

| Was | Quelle | Lizenz |
|---|---|---|
| Basisnetz, 724 Morph-Ziele, Skelett + Gewichte, Augen-Netz und Augen-Textur | `github.com/makehumancommunity/makehuman` (`makehuman/data`), geklont | CC0 1.0 (dort `LICENSE.ASSETS.md`; die Dateien tragen den CC0-Vermerk von September 2020) |
| Haut-Texturen, Haare, Brauen, Wimpern, Zähne, Zunge, MakeHuman-Kleidung und -Schuhe, Fedora | npm-Paket `makehuman-data` 0.0.2 (Spiegel der MakeHuman-1.1-Assets, je 512 px) | von MakeHuman als CC0 freigegeben, siehe Hinweis |
| Jeans, Röcke, Tops, Mantel, Schlauchkleid, Winterstiefel, Brille | punkduck, über denselben Spiegel | CC BY 3.0 |
| Kleider 1–4, Strandkleid, Badeanzug, Tanktop, Anglerhut | Mindfront (Sweden), über denselben Spiegel | CC BY 4.0 |
| Tunika, Camo-Shirt, Tropenhelm | DredNicolson, über denselben Spiegel | CC BY |
| Top (`female_top_01`) | wolgade | CC0 |
| Armstulpen | V0rT3X | CC0 |

**Hinweis, nicht geprüft:** Das offizielle Asset-Repository (`makehuman-assets`) war aus dieser Umgebung nicht erreichbar.
Die MakeHuman-eigenen Haut-, Haar- und Kleidungsdateien kommen deshalb aus dem npm-Spiegel von 2016, dessen Metadaten noch
die alte Lizenzangabe tragen. MakeHuman hat seine mitgelieferten Assets 2020 ausdrücklich als CC0 neu freigegeben; dass jede
gespiegelte Datei bitgleich zu einer Datei im CC0-Repository ist, wurde nicht Datei für Datei verglichen. Vor einer
kommerziellen Veröffentlichung bitte gegen das offizielle Repository abgleichen.

Nicht übernommen: alle Community-Teile, deren Lizenzfeld „AGPL3“ oder „Unknown“ lautet (u. a. Bärte, einige Frisuren,
Umhang, Rucksack), sowie Dessous-Teile.

Bearbeitungen beim Packen (`tools/build-assets.mjs`): MakeHuman-Logodrucke auf sechs Kleidungsstücken entfernt (Markenzeichen
sind von CC0 nicht erfasst), Brillengläser aufgehellt, Outfits in Ober- und Unterteil getrennt, alles nach WebP konvertiert.
Die CC-BY-Urheber werden in der App unter Export → Quellen genannt.
