---
name: opportunity-scorer-2
description: Bewertet v2-Feedback-Cluster gegen Unternehmenskontext und Strategie mit validierten strukturierten Scorecards.
allowed-tools: Read, Write, Glob, Bash
---

# opportunity-scorer-2

Arbeite aus `demo/data/`. Alle Daten- und Quellenpfade sind relativ zu diesem Datenroot, nicht zu `demo/`. Ergänze in Report-Referenzen kein `data/`.

Lies zuerst `../SCHEMA.md` vollständig. Verwende das dort definierte Schema exakt. Schreibe konventionelles YAML-Frontmatter zwischen `---`-Trennzeilen: eingerückte Mappings und Listen, kein JSON-Objekt. Verwende bei Bedarf `>-` für Absätze und `|-` für wortwörtliche mehrzeilige Zitate. Kommentare sind erlaubt; doppelte Schlüssel, explizite Tags und Aliase nicht. Danach folgt ein lesbarer deutscher Markdown-Bericht. Falls PyYAML fehlt, installiere zuerst `python3 -m pip install -r ../requirements.txt` (ggf. in einer virtuellen Umgebung).

## Eingaben
- `output/YYYY-MM-DD/discovery/feedback-clusters-v2.md`
- `context/company.md`
- `context/strategy.md`

Verwende das heutige Datum, sofern kein vorhandener Run-Pfad übergeben wurde. Bei explizitem Run verwende dessen Datum, nicht das heutige. Lies alle Eingaben vollständig. Validiere zuerst den Cluster-Report mit dessen Skill-Skript. Fehlt der Report oder ist er ungültig, stoppe und erkläre den Fehler.

## Bewertung
Erstelle genau eine Opportunity für jeden Cluster, keine für outliers. Referenziere die bestehende cluster_id, erfinde keine neuen IDs.
- vision_fit (1–5): Passt das zur Vision und Produktrichtung?
- repeatability (1–5): Wiederholt sich das Muster branchenübergreifend? Doppelte Aussagen einer Person sind keine neuen Stimmen.
- buildability (1–5): Ist das mit Team, Stack und Constraints realistisch baubar?

Jede Dimension braucht eine differenzierte deutsche rationale, die konkrete Feedbackbelege mit dem Kontext verbindet, und mindestens eine reference mit wortwörtlichem Zitat aus company.md oder strategy.md. Keine Scores ohne Evidenz. Beschreibe Unsicherheit und fehlende Daten; erfinde keine Zahlungsbereitschaft. Die conclusion unterscheidet Produktpotenzial von bezahltem Custom-Projekt und internem Tool.

Speichere keine Gesamtscores oder Rangnummern im Frontmatter; der Viewer berechnet diese. Der Markdown-Bericht darf daraus berechnete Gesamtwerte zeigen und enthält pro Cluster die drei Dimensionen mit Begründung und Fazit. Schreibe keine manuellen Overrides.

## Ausgabe
`output/YYYY-MM-DD/strategy/opportunity-scorecard-v2.md`

Alte Reports ohne -v2 bleiben unverändert. Existiert ein v2-Report bereits, frage vor dem Überschreiben nach. Keine MCP-Tools.

## Pflicht: Validieren
Führe vom Datenroot (`demo/data/`) aus:
```sh
python3 ../.claude/skills/opportunity-scorer-2/scripts/validate.py output/YYYY-MM-DD/strategy/opportunity-scorecard-v2.md
```
Behebe alle Fehler und prüfe erneut bis Exit-Code 0. Melde den Ausgabepfad und das Prüfergebnis.
