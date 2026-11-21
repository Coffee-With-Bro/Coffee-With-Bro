import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

const directory = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [], remote = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (/^https?:/.test(request.url())) remote.push(request.url()); });
  await page.goto(pathToFileURL(path.join(decodeURIComponent(directory), "report.html")).href);
  assert.equal(await page.locator("h1").count(), 1);
  if (await page.locator("#java-gpu-results").count()) {
    await page.setViewportSize({ width: 1280, height: 1500 });
    await page.screenshot({ path: path.join(decodeURIComponent(directory), "report-java-cuda-preview.png") });
    await page.setViewportSize({ width: 1280, height: 1000 });
  }
  assert.equal(await page.locator("table tbody tr").count(), 10);
  await page.locator("#epoch").evaluate(element => { element.value = "11"; element.dispatchEvent(new Event("input")); });
  assert((await page.locator("#epoch-readout").textContent()).includes("93.5938%"));
  await page.getByRole("button", { name: "Class H", exact: true }).click();
  assert((await page.locator("#train-name").textContent()).includes("P2_H_155"));
  assert(await page.locator("#train-image").evaluate(element => element.complete && element.naturalWidth > 0));
  await page.screenshot({ path: path.join(decodeURIComponent(directory), "report-preview.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  assert.deepEqual(errors, []); assert.deepEqual(remote, []);
  console.log("PASS: report renders, epoch/pair controls work, images load, mobile width fits, and no external requests or page errors");
} finally { await browser.close(); }
