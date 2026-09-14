import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "milk_with_bro");

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    console.log(`\n> Running: ${command} ${args.join(" ")} in ${path.basename(cwd)}`);
    const proc = spawn(command, args, {
      cwd,
      shell: true,
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
  console.log("=== Testing All Code (ESLint & TypeScript Build) ===");

  try {
    await runCommand("npm", ["run", "lint"], frontendDir);
    console.log("✓ ESLint passed successfully!");

    await runCommand("npm", ["run", "build"], frontendDir);
    console.log("✓ TypeScript build passed successfully!");

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
