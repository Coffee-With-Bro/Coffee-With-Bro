import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "milk_with_bro");
const backendDir = path.join(rootDir, "coffee_with_bro");

const isWindows = process.platform === "win32";
const mavenCmd = isWindows ? ".\\mvnw.cmd" : "./mvnw";

console.log("=== Starting Coffee With Bro (Frontend + Server) ===\n");

const frontend = spawn("npm", ["run", "dev"], {
  cwd: frontendDir,
  shell: true,
  stdio: "inherit",
});

const server = spawn(mavenCmd, ["spring-boot:run"], {
  cwd: backendDir,
  shell: true,
  stdio: "inherit",
});

function cleanup() {
  console.log("\nShutting down frontend and server...");
  try {
    frontend.kill();
  } catch {}
  try {
    server.kill();
  } catch {}
  process.exit();
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
