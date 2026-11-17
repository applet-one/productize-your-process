import { limits } from "../shared/paths.js";

async function jsonRequest(options) {
  const response = await fetch("/api/dataset", {
    cache: "no-store",
    ...options,
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || `Request failed (${response.status})`);
  return body.dataset;
}

export function fetchDataset() {
  return jsonRequest();
}
export function replaceDataset(dataset) {
  const body = JSON.stringify(dataset);
  if (new TextEncoder().encode(body).length > limits.requestBytes)
    throw new Error("Encoded upload exceeds 32 MB");
  return jsonRequest({
    method: "PUT",
    headers: { "content-type": "application/json" },
    body,
  });
}
