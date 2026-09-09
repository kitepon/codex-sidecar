import assert from "node:assert/strict";
import { test } from "node:test";
import { chmod, mkdtemp, mkdir, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { probeSetupRegistration } from "../packages/core/dist/setup-probe.js";

const cli = fileURLToPath(new URL("../packages/cli/dist/index.js", import.meta.url));
const mcp = fileURLToPath(new URL("../packages/mcp/dist/server.js", import.meta.url));
const run = (args, environment) => new Promise((resolve, reject) => {
  execFile(process.execPath, [cli, "setup", ...args], { env: environment, timeout: 20000 }, (error, stdout) => {
    try { resolve({ code: error ? Number(error.code) || 1 : 0, result: JSON.parse(stdout) }); }
    catch (parseError) { reject(parseError); }
  });
});

test("応答しない実stdioプロセスはtimeoutで失敗し、stderrの秘密を返さない", async () => {
  await assert.rejects(probeSetupRegistration({
    command: { command: process.execPath, args: ["-e", "process.stderr.write('秘密値');process.stdin.resume()"] },
    environment: {}, timeoutMs: 100, version: "0.0.0",
  }), (error) => error.code === "SETUP_MCP_FAILED" && !error.message.includes("秘密値"));
});

test("CLIの初回・再実行・checkが実際のnpm型MCP入口へ接続しstatusを呼ぶ", { skip: process.platform === "win32" ? "Windowsのnpm shimは公開package実機試験とcore resolver試験で確認" : false }, async (t) => {
  const home = await mkdtemp(join(tmpdir(), "sidecar-setup-cli-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  const bin = join(home, "bin");
  await mkdir(bin);
  // npmがbinへ付与する実行modeを、配布前のtsc出力にも再現する。
  await chmod(mcp, 0o755);
  await symlink(mcp, join(bin, "codex-sidecar-mcp"));
  const env = { ...process.env, HOME: home, CODEX_HOME: join(home, ".codex"), CLAUDE_CONFIG_DIR: join(home, ".claude"), PATH: bin + delimiter + (process.env.PATH ?? ""), CODEX_SIDECAR_MCP_TRANSPORT: "stdio" };
  const absent = await run(["--check"], env);
  assert.equal(absent.code, 1);
  const first = await run([], env);
  assert.equal(first.code, 0, JSON.stringify(first.result));
  const before = await readFile(join(home, ".codex", "config.toml"), "utf8");
  for (const args of [[], ["--check"]]) {
    const repeated = await run(args, env);
    assert.equal(repeated.code, 0, JSON.stringify(repeated.result));
    assert.equal(await readFile(join(home, ".codex", "config.toml"), "utf8"), before);
  }
  const invalidProject = await run(["--project", join(home, "missing-project")], env);
  assert.equal(invalidProject.code, 1);
  assert.equal(invalidProject.result.error.code, "SETUP_PROJECT_INVALID");
});
