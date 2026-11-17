# Priority board demo

A read-only, offline viewer for the journey from raw feedback to evidence-backed clusters and product opportunity scorecards. Markdown files remain the source of truth.

## Open the app

1. Double-click **`prioboard-viewer.html`** (or open it in a current desktop browser).
2. Click **Choose folder** and select **`demo/data/`**—not `demo/`, `input/`, or an individual dated output folder. If asked, allow the browser to read the selected files; nothing is uploaded.
3. Browse **Opportunities**, **Clusters**, **Inputs**, **Context**, and **Reports**.

Use the run selector to choose a dated output folder. Inputs, Context, and Reports each have a folder browser; select a subfolder and file to view the original raw Markdown. Expand opportunity cards for scores, rationales, conclusions, and cluster evidence. Click source references to open the original file with the cited quote highlighted.

No server, build step, package installation, CDN, or network access is needed to view the app. Lucide v1.73.0 icons and the js-yaml v5.5.0 parser are embedded, with license notices inside the HTML. The HTML contains all UI code and styles; it does not contain the Markdown data. Tested with desktop Chrome, including a narrow/mobile-sized layout. Folder selection requires a browser with `webkitdirectory` support (current desktop Chrome, Edge, Firefox, and Safari).

**Reloading:** the browser reads a snapshot. After generating or editing reports, click **Reload folder** and select the folder again. Reloading the page clears the workspace. No persistent permissions or data storage are used.

## Structure

```text
prioboard-viewer.html              Self-contained offline viewer
prioboard-viewer/                   Hosted Applet source (see its README)
SCHEMA.md                          Versioned frontmatter contract
data/                              Select this folder in either viewer
  context/                         Company, strategy, product, team, etc.
  input/raw_feedback/              Slack, emails, interviews, internal documents
  output/YYYY-MM-DD/
  discovery/feedback-clusters.md       Original human-readable report
  discovery/feedback-clusters-v2.md    Structured v2 report + readable body
  strategy/opportunity-scorecard.md    Original human-readable scorecard
  strategy/opportunity-scorecard-v2.md Structured v2 scorecard + readable body
.claude/skills/
  feedback-synthesizer/             Original skill (unchanged)
  opportunity-scorer/               Original skill (unchanged)
  feedback-synthesizer-2/           Structured clustering + validation entry point
  opportunity-scorer-2/             Structured scoring + validation entry point
scripts/validate_reports.py        Shared Python YAML validator
requirements.txt                   PyYAML dependency (validation only)
tests/                             Validator and browser regression tests
```

The included **2026-11-14** v2 run adapts the pre-existing reports into the new schema, with six clusters, six scorecards, and exact quotations checked against source files. Independent-voice counts reflect the evidence actually included in v2, rather than copying the broader frequency claims in the old report. No original reports were overwritten. These are illustrative analyses, not newly collected customer feedback.

## Generate a new run

Open Claude Code from **`demo/data/`** (skills live in the parent `demo/.claude/` directory). All input, context, output, and report-internal paths are relative to `data/`:

```text
/feedback-synthesizer-2 input/raw_feedback/
/opportunity-scorer-2
```

The skills use the actual current date, write `*-v2.md` reports, and must run their validation scripts before completing. The scorer can also be given a specific existing run path. Both skills ask before replacing an existing v2 report. Original skills still work, but their unstructured output appears only in the raw Reports browser, not as structured cards.

## Data contract

See **`SCHEMA.md`** for the full schema. Reports use **conventional YAML frontmatter** inside `---` delimiters: indented mappings, lists, comments, and multiline strings (`|-` / `>-`). The viewer embeds js-yaml; validators use PyYAML. Duplicate keys, explicit tags, aliases, and excessive nesting are rejected. Dates remain strings, scores remain integers, and quotes are checked after YAML parsing. Existing v2 demo reports have been converted to readable YAML without changing their data or Markdown bodies.

Stable cluster IDs connect scorecards to evidence. Each cluster needs at least two independent voices, verbatim quotes, and explicit source references. Every score dimension needs a 1–5 integer, a rationale, and a quoted context reference. Totals and ranks are calculated by the viewer; equal totals share a rank. There are no manual overrides. File badges count files, not individual messages or interviews.

The viewer shows clear errors for missing/invalid v2 reports and refuses to display their structured cards. Raw files remain accessible. It checks structure, sources, quotations, and references, but cannot judge the substance of an interpretation. All file contents are rendered as text, never executed as HTML.

## Validate and test

Run the following commands from **`demo/`**. Python 3.9+ and PyYAML are needed only for validators/tests, not for viewing the app. Install in a virtual environment if your Python requires one:

```sh
python3 -m pip install -r requirements.txt
python3 .claude/skills/feedback-synthesizer-2/scripts/validate.py data/output/2026-11-14/discovery/feedback-clusters-v2.md
python3 .claude/skills/opportunity-scorer-2/scripts/validate.py data/output/2026-11-14/strategy/opportunity-scorecard-v2.md
python3 -m unittest discover -s tests -v
```

Optional browser regression suite (test tooling only; the app has no dependencies):

```sh
npm install --prefix /tmp/discovery-viewer-test --no-package-lock playwright
# On macOS the test uses the installed Google Chrome; otherwise install Chromium:
# /tmp/discovery-viewer-test/node_modules/.bin/playwright install chromium
NODE_PATH=/tmp/discovery-viewer-test/node_modules node tests/viewer.cjs
```

Set `CHROME_PATH` to use a different browser executable. The suite uses temporary fixture folders, leaves original data untouched, and prints the screenshot location. It covers loading, tied rankings, source highlighting, raw browsing, run selection, malformed/missing reports, narrow layout, HTML injection safety, and failed-import recovery.

## Provenance

Original skills, input files, and context were initially copied unchanged from the local `AIAugmentedPM-Woche5` project. The `-2` skills, schema, validators, viewer, and structured reports were added for this demo.
