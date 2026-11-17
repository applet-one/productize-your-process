import { zipSync, strToU8 } from "fflate";
import { OverrideError } from "./storage.js";
import { limits, validateDataset } from "../shared/paths.js";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function readJson(request) {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new HttpError(415, "Expected application/json");
  const length = Number(request.headers.get("content-length"));
  if (length > limits.requestBytes)
    throw new HttpError(413, "Upload request exceeds 32 MB");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Missing request body");
  const chunks = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > limits.requestBytes) {
      await reader.cancel();
      throw new HttpError(413, "Upload request exceeds 32 MB");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch {
    throw new HttpError(400, "Invalid UTF-8 JSON body");
  }
}

export async function routeApi(request, store) {
  const url = new URL(request.url);
  if (url.pathname === "/api/dataset" && request.method === "GET")
    return Response.json({ dataset: store.read() });
  if (
    (url.pathname === "/api/dataset" && request.method === "PUT") ||
    (url.pathname === "/api/comments" &&
      ["POST", "DELETE"].includes(request.method)) ||
    (url.pathname === "/api/overrides" &&
      ["PUT", "DELETE"].includes(request.method))
  ) {
    // Hosted authentication is supplied by private Applet access. Reject cross-origin browser writes too.
    if (
      request.headers.get("origin") !== url.origin ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      throw new HttpError(403, "Same-origin upload required");
    const input = await readJson(request);
    if (["/api/overrides", "/api/comments"].includes(url.pathname)) {
      try {
        return Response.json(
          url.pathname === "/api/comments"
            ? request.method === "DELETE"
              ? store.deleteComment(input)
              : store.addComment(input)
            : store.updateOverride(input, request.method === "DELETE"),
        );
      } catch (error) {
        if (error instanceof OverrideError)
          throw new HttpError(error.status, error.message);
        throw error;
      }
    }
    try {
      validateDataset(input);
    } catch (error) {
      throw new HttpError(400, error.message);
    }
    return Response.json({ dataset: store.replace(input) });
  }
  if (url.pathname === "/api/dataset/download" && request.method === "GET") {
    const dataset = store.read();
    if (!dataset) throw new HttpError(404, "No saved dataset");
    const entries = Object.create(null);
    for (const file of dataset.files)
      entries[file.path] = strToU8(file.content);
    // No compression avoids unnecessary CPU work for these small, text-only exports.
    return new Response(zipSync(entries, { level: 0 }), {
      headers: {
        "content-type": "application/zip",
        "content-disposition":
          'attachment; filename="priority-board-dataset.zip"',
      },
    });
  }
  if (
    [
      "/api/dataset",
      "/api/dataset/download",
      "/api/overrides",
      "/api/comments",
    ].includes(url.pathname)
  )
    return new Response("Method not allowed", { status: 405 });
  throw new HttpError(404, "Not found");
}
