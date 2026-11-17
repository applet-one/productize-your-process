const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const net = require("node:net");
const { spawn } = require("node:child_process");
const { chromium } = require("playwright");
const { unzipSync, strFromU8 } = require("fflate");

const root = path.resolve(__dirname, "..");
const demo = path.resolve(root, "../data");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
(async () => {
  const scratch = await fs.mkdtemp(
    path.join(os.tmpdir(), "priority-applet-test-"),
  );
  const project = path.join(scratch, "project");
  await fs.cp(root, project, {
    recursive: true,
    filter: (source) =>
      !["node_modules", ".applet", ".git"].includes(path.basename(source)),
  });
  await fs.symlink(
    path.join(root, "node_modules"),
    path.join(project, "node_modules"),
  );
  const probe = net.createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  let process,
    browser,
    output = "";
  async function start() {
    process = spawn("applet", ["dev", "--port", String(port)], {
      cwd: project,
      env: {
        ...global.process.env,
        APPLET_INIT_CWD: project,
        INIT_CWD: project,
        PWD: project,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    process.stdout.on("data", (data) => {
      output += data;
    });
    process.stderr.on("data", (data) => {
      output += data;
    });
    for (let i = 0; i < 200; i++) {
      if (process.exitCode !== null) throw new Error(output);
      try {
        if ((await fetch(`${origin}/api/dataset`)).ok) return;
      } catch {}
      await sleep(100);
    }
    throw new Error(`Local runtime did not start: ${output}`);
  }
  async function stop() {
    if (!process || process.exitCode !== null) return;
    const exited = new Promise((resolve) => process.once("exit", resolve));
    process.kill("SIGTERM");
    await exited;
  }
  try {
    await start();
    browser = await chromium.launch({
      executablePath: processEnvChrome(),
      headless: true,
    });
    const page = await browser.newPage({ acceptDownloads: true });
    const errors = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
      console.error("Browser error:", error.message);
    });
    const cspErrors = [];
    page.on("console", (message) => {
      if (/Content Security Policy|violates.*directive/i.test(message.text()))
        cspErrors.push(message.text());
    });
    await page.goto(origin);
    await page
      .getByRole("button", { name: "Upload folder", exact: true })
      .waitFor();
    await page.waitForFunction(
      () => !document.querySelector("#open-folder").disabled,
    );
    assert.equal(await page.locator("#download").isDisabled(), true);
    let files = [];
    async function collect(relative) {
      for (const entry of await fs.readdir(path.join(demo, relative), {
        withFileTypes: true,
      })) {
        const child = `${relative}/${entry.name}`;
        if (entry.isDirectory()) await collect(child);
        else if (entry.name.endsWith(".md")) files.push(child);
      }
    }
    for (const folder of ["input", "context", "output"]) await collect(folder);
    const uploadRoot = path.join(scratch, "demo");
    for (const relative of files) {
      await fs.mkdir(path.dirname(path.join(uploadRoot, relative)), {
        recursive: true,
      });
      await fs.copyFile(
        path.join(demo, relative),
        path.join(uploadRoot, relative),
      );
    }
    let confirmations = 0;
    page.on("dialog", async (dialog) => {
      confirmations++;
      await dialog.accept();
    });
    await page.locator("#folder-input").setInputFiles(uploadRoot);
    await page.waitForFunction(
      () => document.querySelectorAll(".card").length === 6,
    );
    assert.equal(confirmations, 1);
    assert.match(
      await page.locator("#status").textContent(),
      /saved Markdown files/,
    );
    const saved = (await (await fetch(`${origin}/api/dataset`)).json()).dataset;
    assert.equal(saved.files.length, files.length);
    await page.reload();
    await page.waitForFunction(
      () => document.querySelectorAll(".card").length === 6,
    );
    await page.locator(".card summary").first().click();
    await page.locator(".card .source-link").first().click();
    await page.locator("#source-dialog[open] mark").waitFor();
    await page.getByRole("button", { name: "Close source" }).click();
    await page.getByRole("button", { name: /^Clusters/ }).click();
    assert.equal(await page.locator(".card").count(), 6);
    for (const name of ["Inputs", "Context", "Reports"]) {
      await page
        .getByRole("button", { name: new RegExp(`^${name}`), exact: false })
        .first()
        .click();
      await page.locator(".file-list").waitFor();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.setViewportSize({ width: 1280, height: 900 });
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#download").click();
    const download = await downloadPromise;
    const zip = unzipSync(await fs.readFile(await download.path()));
    assert.equal(Object.keys(zip).length, files.length);
    for (const file of saved.files)
      assert.equal(strFromU8(zip[file.path]), file.content);
    const bad = await fetch(`${origin}/api/dataset`, {
      method: "PUT",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({
        name: "bad",
        files: [{ path: "../bad.md", content: "bad" }],
      }),
    });
    assert.equal(bad.status, 400);
    assert.deepEqual(
      (await (await fetch(`${origin}/api/dataset`)).json()).dataset,
      saved,
    );
    const forbidden = await fetch(`${origin}/api/dataset`, {
      method: "PUT",
      headers: {
        origin: "https://evil.example",
        "content-type": "application/json",
      },
      body: "{}",
    });
    assert.equal(forbidden.status, 403);
    await stop();
    await start();
    assert.deepEqual(
      (await (await fetch(`${origin}/api/dataset`)).json()).dataset,
      saved,
    );
    // Replacement deletes absent files, accepts raw reports even when not structurally valid,
    // and renders uploaded text without executing HTML.
    await fs.rm(uploadRoot, { recursive: true });
    await fs.mkdir(path.join(uploadRoot, "input"), { recursive: true });
    await fs.writeFile(
      path.join(uploadRoot, "input", "only.md"),
      "<script>window.injected = true</script>",
    );
    await page.reload();
    await page.waitForFunction(
      () => !document.querySelector("#open-folder").disabled,
    );
    await page.locator("#folder-input").setInputFiles(uploadRoot);
    await page.waitForFunction(
      () => document.querySelector("#input-count").textContent === "1",
    );
    assert.equal(confirmations, 2);
    const replacement = (await (await fetch(`${origin}/api/dataset`)).json())
      .dataset;
    assert.equal(replacement.files.length, 1);
    await page.getByRole("button", { name: /^Inputs/ }).click();
    await page.getByRole("button", { name: "only.md", exact: true }).click();
    assert.match(await page.locator(".reader pre").textContent(), /<script>/);
    assert.equal(await page.evaluate(() => window.injected), undefined);
    // Cancelling the one global confirmation leaves the saved dataset unchanged.
    page.removeAllListeners("dialog");
    page.on("dialog", (dialog) => dialog.dismiss());
    await page.locator("#folder-input").setInputFiles(uploadRoot);
    await page.waitForFunction(
      () => !document.querySelector("#open-folder").disabled,
    );
    assert.deepEqual(
      (await (await fetch(`${origin}/api/dataset`)).json()).dataset,
      replacement,
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(cspErrors, []);
    console.log(
      "PASS: upload confirmation, viewer parity, reload/restart persistence, ZIP round-trip, replacement, cancellation, validation, XSS, CSP, and mobile layout",
    );
  } finally {
    await browser?.close();
    await stop();
    await fs.rm(scratch, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function processEnvChrome() {
  return (
    process.env.CHROME_PATH ||
    (process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : undefined)
  );
}
