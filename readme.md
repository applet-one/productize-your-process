<a href="https://applet.one"><img src="assets/marketing-wordmark-inverted.svg" alt="Applet.one" width="290"></a>

# Productize Your Process

### How AI apps standardize ways of working

**From a useful AI workflow on one person’s laptop to a shared app the whole team can use.**

Slides, skills, sample data, and working apps for a deep-dive session on AI in product management. Built with [Applet.one](https://applet.one).

## The idea

Three people build skills, agents, and dashboards with Claude Code. The other seven don’t know how any of it works—and the best work stays on someone’s laptop.

This session explores what comes after those first AI wins: turning individual workflows into shared apps. Using **feature-request triage** as the example, it follows the journey from raw customer feedback to evidence-backed opportunities and a collaborative priority board.

The shift is bigger than productivity: **a shared app becomes a shared process.** You can ignore a Confluence page. You can’t ignore the app that does half your work.

The hard part isn’t just building the app. It’s getting a team to agree on one way of working.

## Explore the material

| Resource | What you’ll find |
| --- | --- |
| [Slide deck](deck/index.html) | The session’s story, examples, and discussion prompts |
| [Demo guide](demo/README.md) | Setup, report generation, validation, and tests |
| [AI skills](demo/.claude/skills/) | Feedback synthesis and opportunity scoring for Claude Code |
| [Sample dataset](demo/data/) | Company context, raw feedback, and example analysis runs |
| [Report schema](demo/SCHEMA.md) | The Markdown/YAML contract connecting AI output to the apps |

## Try it in two minutes

The offline priority board needs **no server, installation, or account**.

1. [Download this repository](https://github.com/applet-one/productize-your-process/archive/refs/heads/main.zip) and extract it, or clone it:
   ```sh
   git clone https://github.com/applet-one/productize-your-process.git
   cd productize-your-process
   ```
2. Open [`demo/prioboard-viewer.html`](demo/prioboard-viewer.html) in a current desktop browser.
3. Click **Choose folder** and select **`demo/data/`**.
4. Explore opportunities, scores, feedback clusters, and the original evidence behind them.

The browser reads the selected files locally; nothing is uploaded. See the [demo guide](demo/README.md) for browser support and details.

To view the slides, open [productize-your-process.applet.works](https://productize-your-process.applet.works) or [`deck/index.html`](deck/index.html) in your browser.

### Deploy the slide deck

The repository root is a public Applet app that serves only `deck/`, including its images. No demo data is published.

```sh
npm run dev     # package the deck and run locally
npm run deploy  # package the deck and publish with the Applet CLI
```

The build generates `deck-assets.js` from the original deck files; it is intentionally ignored by Git. Sign in with `applet login` before deploying.

## From analysis to a shared app

The priority board evolves through four versions. Each makes more of the workflow usable by the team—not just the person running the AI tools.

| Version | What it adds |
| --- | --- |
| [Offline viewer](demo/prioboard-viewer.html) | Browse local reports, calculated rankings, and source evidence |
| [Hosted viewer](demo/prioboard-viewer/) | A shared Applet with a persistent dataset |
| [Editor](demo/prioboard-editor/) | Priority overrides with explicit reasons, comments, and dataset export |
| [Collaborative board](demo/prioboard-collab/) | Named participants, live updates, and admin/member permissions |

The analysis remains in Markdown files. The apps make its results accessible, inspectable, and actionable. Manual priority decisions stay separate from the calculated scores and original evidence.

For local setup and deployment, follow the README in each app’s directory. **The collaborative board’s name picker is a trusted-demo identity mechanism, not verified authentication.**

## Generate your own analysis

The included Claude Code skills turn raw feedback into structured clusters and opportunity scorecards:

```text
Raw feedback + company context
              ↓
     Feedback synthesis
              ↓
     Opportunity scoring
              ↓
       Shared priority board
```

See [Generate a new run](demo/README.md#generate-a-new-run) for commands and validation steps. The bundled reports are illustrative demo analyses, not newly collected customer research.

## Built with Applet.one

[**Applet.one**](https://applet.one) is used to turn the local workflow into hosted apps the team can use together. This repository includes the app source so you can explore the progression, run it locally, and adapt it to your own process.

**Start with a workflow that already helps you. Make it usable by everyone else.**
