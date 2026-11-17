import { DurableObject } from "cloudflare:workers";
import { contacts, internalVoices } from "./contacts.js";
import { inputs } from "./generated/inputs.js";

// whom-we-talked-to
// Lists the people we have talked to and serves the raw input files the list is based on.
// The app is read-only: all data ships with the code, so it keeps no state.

const esc = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const fileId = (path) => "file-" + path.replace(/[^a-z0-9]+/gi, "-");

const formatDate = (iso) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export class App extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contacts") return Response.json({ contacts, internalVoices });
    if (url.pathname === "/api/inputs") return Response.json(inputs.map(({ path }) => ({ path })));
    if (url.pathname.startsWith("/input/")) {
      const path = decodeURIComponent(url.pathname.slice("/input/".length));
      const file = inputs.find((f) => f.path === path);
      if (!file) return new Response("Not found", { status: 404 });
      return new Response(file.content, { headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    if (url.pathname !== "/") return new Response("Not found", { status: 404 });
    return new Response(page(), { headers: { "content-type": "text/html; charset=utf-8" } });
  }
}

function contactCard(c) {
  const touchpoints = c.touchpoints
    .map(
      (t) => `<li><span class="date">${esc(formatDate(t.date))}</span>
        <span>${esc(t.kind)} with ${esc(t.withWhom)}</span>
        <a href="#${fileId(t.source)}">${esc(t.source.split("/").pop())}</a></li>`,
    )
    .join("");
  return `<article class="card">
    <header>
      <h3>${esc(c.name)}</h3>
      <span class="tag ${c.relationship === "Customer" ? "customer" : "prospect"}">${esc(c.relationship)}</span>
    </header>
    <p class="role">${esc(c.role)} · ${esc(c.company)}</p>
    <ul class="touchpoints">${touchpoints}</ul>
    <p class="topics">${c.topics.map((t) => `<span>${esc(t)}</span>`).join("")}</p>
  </article>`;
}

function page() {
  const companies = new Set(contacts.map((c) => c.company)).size;
  const conversations = new Set(contacts.flatMap((c) => c.touchpoints.map((t) => t.date + t.kind + t.source))).size;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Whom we talked to</title>
  <style>
    :root { --bg: #f7f6f3; --card: #fff; --ink: #1d1d1f; --muted: #6b6b70; --line: #e3e1dc; --accent: #2f5fd0; --ok: #1f7a4d; --warn: #a15c07; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #17181a; --card: #212326; --ink: #ececee; --muted: #a0a0a8; --line: #34363b; --accent: #8fb0ff; --ok: #6fd3a0; --warn: #f0b660; }
    }
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--ink); max-width: 56rem; margin: 0 auto; padding: 2rem 1rem 4rem; line-height: 1.45; }
    h1 { margin: 0 0 .25rem; font-size: 1.9rem; }
    h2 { margin: 2.5rem 0 .75rem; font-size: 1.15rem; }
    a { color: var(--accent); }
    .lede { color: var(--muted); margin: 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); gap: .75rem; }
    .card { background: var(--card); border: 1px solid var(--line); border-radius: .6rem; padding: 1rem; }
    .card header { display: flex; justify-content: space-between; align-items: center; gap: .5rem; }
    .card h3 { margin: 0; font-size: 1.05rem; }
    .role { margin: .15rem 0 .75rem; color: var(--muted); font-size: .9rem; }
    .tag { font-size: .72rem; font-weight: 600; padding: .1rem .5rem; border-radius: 1rem; border: 1px solid currentColor; white-space: nowrap; }
    .customer { color: var(--ok); } .prospect { color: var(--warn); }
    .touchpoints { list-style: none; margin: 0; padding: 0; font-size: .88rem; }
    .touchpoints li { display: grid; grid-template-columns: 5.6rem 1fr; column-gap: .5rem; padding: .3rem 0; border-top: 1px solid var(--line); }
    .touchpoints a { grid-column: 2; font-size: .8rem; }
    .date { color: var(--muted); font-variant-numeric: tabular-nums; }
    .topics { display: flex; flex-wrap: wrap; gap: .3rem; margin: .75rem 0 0; }
    .topics span, .chips span { font-size: .78rem; background: var(--bg); border: 1px solid var(--line); border-radius: .35rem; padding: .1rem .4rem; }
    table { width: 100%; border-collapse: collapse; background: var(--card); border: 1px solid var(--line); border-radius: .6rem; font-size: .9rem; }
    td { padding: .45rem .75rem; border-top: 1px solid var(--line); vertical-align: top; }
    tr:first-child td { border-top: 0; }
    .chips { display: flex; flex-wrap: wrap; gap: .3rem; }
    details { background: var(--card); border: 1px solid var(--line); border-radius: .6rem; margin-bottom: .5rem; }
    summary { cursor: pointer; padding: .7rem 1rem; font-weight: 600; }
    summary small { font-weight: 400; color: var(--muted); margin-left: .5rem; }
    pre { margin: 0; padding: 1rem; border-top: 1px solid var(--line); white-space: pre-wrap; overflow-wrap: anywhere; font: .82rem/1.5 ui-monospace, monospace; }
    .raw { float: right; font-weight: 400; font-size: .8rem; }
  </style>
</head>
<body>
  <h1>Whom we talked to</h1>
  <p class="lede">${contacts.length} people at ${companies} companies, across ${conversations} conversations — taken from ${inputs.length} input files.</p>

  <h2>Customers and prospects</h2>
  <section class="grid">${contacts.map(contactCard).join("")}</section>

  <h2>Internal voices in the inputs</h2>
  <table>${internalVoices
    .map((v) => `<tr><td>${esc(v.name)}</td><td><div class="chips">${v.where.map((w) => `<span>${esc(w)}</span>`).join("")}</div></td></tr>`)
    .join("")}</table>

  <h2>Input files</h2>
  ${inputs
    .map(
      (f) => `<details id="${fileId(f.path)}">
    <summary>${esc(f.path)}<small>${f.content.split("\n").length} lines</small><a class="raw" href="/input/${encodeURI(f.path)}">raw</a></summary>
    <pre>${esc(f.content)}</pre>
  </details>`,
    )
    .join("")}
  <script>
    // Open the matching input file when a source link is followed.
    function openTarget() {
      const el = location.hash && document.getElementById(location.hash.slice(1));
      if (el && el.tagName === "DETAILS") { el.open = true; el.scrollIntoView(); }
    }
    addEventListener("hashchange", openTarget);
    openTarget();
  </script>
</body>
</html>`;
}
