import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..", "..");
const clientIndexPath = path.join(projectRoot, "dist", "index.html");

if (fs.existsSync(clientIndexPath)) {
  process.exit(0);
}

console.log("Client build not found at dist/index.html. Building the React app before start.");

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npmCommand, ["run", "build"], {
  cwd: projectRoot,
  stdio: "inherit",
});

if (result.error) {
  console.error("Failed to run client build:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
