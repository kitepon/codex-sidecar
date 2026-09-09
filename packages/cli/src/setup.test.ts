import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";

const cli = fileURLToPath(new URL("./index.js", import.meta.url));

async function run(args: string[], environment: NodeJS.ProcessEnv) {
  return new Promise<{ code: number; result: Record<string, unknown> }>((resolve, reject) => {
    execFile(process.execPath, [cli, "setup", ...args], { env: environment, timeout: 20000 }, (error, stdout) => {
      try { resolve({ code: error ? Number(error.code) || 1 : 0, result: JSON.parse(stdout) }); }
      catch (parseError) { reject(parseError); }
    });
  });
}

test("setupの不正引数はCLIから非0終了する", async () => {
  for (const args of [["--ai", "unknown"], ["--ai", "claude,claude"], ["--dry-run"], ["--config", "custom.yml"]]) {
    const result = await run(args, process.env);
    assert.equal(result.code, 1);
    assert.equal(result.result.status, "failed");
  }
});
