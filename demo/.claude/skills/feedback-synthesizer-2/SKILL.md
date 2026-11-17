---
name: feedback-synthesizer-2
description: Verdichtet Rohfeedback zu belegten Clustern mit validiertem YAML-Frontmatter für den Offline-Viewer.
allowed-tools: Read, Write, Glob, Bash
---

# feedback-synthesizer-2

Arbeite aus `demo/data/`. Alle Daten- und Quellenpfade sind relativ zu diesem Datenroot, nicht zu `demo/`. Ergänze in Report-Referenzen kein `data/`.

Lies zuerst `../SCHEMA.md` vollständig. Verwende das dort definierte Schema exakt. Schreibe konventionelles YAML-Frontmatter zwischen `---`-Trennzeilen: eingerückte Mappings und Listen, kein JSON-Objekt. Verwende bei Bedarf `>-` für Absätze und `|-` für wortwörtliche mehrzeilige Zitate. Kommentare sind erlaubt; doppelte Schlüssel, explizite Tags und Aliase nicht. Danach folgt ein lesbarer deutscher Markdown-Bericht. Falls PyYAML fehlt, installiere zuerst `python3 -m pip install -r ../requirements.txt` (ggf. in einer virtuellen Umgebung).

## Eingaben und Vorgehen
1. Der Aufruf übergibt den Feedback-Ordner (Standard: `input/raw_feedback/`). Finde alle .md-Dateien mit Glob und lies sie vollständig, ohne vorab zu werten.
2. Verwende das tatsächliche heutige Datum (YYYY-MM-DD) als run_id.
3. Identifiziere 3–6 Themen aus dem Material; keine unbelegten Interpretationen. Jeder Cluster benötigt mindestens zwei unabhängige Stimmen und exakte, zusammenhängende Direktzitate. Wenn das Material dies nicht erlaubt, erkläre die unzureichende Datenbasis statt Cluster zu erfinden.
4. Verwende stabile sprechende Cluster-IDs. Eine Person zählt pro Cluster nur einmal, auch wenn ihre Aussage in mehreren Dateien wiederholt wird. Verwende konsistente mention-IDs und Labels.
5. Zitiere Datei, Abschnitt (locator) und Sprecher. Quellenpfade sind relativ zum Datenroot. Zitate müssen wortwörtlich in der Quelle vorkommen, ohne Auslassungszeichen einzufügen.
6. Dokumentiere Widersprüche ausdrücklich mit Quellen; Einzelfälle gehören in outliers.
7. Schreibe alle im Schema verlangten Felder. Leere contradictions/outliers sind Arrays. Liste alle vier Rohfeedback-Dateien als sources.
8. Schreibe danach einen menschlich lesbaren Bericht: pro Cluster Titel, unabhängige Stimmen, Zusammenfassung, Belege und Widersprüche, anschließend Einzelfälle. Inhalt und Frontmatter müssen übereinstimmen.

## Ausgabe
`output/YYYY-MM-DD/discovery/feedback-clusters-v2.md`

Alte Reports ohne -v2 bleiben unverändert. Existiert der v2-Report bereits, frage vor dem Überschreiben nach. Kein eigener UI-Code und keine MCP-Tools.

## Pflicht: Validieren
Führe vom Datenroot (`demo/data/`) aus:
```sh
python3 ../.claude/skills/feedback-synthesizer-2/scripts/validate.py output/YYYY-MM-DD/discovery/feedback-clusters-v2.md
```
Behebe alle Fehler und wiederhole die Prüfung bis Exit-Code 0. Ein Validator-Erfolg prüft die Struktur und Zitate, nicht die Qualität der Interpretation. Prüfe diese zusätzlich selbst. Melde den Ausgabepfad und das Prüfergebnis.
