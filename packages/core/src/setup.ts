import { lstat, mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { sidecarProductStatus } from "./product-status.js";
import { installedMcpCommand } from "./setup-installation.js";
import { probeSetupRegistration, type SetupProbeInput } from "./setup-probe.js";
import {
  SETUP_CLIENTS, clientSettings, parseSettings, registration, effectiveRegistration, registrationDisabled,
  registrationEnvironment, registrationTimeout, registrationDirectory, serializeSettings, setupError, updatedSettings,
  type McpCommand, type SetupClient,
} from "./setup-clients.js";

export interface SetupOptions {
  cliVersion: string;
  clients?: readonly SetupClient[];
  check?: boolean;
  project?: { root: string; configFile: string };
  /** 埋込み呼出しと隔離試験のための設定先。CLIは現在のユーザーを使う。 */
  home?: string;
  environment?: NodeJS.ProcessEnv;
}

export interface SetupDependencies {
  resolveCommand?: (environment: NodeJS.ProcessEnv) => Promise<McpCommand>;
  probe?: (input: SetupProbeInput) => Promise<void>;
}

export interface SetupClientResult {
  ai: SetupClient;
  path: string;
  registration: "pending" | "created" | "updated" | "unchanged" | "stale";
  verification: "pending" | "verified" | "disabled";
  backup?: string;
}

export interface SetupResult {
  schemaVersion: "1";
  status: "ok" | "failed";
  mode: "setup" | "check";
  version: string;
  platform: NodeJS.Platform;
  capabilities: ReturnType<typeof sidecarProductStatus>["capabilities"];
  clients: SetupClientResult[];
  error?: { code: string; message: string };
}

export async function setupSidecar(options: SetupOptions, dependencies: SetupDependencies = {}): Promise<SetupResult> {
  const product = sidecarProductStatus();
  const result: SetupResult = { schemaVersion: "1", status: "failed", mode: options.check ? "check" : "setup", version: options.cliVersion, platform: process.platform, capabilities: product.capabilities, clients: [] };
  const home = resolve(options.home ?? homedir());
  const environment = options.environment ?? process.env;
  const projectRoot = resolve(options.project?.root ?? process.cwd());
  const clients = options.clients ?? SETUP_CLIENTS;
  const stateRoot = join(home, ".codex-sidecar");
  const lockPath = join(stateRoot, "setup.lock");
  let ownsLock = false;
  try {
    if (clients.length === 0 || clients.some((ai) => !SETUP_CLIENTS.includes(ai)) || new Set(clients).size !== clients.length) throw setupError("SETUP_INVALID_INPUT", "対象AIはclaude,codex,grok,cursorから重複なく指定してください。");
    const [major, minor] = process.versions.node.split(".").map(Number);
    if (major < 22 || major === 22 && minor < 13) throw setupError("SETUP_NODE_UNSUPPORTED", "Node.js 22.13.0以上が必要です。");
    if (product.coreVersion !== options.cliVersion) throw setupError("SETUP_VERSION_MISMATCH", "CLIとcoreの版が一致しません。3 packageを同じ版に更新してください。");
    const command = await (dependencies.resolveCommand ?? installedMcpCommand)(environment);
    if (!options.check) {
      await mkdir(stateRoot, { recursive: true, mode: 0o700 });
      let lock;
      try { lock = await open(lockPath, "wx", 0o600); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") throw setupError("SETUP_BUSY", "別のsetupが実行中か、前回中断したsetup.lockが残っています。実行プロセスを確認してください。"); throw error; }
      ownsLock = true;
      await lock.close();
    }

    // すべての対象を先に解析し、不正な設定を検出してから共有ファイルへ書く。
    const prepared = [];
    for (const ai of clients) {
      const settings = clientSettings(ai, home, environment);
      const original = await readSettingsFile(settings.path);
      const document = parseSettings(original?.source, settings);
      const projectPath = settings.ai === "claude" ? join(projectRoot, ".mcp.json") : join(projectRoot, settings.ai === "cursor" ? ".cursor" : settings.ai === "codex" ? ".codex" : ".grok", settings.ai === "cursor" ? "mcp.json" : "config.toml");
      if (resolve(projectPath) !== resolve(settings.path)) {
        const projectSettings = { ...settings, path: projectPath };
        const projectDocument = parseSettings((await readSettingsFile(projectPath))?.source, projectSettings);
        const localOverridesProject = effectiveRegistration(document, settings, projectRoot) !== registration(document, settings);
        if (!localOverridesProject && registration(projectDocument, projectSettings)) throw setupError("SETUP_SCOPE_CONFLICT", settings.ai + "にproject固有のcodex-sidecar登録があります。所有外のproject設定は変更しません。user登録の実効確認はできません。");
      }
      const expected = updatedSettings(document, settings, command);
      const changed = !isDeepStrictEqual(document, expected);
      const entry = effectiveRegistration(expected, settings, projectRoot)!;
      const disabled = registrationDisabled(expected, settings, entry, projectRoot);
      const env = disabled ? undefined : registrationEnvironment(entry, ai, home, projectRoot, environment);
      const timeoutMs = registrationTimeout(entry, ai);
      const cwd = disabled ? undefined : registrationDirectory(entry);
      const source = changed ? serializeSettings(expected, settings) : original!.source;
      if (!isDeepStrictEqual(parseSettings(source, settings), expected)) throw setupError("SETUP_CONFIG_UNSUPPORTED", ai + "の設定を情報を失わず保存できません。");
      const report: SetupClientResult = { ai, path: settings.path, registration: "pending", verification: "pending" };
      result.clients.push(report);
      prepared.push({ settings, original, expected, changed, disabled, env, timeoutMs, cwd, source, report });
    }
    if (options.check && prepared.some((item) => item.changed)) {
      for (const item of prepared) item.report.registration = item.changed ? "stale" : "unchanged";
      throw setupError("SETUP_REGISTRATION_STALE", "未登録または古い登録があります。codex-sidecar setupを実行してください。");
    }
    const probe = dependencies.probe ?? probeSetupRegistration;
    const active = prepared.find((item) => !item.disabled);
    if (active) await probe({ command, environment: active.env!, timeoutMs: active.timeoutMs, cwd: active.cwd, version: options.cliVersion, project: options.project });

    for (const item of prepared) {
      const { settings, original, expected, changed, report } = item;
      if (changed) {
        // 他AIも書き込む共有設定なので、読取後の外部変更を上書きしない。
        if ((await readSettingsFile(settings.path))?.source !== original?.source) throw setupError("SETUP_CONFIG_CHANGED", settings.ai + "の設定が処理中に変わりました。再実行してください。");
        if (original) {
          const backupRoot = join(stateRoot, "setup-backups");
          await mkdir(backupRoot, { recursive: true, mode: 0o700 });
          report.backup = join(backupRoot, settings.ai + "-" + randomUUID() + ".bak");
          await writeFile(report.backup, original.source, { flag: "wx", mode: 0o600 });
        }
        await mkdir(dirname(settings.path), { recursive: true, mode: 0o700 });
        const temporary = settings.path + ".sidecar-" + randomUUID();
        try {
          await writeFile(temporary, item.source, { flag: "wx", mode: original?.mode ?? 0o600 });
          if ((await readSettingsFile(settings.path))?.source !== original?.source) throw setupError("SETUP_CONFIG_CHANGED", settings.ai + "の設定が保存前に変わりました。再実行してください。");
          await rename(temporary, settings.path);
        } finally { await rm(temporary, { force: true }); }
        report.registration = original ? "updated" : "created";
      } else {
        report.registration = "unchanged";
      }
      const readback = parseSettings((await readSettingsFile(settings.path))?.source, settings);
      if (!isDeepStrictEqual(readback, expected)) throw setupError("SETUP_READBACK_FAILED", settings.ai + "の設定読戻しが一致しません。");
      const entry = effectiveRegistration(readback, settings, projectRoot)!;
      if (registrationDisabled(readback, settings, entry, projectRoot)) {
        report.verification = "disabled";
      } else {
        await probe({ command: { command: entry.command as string, args: entry.args as string[] }, environment: registrationEnvironment(entry, settings.ai, home, projectRoot, environment), timeoutMs: registrationTimeout(entry, settings.ai), cwd: registrationDirectory(entry), version: options.cliVersion, project: options.project });
        report.verification = "verified";
      }
    }
    result.status = "ok";
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    result.error = typeof code === "string" && code.startsWith("SETUP_")
      ? { code, message: (error as Error).message }
      : { code: "SETUP_IO_FAILED", message: "導入設定の読み書きに失敗しました。権限とファイル状態を確認してください。" };
  } finally {
    if (ownsLock) {
      try { await rm(lockPath); }
      catch { result.status = "failed"; result.error = { code: "SETUP_LOCK_RELEASE_FAILED", message: "setup.lockを削除できません。導入結果とロックを確認してください。" }; }
    }
  }
  return result;
}

async function readSettingsFile(path: string): Promise<{ source: string; mode: number } | undefined> {
  try {
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink()) throw setupError("SETUP_CONFIG_UNSUPPORTED", "設定ファイルのsymlinkや通常ファイル以外への書込みは対応していません。");
    return { source: await readFile(path, "utf8"), mode: info.mode & 0o777 };
  } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw error; }
}
