import { $, el, add, button } from "../dom.js";
import { state, dimensions, getReport } from "../state.js";
import { total, ranked } from "../../shared/ranking.js";
import { sourceLink, evidence, notes } from "../components/source-dialog.js";
import { setView } from "../ui.js";
import { runPaths } from "../state.js";
export function renderBoard() {
  const content = $("#content"),
    p = runPaths();
  const cr = getReport(p.clusters, "feedback_clusters");
  if (!cr.data) {
    emptyReport("feedback clusters", p.clusters, cr.error);
    return;
  }
  $("#cluster-count").textContent = cr.data.clusters.length;
  if (state.view === "clusters") {
    cr.data.clusters.forEach((c, i) => {
      const card = el("article", "card"),
        head = el("div", "card-head");
      const body = add(
        el("div"),
        el("h2", "", c.title),
        el(
          "div",
          "subtitle",
          `${c.mentions.length} independent voices · ${c.evidence.length} quotes · ${new Set(c.evidence.map((e) => e.source)).size} source files`,
        ),
        el("p", "summary", c.summary),
      );
      add(head, el("div", "rank", String(i + 1)), body);
      add(card, head);
      const details = el("details");
      add(details, el("summary", "", "View evidence and contradictions"));
      const inner = el("div", "detail");
      add(
        inner,
        el("div", "small muted", c.mentions.map((m) => m.label).join(" · ")),
      );
      evidence(inner, c);
      add(details, inner);
      add(card, details);
      add(content, card);
    });
    notes(content, cr.data.outliers, "Other / individual cases");
    add(
      content,
      sourceLink(p.clusters, "", "Read full cluster report (raw Markdown)"),
    );
    return;
  }
  const sr = getReport(p.opportunities, "opportunity_scorecard");
  if (!sr.data) {
    emptyReport("opportunity scorecards", p.opportunities, sr.error);
    add(
      content,
      button("Browse available clusters", () => setView("clusters")),
    );
    return;
  }
  add(
    content,
    el(
      "p",
      "small muted",
      "Ranked by total score. Equal totals share a rank. Product potential is not the same as short-term revenue.",
    ),
  );
  ranked(sr.data.opportunities).forEach(({ opportunity: o, rank }) => {
    const c = cr.data.clusters.find((c) => c.id === o.cluster_id),
      card = el("article", `card${rank === 1 ? " top" : ""}`),
      head = el("div", "card-head");
    const info = add(
      el("div"),
      el("h2", "", c.title),
      el(
        "div",
        "subtitle",
        `${c.mentions.length} independent voices · ${c.evidence.length} supporting quotes`,
      ),
    );
    const score = el("div", "score");
    add(
      score,
      document.createTextNode(String(total(o))),
      el("small", "", " / 15"),
    );
    const bar = el("div", "bar"),
      fill = el("span");
    fill.style.width = `${(total(o) / 15) * 100}%`;
    add(score, add(bar, fill));
    add(head, el("div", "rank", String(rank)), info, score);
    add(card, head);
    const details = el("details");
    add(details, el("summary", "", "View scorecard, evidence, and conclusion"));
    const inner = el("div", "detail");
    Object.entries(dimensions).forEach(([key, label]) => {
      const d = o.dimensions[key],
        row = el("div", "dimension");
      add(
        row,
        add(
          el("strong"),
          el("span", "", label),
          el("span", "", `${d.score}/5`),
        ),
        el("p", "", d.rationale),
      );
      d.references.forEach((r) => {
        const q = el("div", "quote");
        add(q, el("p", "small", `“${r.quote}”`), sourceLink(r.source, r.quote));
        add(row, q);
      });
      add(inner, row);
    });
    add(
      inner,
      el("h3", "", "Conclusion"),
      el("p", "conclusion", o.conclusion),
      el("h3", "", "Feedback cluster"),
      el("p", "", c.summary),
    );
    evidence(inner, c);
    add(details, inner);
    add(card, details);
    add(content, card);
  });
  add(
    content,
    sourceLink(
      p.opportunities,
      "",
      "Read full opportunity report (raw Markdown)",
    ),
  );
}
function emptyReport(label, p, error) {
  const box = el("div", "empty");
  add(
    box,
    el("h2", "", `No valid ${label} for this run`),
    el(
      "p",
      "",
      state.files.has(p)
        ? `Validation failed: ${error}`
        : "This dated folder has no v2 report yet. Existing reports are still available in Reports.",
    ),
    el("code", "", p),
    el(
      "p",
      "small muted",
      "Run the corresponding -2 skill locally, then use Replace dataset to upload the whole folder.",
    ),
  );
  add($("#content"), box);
}
