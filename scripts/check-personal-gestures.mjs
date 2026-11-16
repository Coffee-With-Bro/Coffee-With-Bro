import { chromium } from "playwright";
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const run = path.join(root, "ice_with_bro/runs/ui-check");
fs.mkdirSync(run, { recursive: true });
const api = "http://127.0.0.1:8185/api";
const url = "http://127.0.0.1:5175";
const children = [];
let browser;
function start(command, args, options, logName) {
  const log = fs.openSync(path.join(run, logName), "w");
  const child = spawn(command, args, { ...options, windowsHide: true, stdio: ["ignore", log, log] });
  children.push(child); fs.closeSync(log); return child;
}
async function waitFor(address) {
  const started = Date.now();
  while (Date.now() - started < 90000) {
    try { if ((await fetch(address)).ok) return; } catch { /* Wait for the local process to listen. */ }
    if (children.some(c => c.exitCode !== null)) throw new Error("Test server exited; inspect the ui-check logs");
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error("Test server did not become ready: " + address);
}

try {
  const cp = path.join(root, "coffee_with_bro/target/classes") + path.delimiter + fs.readFileSync(path.join(root, "coffee_with_bro/target/training-classpath.txt"), "utf8").trim();
  const javaArgs = ["--enable-native-access=ALL-UNNAMED", "-Xmx1g", "-cp", cp,
    "com.coffeewithbro.coffee_with_bro.CoffeeWithBroApplication", "--server.address=127.0.0.1", "--server.port=8185",
    "--gestures.path=" + path.join(run, "test-library.bin")];
  const argfile = path.join(run, "server-args.txt");
  fs.writeFileSync(argfile, javaArgs.map(a => '"' + a.replaceAll("\\", "/") + '"').join("\n"));
  start("java", ["@" + argfile], { cwd: path.join(root, "coffee_with_bro"), env: { ...process.env, OMP_NUM_THREADS: "2", OPENBLAS_NUM_THREADS: "2" } }, "backend.log");
  start(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", "5175", "--strictPort", "--force"],
    { cwd: path.join(root, "milk_with_bro"), env: { ...process.env, VITE_API_URL: api, VITE_WS_URL: "ws://127.0.0.1:8185/ws/echo" } }, "frontend.log");
  await Promise.all([waitFor(api + "/status"), waitFor(url)]);
  const modelState = await (await fetch(api + "/status")).json();
  if (process.argv.includes("--require-trained")) assert(modelState.modelLoaded, "The evaluated ASL model must load for this check");
  for (const gesture of await (await fetch(api + "/gestures")).json()) {
    if (gesture.label.startsWith("UI-")) await fetch(api + "/gestures?label=" + encodeURIComponent(gesture.label), { method: "DELETE" });
  }
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 960 } });
  let simulateAsl = false;
  await context.routeWebSocket("**/ws/echo", socket => {
    if (!simulateAsl) { socket.connectToServer(); return; }
    socket.send(JSON.stringify({ type: "connection_status", status: "online", modelLoaded: true }));
    socket.onMessage(() => socket.send(JSON.stringify({ label: "A", confidence: .96, modelLoaded: true })));
  });
  const remote = [], errors = [];
  await context.route("**/*", route => {
    const target = new URL(route.request().url());
    if (!["127.0.0.1", "localhost"].includes(target.hostname)) { remote.push(target.href); return route.abort(); }
    if (target.pathname === "/__fixture/hand.jpg") return route.fulfill({ contentType: "image/jpeg", body: fs.readFileSync(path.join(root, "ice_with_bro/data/train/0/P10_0_1000.jpg")) });
    return route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", e => errors.push(e.message));
  // A real dataset hand image becomes a camera stream; MediaPipe itself is not mocked.
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { value: async () => {
      const image = new Image(); image.src = "/__fixture/hand.jpg"; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = 320; canvas.height = 360;
      const ctx = canvas.getContext("2d");
      const draw = () => { ctx.fillStyle = "#e6e2db"; ctx.fillRect(0, 0, 320, 360); if (window.__testShowHand !== false) ctx.drawImage(image, 45, 8, 230, 344); };
      draw(); const stream = canvas.captureStream(15); const timer = setInterval(draw, 66);
      stream.getVideoTracks()[0].addEventListener("ended", () => clearInterval(timer));
      return stream;
    } });
  });
  await page.goto(url);
  await page.getByRole("button", { name: "My symbols & gestures", exact: true }).click();
  await page.getByRole("button", { name: /Turn on camera/ }).first().click();
  await page.waitForFunction(() => document.querySelector(".tracking-status")?.textContent?.includes("hand tracked"), null, { timeout: 60000 });
  console.log("PASS: offline MediaPipe detects the hand in the camera fixture");
  const label = "UI-" + Date.now() + " / Water";
  await page.getByLabel("Symbol name", { exact: true }).fill(label);
  for (let i = 1; i <= 3; i++) {
    await page.getByRole("button", { name: "Record example (3s)", exact: true }).click();
    await page.waitForFunction(({ label, count }) => document.querySelector(".personal-library")?.textContent?.includes(`${label} · ${count} examples`), { label, count: i }, { timeout: 20000 });
  }
  await page.getByRole("button", { name: "Recognize my gesture (3s)", exact: true }).click();
  await page.getByRole("button", { name: "Correct — add to transcript", exact: true }).waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: "Correct — add to transcript", exact: true }).click();
  await page.waitForFunction(name => document.querySelector(".transcript")?.textContent?.includes(name), label);
  assert((await (await fetch(api + "/gestures")).json()).some(g => g.label === label && g.examples === 4));
  console.log("PASS: record three examples, recognize, confirm, persist a fourth example and append transcript");
  await page.screenshot({ path: path.join(run, "desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(run, "mobile.png"), fullPage: true });
  const overflow = await page.evaluate(() => [...document.querySelectorAll("body *")].filter(el => {
    const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1);
  }).map(el => ({ tag: el.tagName, className: el.className, width: el.getBoundingClientRect().width })).slice(0, 15));
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), JSON.stringify(overflow));
  await page.getByRole("button", { name: /Turn off camera/ }).first().click();
  await page.getByRole("button", { name: `Delete ${label}`, exact: true }).click();
  await page.waitForFunction(name => !document.querySelector(".personal-library")?.textContent?.includes(name), label);
  if (modelState.modelLoaded) {
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await page.getByRole("button", { name: "ASL alphabet & digits", exact: true }).click();
    await page.getByRole("button", { name: /Turn on camera/ }).first().click();
    await page.waitForFunction(() => /^[0-9A-Z]$/.test(document.querySelector(".readout-letter")?.textContent?.trim() || ""), null, { timeout: 30000 });
    const prediction = await page.locator(".readout-letter").textContent();
    const confidence = await page.locator(".readout-pct").textContent();
    console.log(`REAL ASL MODEL: hand-image camera fixture predicted ${prediction} at ${confidence}`);
    assert.equal(prediction.trim(), "0", "The trained model should recognize the dataset's 0-sign camera fixture");
    await page.getByRole("button", { name: /Turn off camera/ }).first().click();
    console.log("PASS: evaluated DL4J model loads and recognizes the hand-region camera stream through the real WebSocket");
  }
  // Test transcript stabilization with a simulated ASL response, not an accuracy claim.
  simulateAsl = true;
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page.getByRole("button", { name: "ASL alphabet & digits", exact: true }).click();
  await page.getByRole("button", { name: /Turn on camera/ }).first().click();
  await page.waitForFunction(() => document.querySelector(".transcript")?.textContent?.trim() === "A");
  await page.waitForTimeout(3000);
  assert.equal((await page.locator(".transcript").textContent()).trim(), "A");
  await page.evaluate(() => { window.__testShowHand = false; });
  await page.waitForFunction(() => document.querySelector(".tracking-status")?.textContent?.includes("No hand detected"));
  await page.evaluate(() => { window.__testShowHand = true; });
  await page.waitForFunction(() => document.querySelector(".transcript")?.textContent?.trim() === "AA");
  await page.getByRole("button", { name: /Turn off camera/ }).first().click();
  console.log("PASS: a held sign commits once; lowering and raising the hand permits a repeated letter (simulated ASL response)");
  assert.equal(remote.length, 0, "The translator attempted external network requests: " + remote.join(", "));
  assert.deepEqual(errors, []);
  console.log("PASS: deletion, camera stop, mobile layout, no page errors and no external requests");
} finally {
  await browser?.close();
  for (const child of children.reverse()) {
    if (!child.pid || child.exitCode !== null) continue;
    try {
      if (process.platform === "win32") execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      else child.kill("SIGTERM");
    } catch { /* Process may already have exited. */ }
  }
}
