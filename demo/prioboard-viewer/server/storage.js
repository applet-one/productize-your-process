import { validateDataset } from "../shared/paths.js";

export class DatasetStorage {
  constructor(storage) {
    this.storage = storage;
    this.sql = storage.sql;
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS dataset_metadata (id INTEGER PRIMARY KEY CHECK (id = 1), name TEXT NOT NULL, uploaded_at TEXT NOT NULL)",
    );
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS dataset_files (path TEXT PRIMARY KEY)",
    );
    // Keep each row well below Durable Object SQLite's row/string size limits.
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS dataset_chunks (path TEXT NOT NULL REFERENCES dataset_files(path), chunk_index INTEGER NOT NULL, content TEXT NOT NULL, PRIMARY KEY (path, chunk_index))",
    );
  }

  read() {
    const meta = this.sql
      .exec(
        "SELECT name, uploaded_at AS uploadedAt FROM dataset_metadata WHERE id = 1",
      )
      .toArray()[0];
    if (!meta) return null;
    const files = new Map(
      this.sql
        .exec("SELECT path FROM dataset_files ORDER BY path")
        .toArray()
        .map(({ path }) => [path, { path, content: "" }]),
    );
    for (const chunk of this.sql
      .exec(
        "SELECT path, content FROM dataset_chunks ORDER BY path, chunk_index",
      )
      .toArray())
      files.get(chunk.path).content += chunk.content;
    return { ...meta, files: [...files.values()] };
  }

  replace(input) {
    const dataset = validateDataset(input);
    const uploadedAt = new Date().toISOString();
    this.storage.transactionSync(() => {
      this.sql.exec("DELETE FROM dataset_chunks");
      this.sql.exec("DELETE FROM dataset_files");
      for (const file of dataset.files) {
        this.sql.exec("INSERT INTO dataset_files (path) VALUES (?)", file.path);
        let index = 0;
        for (let start = 0; start < file.content.length;) {
          let end = Math.min(start + 64 * 1024, file.content.length);
          // Do not split a Unicode surrogate pair across SQLite strings.
          const last = file.content.charCodeAt(end - 1);
          if (end < file.content.length && last >= 0xd800 && last <= 0xdbff)
            end--;
          this.sql.exec(
            "INSERT INTO dataset_chunks (path, chunk_index, content) VALUES (?, ?, ?)",
            file.path,
            index++,
            file.content.slice(start, end),
          );
          start = end;
        }
      }
      this.sql.exec(
        "INSERT INTO dataset_metadata (id, name, uploaded_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, uploaded_at = excluded.uploaded_at",
        dataset.name,
        uploadedAt,
      );
    });
    return {
      name: dataset.name,
      uploadedAt,
      fileCount: dataset.files.length,
      bytes: dataset.bytes,
    };
  }
}
