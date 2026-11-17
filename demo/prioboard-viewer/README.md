# Priority board · Applet

A private, persistent port of [`../prioboard-viewer.html`](../prioboard-viewer.html). Analysis still runs locally. Markdown/YAML stays the report contract; SQLite stores original files, not normalized clusters or scorecards. File content is chunked internally to stay below SQLite row-size limits, then reassembled without altering the text.

## Run locally

Requires Node.js 22.13+ (for the SQLite unit tests), npm, and the Applet CLI (`@applet-one/cli`, tested with 0.4.6).

```sh
cd demo/prioboard-viewer
npm ci
npm run dev
```

Open the local URL printed by Applet (normally `http://127.0.0.1:8787`). Local development is **not authenticated**; keep the default loopback host. State persists in `.applet/dev/`. Restart `npm run dev` after source changes; it rebuilds browser assets before starting the Worker.

## Upload and browse

1. Click **Upload folder** and select **`demo/data/`**, not `demo/`. This folder contains only the dataset, so the browser does not enumerate application code or dependencies.
2. Confirm the single upload prompt. Only `.md` files under `context/`, `input/`, and `output/` are uploaded. Hidden files and other application files are excluded.
3. Browse Opportunities, Clusters, Inputs, Context, and Reports. Reloading the page restores the saved dataset.
4. After running the local analysis skills or changing files, click **Replace dataset** and select the complete folder again.

Each confirmed upload **replaces the entire saved snapshot**, including deleting files absent from the new folder. The update is transactional: invalid uploads or database failures retain the previous saved snapshot. If the connection is interrupted after sending an upload, reload to check whether it committed before retrying.

Limits: 1,000 Markdown files, 5 MiB per file, 25 MiB total UTF-8 text, and 32 MiB for the encoded JSON request. JSON escaping can make the encoded request larger than the source files. The server independently checks paths, file types, counts, and sizes, and rejects cross-origin writes.

Report validation remains viewer-side. An invalid report can be saved and browsed as raw Markdown, but does not produce structured cards. Existing YAML safety checks, verbatim-quotation checks, tied ranking, and source highlighting are preserved. The original demo's analysis-specific validation constraints are retained; see [`../SCHEMA.md`](../SCHEMA.md). The Python validator remains the authoritative content check for locally generated reports.

## Download

**Download dataset** exports a ZIP containing the original `context/`, `input/`, and `output/` paths and Markdown text. Unzip into a folder to use with the local skills or upload it again. The ZIP contains only the currently saved snapshot, not the app's code or historical versions. ZIP archives are not accepted as uploads: select the extracted folder.

Files are stored as UTF-8 text; line endings and Markdown text are preserved. Non-UTF-8 source encodings are not supported. There is no historical versioning: old reports resolve evidence against the files in the current snapshot, just like the offline viewer.

## Validate and test

```sh
npm test
npm run check
npm run test:browser
```

The browser suite uses Playwright and a local Applet runtime in a temporary project with an isolated database. On macOS it uses installed Google Chrome. Elsewhere, run `npx playwright install chromium`, or set `CHROME_PATH` to a compatible browser executable. It does not upload or deploy anything remotely.

Coverage includes the original demo reports, YAML restrictions, evidence validation, tied ranks, upload bounds, same-origin writes, transactional rollback, ZIP text round-trip, reload/runtime-restart persistence, replacement/deletion, confirmation/cancellation, narrow layout, CSP, and HTML injection safety.

Run `npm run format` to format source files.

## Deploy privately

```sh
applet login             # only if not already signed in
npm run deploy
```

`applet.jsonc` requests private access for a new app. Applet enforces the hosted sign-in boundary; no separate application login is implemented. Existing hosted access is preserved by deployment: inspect it with `applet access`, and use `applet access private` if necessary. Do not make an app containing customer feedback public.

Use ordinary `applet deploy` via the npm script. The app bundles npm dependencies, so Applet's dependency-free chat source workflows (`applet push`, `deploy --sync-source`) are not supported by this layout. Code deployment does not upload a dataset; data is uploaded through the browser after deployment.

Applet's single-class app state backup is separate from **Download dataset**; the CLI currently limits its operational backup export to 10 MiB. Do not rely on it as the only export path for a dataset near the upload limit.

## Layout

```text
app.js                 Applet Durable Object entry and security headers
applet.jsonc           Private hosting settings
client/
  index.html           Page shell and licensed Lucide SVG symbols
  styles.css           Responsive styles
  main.js              Startup, upload confirmation, download action
  api.js               Same-origin API client
  dataset.js           Folder reading and dataset state transitions
  state.js             Viewer state and report cache
  dom.js               Safe DOM helpers
  ui.js                Navigation and page rendering
  components/          Toolbar and source dialog/evidence rendering
  views/               Opportunity/cluster cards and raw-file browser
server/
  routes.js            Dataset read, replacement, and ZIP download
  storage.js           SQLite file store and transactional replacement
shared/
  paths.js             Upload policy and safe logical paths
  reports.js           Existing YAML parsing and report validation
  ranking.js           Derived totals and tied ranking
scripts/build.js       esbuild browser bundle → generated/assets.js
tests/                 Unit, SQLite, and browser integration tests
```

The build packages HTML, CSS, and browser JavaScript into a generated module served by the Worker. No CDN or runtime frontend framework is needed. Generated assets, dependencies, and local state are git-ignored. `../prioboard-viewer.html` remains unchanged as the standalone offline reference.
