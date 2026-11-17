export function total(o) {
  return Object.values(o.dimensions).reduce((a, d) => a + d.score, 0);
}
export function ranked(items) {
  return [...items]
    .sort(
      (a, b) => total(b) - total(a) || a.cluster_id.localeCompare(b.cluster_id),
    )
    .map((o, i, all) => ({
      opportunity: o,
      rank:
        i > 0 && total(o) === total(all[i - 1])
          ? all.findIndex((x) => total(x) === total(o)) + 1
          : i + 1,
    }));
}
