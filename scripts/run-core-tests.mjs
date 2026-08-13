import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const coreRoot = fileURLToPath(new URL("../packages/core", import.meta.url));
const windowsApplicable = new Set([
  "app-server-client.test.js",
  "app-server-runner.test.js",
  "config.test.js",
  "context.test.js",
  "factory-error-store.test.js",
  "generate.test.js",
  "presets.test.js",
  "process-group.test.js",
  "run-types.test.js",
  "safety.test.js",
  "structured-output.test.js",
  "windows-platform.test.js",
  "worktree.test.js",
  "worktree-runner.test.js",
]);

const tests = readdirSync(join(coreRoot, "dist"))
  .filter((name) => name.endsWith(".test.js"))
  .filter((name) => process.platform !== "win32" || windowsApplicable.has(name))
  .sort()
  .map((name) => join("dist", name));

const result = spawnSync(process.execPath, ["--test", ...tests], {
  cwd: coreRoot,
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
