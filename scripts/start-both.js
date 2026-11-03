import { spawn, exec } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "milk_with_bro");
const backendDir = path.join(rootDir, "coffee_with_bro");

const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";
const mavenCmd = isWindows ? ".\\mvnw.cmd" : "./mvnw";

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  let candidate = "localhost";
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        if (!net.address.startsWith("169.254.")) {
          return net.address;
        }
        candidate = net.address;
      }
    }
  }
  return candidate;
}

const localIp = getLocalIp();
const localUrl = "http://localhost:5173/";
const networkUrl = `http://${localIp}:5173/`;
const backendWsUrl = `ws://${localIp}:8081/ws/echo`;

console.clear?.();
console.log("===============================================================");
console.log("  ☕  COFFEE WITH BRO — FULL-STACK DEVELOPMENT RUNNER");
console.log("===============================================================");
console.log(`  ➜  Local Browser URL:   \x1b[36m${localUrl}\x1b[0m`);
console.log(`  ➜  Network Device URL:  \x1b[32m${networkUrl}\x1b[0m`);
console.log(`  ➜  Spring Boot Server:  \x1b[33mhttp://localhost:8081/\x1b[0m`);
console.log(`  ➜  WebSocket Endpoint:  \x1b[35m${backendWsUrl}\x1b[0m`);
console.log("===============================================================");
console.log("  Starting backend and frontend services...\n");

const frontend = spawn(npmCmd, ["run", "dev", "--", "--host"], {
  cwd: frontendDir,
  shell: isWindows,
  stdio: "inherit",
});

const server = spawn(mavenCmd, ["spring-boot:run"], {
  cwd: backendDir,
  shell: isWindows,
  stdio: "inherit",
});

// Auto-open browser after 2 seconds once servers are spinning up
setTimeout(() => {
  const openCmd = isWindows
    ? `start ${localUrl}`
    : process.platform === "darwin"
    ? `open ${localUrl}`
    : `xdg-open ${localUrl}`;

  exec(openCmd, () => {});
}, 2500);

function killProcess(proc) {
  if (!proc || !proc.pid) return;
  try {
    if (isWindows) {
      exec(`taskkill /pid ${proc.pid} /T /F`, () => {});
    } else {
      proc.kill("SIGTERM");
    }
  } catch {}
}

let cleanedUp = false;
function cleanup() {
  if (cleanedUp) return;
  cleanedUp = true;
  console.log("\nShutting down frontend and backend...");
  killProcess(frontend);
  killProcess(server);
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);
