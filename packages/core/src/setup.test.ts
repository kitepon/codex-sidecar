import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { setupSidecar, type SetupOptions, type SetupDependencies } from "./setup.js";
import { SETUP_CLIENTS, clientSettings, parseSettings, registration, serializeSettings, setupError, registrationEnvironment } from "./setup-clients.js";
import { sidecarProductStatus } from "./product-status.js";
import { platformCapabilities } from "./platform.js";

const version = sidecarProductStatus().coreVersion;

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const home = await mkdtemp(join(tmpdir(), "sidecar-setup-test-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  // 実端末のHOMEで試験を起動しても、所有外のproject設定を読まない。
  const options: SetupOptions = { home, environment: {}, cliVersion: version, project: { root: home, configFile: ".codex-sidecar.yml" } };
  const calls: unknown[] = [];
  const dependencies: SetupDependencies = { resolveCommand: async () => ({ command: process.execPath, args: [join(home, "installed", "server.js")] }), probe: async (input) => { calls.push(input); } };
  return { home, options, dependencies, calls };
}

test("初回setupは4 AIへ登録し、読戻した各登録でツール呼出しを確認する", async (t) => {
  const f = await fixture(t);
  const result = await setupSidecar(f.options, f.dependencies);
  assert.equal(result.status, "ok", JSON.stringify(result));
  assert.equal(f.calls.length, 5);
  assert.deepEqual(f.calls.map((call) => (call as { timeoutMs: number }).timeoutMs), [10000, 10000, 10000, 30000, 10000]);
  assert.deepEqual(result.clients.map((item) => [item.ai, item.registration, item.verification]), SETUP_CLIENTS.map((ai) => [ai, "created", "verified"]));
  for (const ai of SETUP_CLIENTS) {
    const settings = clientSettings(ai, f.home, {});
    const entry = registration(parseSettings(await readFile(settings.path, "utf8"), settings), settings)!;
    assert.equal(entry.command, process.execPath);
  }
  assert.equal(await readFile(join(f.home, ".codex", "config.toml"), "utf8").then((source) => source.includes("model =")), false);
});

test("再実行とcheckは設定bytesを変更せず、更新は古いcommand/argsだけを置換する", async (t) => {
  const f = await fixture(t);
  for (const ai of SETUP_CLIENTS) {
    const settings = clientSettings(ai, f.home, {});
    await mkdir(dirname(settings.path), { recursive: true });
    const document = { model: "gpt-5.6", model_reasoning_effort: "high", preference: "所有外", [settings.key]: { other: { command: "other", args: ["kept"] }, "codex-sidecar": { command: "npx", args: ["-y", "codex-sidecar-mcp@0.3.0"], cwd: f.home, env: { PATH: "保持値", TOKEN: "秘密値" }, startup_timeout_sec: 37, tool_timeout_sec: 901, enabled: true, disabledTools: ["codex_work"] } } };
    await writeFile(settings.path, serializeSettings(document, settings));
  }
  const auth = join(f.home, ".codex", "auth.json");
  await writeFile(auth, "認証の正本");
  const first = await setupSidecar(f.options, f.dependencies);
  assert.equal(first.status, "ok");
  assert.ok(first.clients.every((item) => item.registration === "updated" && item.backup));
  const before = await Promise.all(first.clients.map((item) => readFile(item.path, "utf8")));
  assert.ok(f.calls.every((call) => (call as { timeoutMs: number }).timeoutMs === 37000));
  assert.ok(f.calls.every((call) => (call as { cwd: string }).cwd === f.home));
  for (const ai of ["codex", "grok"] as const) {
    const settings = clientSettings(ai, f.home, {});
    const topLevel = (await readFile(settings.path, "utf8")).split(/^\[/mu)[0];
    assert.match(topLevel, /model = "gpt-5.6"/u);
    assert.match(topLevel, /model_reasoning_effort = "high"/u);
  }
  for (const check of [false, true]) {
    const next = await setupSidecar({ ...f.options, check }, f.dependencies);
    assert.equal(next.status, "ok");
    assert.ok(next.clients.every((item) => item.registration === "unchanged" && !item.backup));
    assert.deepEqual(await Promise.all(next.clients.map((item) => readFile(item.path, "utf8"))), before);
  }
  const updated = await setupSidecar(f.options, { ...f.dependencies, resolveCommand: async () => ({ command: process.execPath, args: [join(f.home, "updated", "server.js")] }) });
  assert.equal(updated.status, "ok");
  for (const [index, ai] of SETUP_CLIENTS.entries()) {
    const settings = clientSettings(ai, f.home, {});
    const document = parseSettings(await readFile(settings.path, "utf8"), settings);
    const previous = parseSettings(before[index], settings);
    registration(previous, settings)!.args = [join(f.home, "updated", "server.js")];
    assert.deepEqual(document, previous);
  }
  assert.equal(await readFile(auth, "utf8"), "認証の正本");
  assert.ok(!JSON.stringify(updated).includes("秘密値"));
});

test("無効化指定は保持し、無効な登録には接続しない", async (t) => {
  const f = await fixture(t);
  for (const ai of SETUP_CLIENTS) {
    const settings = clientSettings(ai, f.home, {});
    await mkdir(dirname(settings.path), { recursive: true });
    const flags = ai === "cursor" ? { disabled: true } : ai === "claude" ? {} : { enabled: false };
    const document = { projects: { [f.home]: { disabledMcpServers: ["codex-sidecar", "other"] } }, [settings.key]: { "codex-sidecar": { command: "old", ...flags } } };
    await writeFile(settings.path, serializeSettings(document, settings));
  }
  const result = await setupSidecar(f.options, f.dependencies);
  assert.equal(result.status, "ok");
  assert.equal(f.calls.length, 0);
  assert.ok(result.clients.every((item) => item.verification === "disabled"));
});

test("checkは初回や古い登録を非成功にし設定を作らない", async (t) => {
  const f = await fixture(t);
  const result = await setupSidecar({ ...f.options, check: true }, f.dependencies);
  assert.equal(result.error?.code, "SETUP_REGISTRATION_STALE");
  assert.equal(result.status, "failed");
  assert.deepEqual(await readdir(f.home), []);
});

test("不正設定・別transport・version不一致・probe失敗では既存設定を書換えない", async (t) => {
  const f = await fixture(t);
  const settings = clientSettings("cursor", f.home, {});
  await mkdir(dirname(settings.path), { recursive: true });
  for (const source of ["{秘密の壊れたJSON", JSON.stringify({ mcpServers: { "codex-sidecar": { url: "https://example.invalid" } } })]) {
    await writeFile(settings.path, source);
    const result = await setupSidecar(f.options, f.dependencies);
    assert.equal(result.status, "failed");
    assert.equal(await readFile(settings.path, "utf8"), source);
    assert.ok(!JSON.stringify(result).includes("秘密"));
    assert.equal(f.calls.length, 0);
  }
  await writeFile(settings.path, "{}");
  const mismatch = await setupSidecar({ ...f.options, cliVersion: "0.0.0" }, f.dependencies);
  assert.equal(mismatch.error?.code, "SETUP_VERSION_MISMATCH");
  const failed = await setupSidecar(f.options, { ...f.dependencies, probe: async () => { throw setupError("SETUP_MCP_FAILED", "試験の失敗"); } });
  assert.equal(failed.error?.code, "SETUP_MCP_FAILED");
  assert.equal(await readFile(settings.path, "utf8"), "{}");
});

test("外部AIが処理中に書いた設定は上書きしない", async (t) => {
  const f = await fixture(t);
  const settings = clientSettings("claude", f.home, {});
  const source = JSON.stringify({ other: "外部からの更新" });
  const result = await setupSidecar(f.options, { ...f.dependencies, probe: async () => { await writeFile(settings.path, source); } });
  assert.equal(result.error?.code, "SETUP_CONFIG_CHANGED");
  assert.equal(await readFile(settings.path, "utf8"), source);
});

test("登録後の検証失敗は部分結果を残し、同じsetupの再実行で完了できる", async (t) => {
  const f = await fixture(t);
  let count = 0;
  const first = await setupSidecar(f.options, { ...f.dependencies, probe: async () => { if (++count === 2) throw setupError("SETUP_MCP_FAILED", "試験の失敗"); } });
  assert.equal(first.status, "failed");
  assert.equal(first.clients[0].registration, "created");
  const next = await setupSidecar(f.options, f.dependencies);
  assert.equal(next.status, "ok");
  assert.equal(next.clients[0].registration, "unchanged");
});

test("AI設定の環境変数展開を保持し、未解決の値を成功扱いしない", () => {
  assert.equal(registrationEnvironment({ env: { PATH: "${env:PATH}" } }, "cursor", "/home/u", "/repo", { PATH: "p" }).PATH, "p");
  assert.equal(registrationEnvironment({ env: { VALUE: "${ABSENT:-fallback}" } }, "claude", "/home/u", "/repo", {}).VALUE, "fallback");
  assert.equal(registrationEnvironment({ env: { VALUE: "${TOKEN}" } }, "grok", "/home/u", "/repo", { TOKEN: "grok-value" }).VALUE, "grok-value");
  assert.throws(() => registrationEnvironment({ env: { VALUE: "${env:ABSENT}" } }, "cursor", "/home/u", "/repo", {}), { code: "SETUP_ENV_MISSING" });
  assert.throws(() => registrationEnvironment({ env: { CODEX_SIDECAR_MCP_TRANSPORT: "http" } }, "codex", "/home/u", "/repo", {}), { code: "SETUP_TRANSPORT_CONFLICT" });
});

test("WindowsはMCP・診断・同期dry-runを維持し、POSIX依存機能だけを未対応とする", () => {
  const windows = platformCapabilities("win32");
  assert.equal(windows.mcpStdio.status, "supported");
  assert.equal(windows.synchronousDryRun.status, "supported");
  assert.equal(windows.configurationDiagnostics.status, "supported");
  assert.equal(windows.codexExecution.status, "unsupported");
  assert.equal(windows.asynchronousWork.status, "unsupported");
  for (const os of ["darwin", "linux"] as const) assert.ok(Object.values(platformCapabilities(os)).every((entry) => entry.status === "supported"));
});

test("Claudeの既存local登録も更新し、現在のprojectで優先されるenvを実効確認する", async (t) => {
  const f = await fixture(t);
  const project = join(f.home, "project");
  const settings = clientSettings("claude", f.home, {});
  const local = { command: "old-local", args: ["legacy"], env: { VALUE: "local-value" }, timeout: 123 };
  await writeFile(settings.path, JSON.stringify({ mcpServers: { "codex-sidecar": { command: "old-user", env: { VALUE: "user-value" } } }, projects: { [project]: { mcpServers: { "codex-sidecar": local, other: { command: "other" } }, allowedTools: ["kept"] } } }));
  const result = await setupSidecar({ ...f.options, clients: ["claude"], project: { root: project, configFile: "custom.yml" } }, f.dependencies);
  assert.equal(result.status, "ok");
  assert.ok(f.calls.every((call) => (call as { environment: { VALUE: string } }).environment.VALUE === "local-value"));
  const doc = JSON.parse(await readFile(settings.path, "utf8"));
  assert.equal(doc.projects[project].mcpServers["codex-sidecar"].command, process.execPath);
  assert.equal(doc.projects[project].mcpServers["codex-sidecar"].timeout, 123);
  assert.deepEqual(doc.projects[project].mcpServers.other, { command: "other" });
  assert.deepEqual(doc.projects[project].allowedTools, ["kept"]);
});

test("project固有の上書きをuser登録の成功と誤認せず、所有外設定を変えない", async (t) => {
  const f = await fixture(t);
  const project = join(f.home, "project");
  await mkdir(project);
  const source = JSON.stringify({ mcpServers: { "codex-sidecar": { command: "project-owned" } } });
  await writeFile(join(project, ".mcp.json"), source);
  const result = await setupSidecar({ ...f.options, clients: ["claude"], project: { root: project, configFile: "custom.yml" } }, f.dependencies);
  assert.equal(result.error?.code, "SETUP_SCOPE_CONFLICT");
  assert.equal(await readFile(join(project, ".mcp.json"), "utf8"), source);
  assert.equal(f.calls.length, 0);
});
