import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "milk_with_bro");

const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";
const mavenCmd = isWindows ? ".\\mvnw.cmd" : "./mvnw";
const backendDir = path.join(rootDir, "coffee_with_bro");

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    console.log(`\n> Running: ${command} ${args.join(" ")} in ${path.basename(cwd)}`);
    const proc = spawn(command, args, {
      cwd,
      shell: isWindows,
      stdio: "inherit",
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    proc.on("error", (err) => reject(err));
  });
}

async function main() {
  console.log("=== Testing All Code (Frontend Lint, Build & Backend Tests) ===");

  try {
    await runCommand(npmCmd, ["run", "lint"], frontendDir);
    console.log("✓ Frontend ESLint passed successfully!");

    await runCommand(npmCmd, ["run", "build"], frontendDir);
    console.log("✓ Frontend TypeScript build passed successfully!");

    await runCommand(mavenCmd, ["test"], backendDir);
    console.log("✓ Backend Spring Boot tests passed successfully!");

    console.log("\n==================================================");
    console.log("ALL TESTS & CHECKS PASSED WITH ZERO ERRORS!");
    console.log("==================================================");
    process.exit(0);
  } catch (err) {
    console.error("\nTest checks failed:", err.message);
    process.exit(1);
  }
}

main();
