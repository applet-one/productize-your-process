import { DurableObject } from "cloudflare:workers";

// hello-koelle
// One App class holds the app's state (SQLite via this.sql) and serves every request.
export class App extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS alaaf (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL)");
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/alaaf" && request.method === "POST") {
      this.sql.exec("INSERT INTO alaaf (at) VALUES (?)", new Date().toISOString());
      return Response.json({ alaaf: this.count() });
    }
    if (url.pathname === "/api/alaaf") return Response.json({ alaaf: this.count() });
    if (url.pathname !== "/") return new Response("Not found", { status: 404 });
    return new Response(this.page(), { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  count() {
    return this.sql.exec("SELECT COUNT(*) AS n FROM alaaf").one().n;
  }

  page() {
    return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hello Kölle</title>
  <style>
    :root { --red: #e30613; --ink: #1d1d1f; --paper: #fff; --muted: #6b6b70; }
    @media (prefers-color-scheme: dark) {
      :root { --ink: #f5f5f7; --paper: #17171a; --muted: #a1a1a8; }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center;
      font-family: system-ui, sans-serif; color: var(--ink); background: var(--paper);
      border-top: 12px solid var(--red); border-bottom: 12px solid var(--red);
      padding: 2rem 1rem; text-align: center;
    }
    h1 { font-size: clamp(2.5rem, 10vw, 5rem); margin: 0 0 .5rem; letter-spacing: -.02em; }
    h1 span { color: var(--red); }
    p { color: var(--muted); margin: .5rem 0 1.5rem; font-size: 1.125rem; }
    strong { color: var(--ink); font-variant-numeric: tabular-nums; }
    button {
      font: inherit; font-weight: 600; font-size: 1.25rem; cursor: pointer;
      padding: .75rem 2rem; border: 0; border-radius: 999px;
      color: #fff; background: var(--red);
    }
    button:active { transform: scale(.97); }
  </style>
</head>
<body>
  <main>
    <h1>Hello <span>Kölle</span>!</h1>
    <p>Et hätt noch immer jot jejange.</p>
    <button id="alaaf">Kölle Alaaf!</button>
    <p><strong id="count">${this.count()}</strong> mol Alaaf jerofe</p>
  </main>
  <script>
    document.getElementById("alaaf").addEventListener("click", async () => {
      const response = await fetch("/api/alaaf", { method: "POST" });
      const data = await response.json();
      document.getElementById("count").textContent = data.alaaf;
    });
  </script>
</body>
</html>`;
  }
}
