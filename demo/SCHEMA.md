# Report contract — version 2

Reports use conventional **YAML frontmatter** between `---` delimiters. Write UTF-8 with space indentation, mappings, sequences, and readable strings. YAML comments and literal (`|`, `|-`) or folded (`>`, `>-`) multiline strings are supported. A readable Markdown report follows the closing delimiter. Frontmatter is the authoritative structured representation; the body must agree with it.

The offline viewer embeds js-yaml; Python validators use PyYAML. Both use YAML 1.2 JSON scalar resolution: numbers, lowercase `true`/`false`, and `null` have their usual types; dates and words such as `yes` and `on` stay strings. This describes **scalar typing, not JSON syntax**—write normal YAML, not JSON objects. Quote dates for clarity. Duplicate keys, explicit tags, aliases, and nesting beyond 40 levels are rejected. Use string mapping keys. Merge keys are not part of the report schema.

## Locations and identity

- `output/<run_id>/discovery/feedback-clusters-v2.md`
- `output/<run_id>/strategy/opportunity-scorecard-v2.md`

`run_id` is `YYYY-MM-DD`, matching the containing folder. One v2 run per date; no comparisons. Old unsuffixed reports remain untouched and can be read as raw Markdown. Source paths are relative to the selected dataset root (`demo/data/`), use `/`, and cannot escape it. The physical folders now live under `data/`; do not add `data/` to paths stored inside reports. Cluster IDs are stable descriptive slugs, not array positions. Reuse IDs across runs when the theme is unchanged.

## Feedback report

Required top-level fields:

```yaml
---
schema_version: 2
kind: feedback_clusters
run_id: '2026-11-14'
sources:
  - input/raw_feedback/slack.md
  - input/raw_feedback/emails.md
  - input/raw_feedback/customer_interviews.md
  - input/raw_feedback/internal_docs.md
clusters: [] # Populate with 3–6 clusters as below.
outliers: []
---
```

Each entry in `clusters` has this structure (placeholder quotes must be replaced with actual evidence):

```yaml
- id: manual-onboarding
  title: Manuelles Nutzer-Onboarding
  summary: >-
    A grounded summary in German, which can span several lines
    in the source while displaying as one paragraph.
  mentions:
    - id: logitrans-hartmann
      label: Peter Hartmann · LogiTrans
    - id: financeplus-berg
      label: Thomas Berg · FinancePlus
  evidence:
    - mention_id: logitrans-hartmann
      source: input/raw_feedback/customer_interviews.md
      locator: Interview 1
      speaker: Peter Hartmann
      quote: An exact contiguous quote from the source.
    - mention_id: financeplus-berg
      source: input/raw_feedback/customer_interviews.md
      locator: Interview 3
      speaker: Thomas Berg
      quote: Another exact quote.
  contradictions:
    - text: Describe the disagreement, without resolving it.
      sources:
        - input/raw_feedback/slack.md
        - input/raw_feedback/customer_interviews.md
```

`mentions` counts independent voices, not repeated references to the same person in emails, interviews, and internal summaries. Each mention requires supporting evidence; every cluster needs at least two distinct mentions. Keep the same mention ID for a person across clusters. The UI derives counts from mentions and evidence, not from free-text frequency claims. Source-file badges count files, not individual Slack messages or interviews.

Outliers use:

```yaml
outliers:
  - text: An individual case that does not belong to a cluster.
    sources:
      - input/raw_feedback/slack.md
```

Contradictions may be empty; outliers may be empty. All four raw input files must be listed in `sources` for this demo. Quotes must occur exactly in the named source; no invented or ellipsis-joined quotes. YAML folding/chomping must preserve the intended quotation: use `|-` for excerpts with actual line breaks, and avoid introducing a trailing newline that is not in the source.

## Opportunity report

```yaml
---
schema_version: 2
kind: opportunity_scorecard
run_id: '2026-11-14'
clusters_file: output/2026-11-14/discovery/feedback-clusters-v2.md
context_files:
  - context/company.md
  - context/strategy.md
opportunities:
  - cluster_id: manual-onboarding
    dimensions:
      vision_fit:
        score: 4
        rationale: >-
          German explanation grounded in the inputs.
        references:
          - source: context/strategy.md
            quote: Exact context excerpt.
      repeatability:
        score: 5
        rationale: German explanation of the recurring pattern.
        references:
          - source: context/strategy.md
            quote: Exact context excerpt.
      buildability:
        score: 4
        rationale: German explanation of feasibility and constraints.
        references:
          - source: context/company.md
            quote: Exact context excerpt.
    conclusion: >-
      German conclusion distinguishing product potential from short-term revenue.
---
```

Exactly one opportunity per cluster, each dimension an integer 1–5. Each rationale has at least one exact quote from the declared context files. The rationale also explains the relevant feedback evidence. Totals and ranking are calculated, never stored. Sort by total descending with tied scores sharing a rank; use cluster ID to order ties deterministically. No overrides or invented commercial tags.

## Validation

From `demo/`, install the validator dependency once:

```sh
python3 -m pip install -r requirements.txt
```

Then run:

```sh
python3 .claude/skills/feedback-synthesizer-2/scripts/validate.py data/output/YYYY-MM-DD/discovery/feedback-clusters-v2.md
python3 .claude/skills/opportunity-scorer-2/scripts/validate.py data/output/YYYY-MM-DD/strategy/opportunity-scorecard-v2.md
```

The scripts share `scripts/validate_reports.py`. They validate YAML syntax, shape, duplicate keys, safe paths, source existence, verbatim quotations, mention coverage, date identity, score ranges, and cross-report references. They cannot judge whether a theme or rationale is substantively sound; review that separately. The HTML implements the same structural and quotation checks for useful error messages; the Python validator is the authoritative content check. The viewer itself needs no installation.
