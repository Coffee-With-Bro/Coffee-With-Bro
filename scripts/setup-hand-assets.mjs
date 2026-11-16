import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "milk_with_bro/package.json"));
const source = path.dirname(require.resolve("@mediapipe/tasks-vision"));
const destination = path.join(root, "milk_with_bro/public/mediapipe");
const url = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const modelHash = "fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1";
fs.mkdirSync(path.join(destination, "wasm"), { recursive: true });
for (const name of fs.readdirSync(path.join(source, "wasm"))) {
  fs.copyFileSync(path.join(source, "wasm", name), path.join(destination, "wasm", name));
}
const model = path.join(destination, "hand_landmarker.task");
if (!fs.existsSync(model) && process.argv.includes("--download-model")) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Model download failed: " + response.status);
  fs.writeFileSync(model, Buffer.from(await response.arrayBuffer()));
}
const sha = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
if (!fs.existsSync(model) || sha(model) !== modelHash) throw new Error("Hand model is missing or changed; use --download-model to fetch the versioned model");
const names = ["hand_landmarker.task", ...fs.readdirSync(path.join(source, "wasm")).map(name => "wasm/" + name)];
const metadata = { package: "@mediapipe/tasks-vision", version: JSON.parse(fs.readFileSync(path.join(source, "package.json"))).version,
  model_url: url, sha256: Object.fromEntries(names.map(name => [name, sha(path.join(destination, name))])) };
fs.writeFileSync(path.join(destination, "assets.json"), JSON.stringify(metadata, null, 2) + "\n");
console.log("Local hand-tracking assets verified: MediaPipe " + metadata.version);
