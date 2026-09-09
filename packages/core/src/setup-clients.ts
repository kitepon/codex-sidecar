import { join, resolve, basename, sep, isAbsolute } from "node:path";
import { parse, stringify } from "smol-toml";

export const SETUP_CLIENTS = ["claude", "codex", "grok", "cursor"] as const;
export type SetupClient = typeof SETUP_CLIENTS[number];
export type SettingsObject = Record<string, unknown>;
export type McpCommand = { command: string; args: string[] };
export interface ClientSettings {
  ai: SetupClient;
  path: string;
  format: "json" | "toml";
  key: "mcpServers" | "mcp_servers";
}

export function setupError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

export function settingsObject(value: unknown): value is SettingsObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clientSettings(ai: SetupClient, home: string, env: NodeJS.ProcessEnv): ClientSettings {
  switch (ai) {
    case "claude": return { ai, path: env.CLAUDE_CONFIG_DIR ? join(env.CLAUDE_CONFIG_DIR, ".claude.json") : join(home, ".claude.json"), format: "json", key: "mcpServers" };
    case "cursor": return { ai, path: join(home, ".cursor", "mcp.json"), format: "json", key: "mcpServers" };
    case "codex": return { ai, path: join(env.CODEX_HOME || join(home, ".codex"), "config.toml"), format: "toml", key: "mcp_servers" };
    case "grok": return { ai, path: join(home, ".grok", "config.toml"), format: "toml", key: "mcp_servers" };
  }
}

export function parseSettings(source: string | undefined, settings: ClientSettings): SettingsObject {
  if (source === undefined) return {};
  let value: unknown;
  try { value = settings.format === "toml" ? parse(source) : JSON.parse(source.replace(/^\uFEFF/u, "")); }
  catch { throw setupError("SETUP_CONFIG_INVALID", settings.ai + "の設定を解析できません。既存ファイルを修正して再実行してください。"); }
  if (!settingsObject(value)) throw setupError("SETUP_CONFIG_INVALID", settings.ai + "の設定ルートはobjectが必要です。");
  return value;
}

export function registration(document: SettingsObject, settings: ClientSettings): SettingsObject | undefined {
  const servers = document[settings.key];
  if (servers === undefined) return undefined;
  if (!settingsObject(servers)) throw setupError("SETUP_CONFIG_INVALID", settings.ai + "のMCP登録一覧はobjectが必要です。");
  const entry = servers["codex-sidecar"];
  if (entry === undefined) return undefined;
  if (!settingsObject(entry)) throw setupError("SETUP_CONFIG_INVALID", settings.ai + "のcodex-sidecar登録はobjectが必要です。");
  return entry;
}

export function updatedSettings(document: SettingsObject, settings: ClientSettings, command: McpCommand): SettingsObject {
  const current = registration(document, settings);
  const entry = updateRegistration(current, settings, command);
  let projects = document.projects;
  if (settings.ai === "claude" && settingsObject(projects)) {
    projects = { ...projects };
    for (const [path, project] of Object.entries(projects as SettingsObject)) {
      if (!settingsObject(project) || !settingsObject(project.mcpServers) || !("codex-sidecar" in project.mcpServers)) continue;
      const local = project.mcpServers["codex-sidecar"];
      if (!settingsObject(local)) throw setupError("SETUP_CONFIG_INVALID", "Claudeのlocal登録はobjectが必要です。");
      (projects as SettingsObject)[path] = { ...project, mcpServers: { ...project.mcpServers, "codex-sidecar": updateRegistration(local, settings, command) } };
    }
  }
  return { ...document, ...(projects === undefined ? {} : { projects }), [settings.key]: { ...(document[settings.key] as SettingsObject | undefined), "codex-sidecar": entry } };
}

function updateRegistration(current: SettingsObject | undefined, settings: ClientSettings, command: McpCommand): SettingsObject {
  if (current && ("url" in current || current.type !== undefined && current.type !== "stdio")) {
    throw setupError("SETUP_TRANSPORT_CONFLICT", settings.ai + "のcodex-sidecarはstdio登録ではありません。");
  }
  return { ...(current ?? (["claude", "cursor"].includes(settings.ai) ? { type: "stdio" } : {})), ...command };
}

export function effectiveRegistration(document: SettingsObject, settings: ClientSettings, projectRoot: string): SettingsObject | undefined {
  if (settings.ai === "claude" && settingsObject(document.projects)) {
    const project = document.projects[resolve(projectRoot)];
    if (settingsObject(project) && settingsObject(project.mcpServers) && settingsObject(project.mcpServers["codex-sidecar"])) return project.mcpServers["codex-sidecar"];
  }
  return registration(document, settings);
}

export function serializeSettings(document: SettingsObject, settings: ClientSettings): string {
  return settings.format === "toml" ? stringify(document) : JSON.stringify(document, null, 2) + "\n";
}

export function registrationDisabled(document: SettingsObject, settings: ClientSettings, entry: SettingsObject, projectRoot: string): boolean {
  if (entry.enabled === false || entry.disabled === true) return true;
  if (settings.ai !== "claude") return false;
  if (Array.isArray(document.disabledMcpServers) && document.disabledMcpServers.includes("codex-sidecar")) return true;
  const projects = document.projects;
  const project = settingsObject(projects) ? projects[resolve(projectRoot)] : undefined;
  return settingsObject(project) && Array.isArray(project.disabledMcpServers) && project.disabledMcpServers.includes("codex-sidecar");
}

// AIごとの展開規則は、設定を消費するこのadapterが所有する。
export function registrationEnvironment(entry: SettingsObject, ai: SetupClient, home: string, projectRoot: string, environment: NodeJS.ProcessEnv): Record<string, string> {
  if (entry.experimental_environment !== undefined) throw setupError("SETUP_CONFIG_UNSUPPORTED", "remote実行環境付きMCPの実効確認は未対応です。");
  if (entry.envFile !== undefined) throw setupError("SETUP_CONFIG_UNSUPPORTED", ai + "のenvFile付き登録の実効確認は未対応です。設定は変更しません。");
  if (entry.env !== undefined && !settingsObject(entry.env)) throw setupError("SETUP_CONFIG_INVALID", ai + "のenvはobjectが必要です。");
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(environment)) if (value !== undefined) env[key] = value;
  if (entry.env_vars !== undefined) {
    if (!Array.isArray(entry.env_vars) || entry.env_vars.some((key) => typeof key !== "string")) throw setupError("SETUP_CONFIG_INVALID", ai + "のenv_varsは文字列配列が必要です。");
    for (const key of entry.env_vars as string[]) if (environment[key] === undefined) throw setupError("SETUP_ENV_MISSING", ai + "の登録が要求する環境変数がありません。");
  }
  for (const [key, value] of Object.entries((entry.env ?? {}) as SettingsObject)) {
    if (typeof value !== "string") throw setupError("SETUP_CONFIG_INVALID", ai + "のenv値は文字列が必要です。");
    env[key] = value.replace(/\$\{([^}]+)\}/gu, (match, expression: string) => {
      if (ai === "cursor") {
        const constants: Record<string, string> = { userHome: home, workspaceFolder: projectRoot, workspaceFolderBasename: basename(projectRoot), pathSeparator: sep, "/": sep };
        if (expression in constants) return constants[expression];
        if (expression.startsWith("env:") && environment[expression.slice(4)] !== undefined) return environment[expression.slice(4)]!;
      } else if (ai === "claude" || ai === "grok") {
        const [name, fallback] = expression.split(":-", 2);
        if (environment[name] !== undefined) return environment[name]!;
        if (fallback !== undefined) return fallback;
      } else {
        return match;
      }
      throw setupError("SETUP_ENV_MISSING", ai + "の環境変数展開を解決できません。");
    });
  }
  if (env.CODEX_SIDECAR_MCP_TRANSPORT && env.CODEX_SIDECAR_MCP_TRANSPORT !== "stdio") {
    throw setupError("SETUP_TRANSPORT_CONFLICT", ai + "の環境変数がstdio以外のtransportを指定しています。");
  }
  return env;
}

export function registrationTimeout(entry: SettingsObject, ai: SetupClient): number {
  const value = entry.startup_timeout_sec ?? (ai === "grok" ? 30 : 10);
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) throw setupError("SETUP_CONFIG_INVALID", "MCP起動timeoutは正数が必要です。");
  return value * 1000;
}

export function registrationDirectory(entry: SettingsObject): string | undefined {
  if (entry.cwd === undefined) return undefined;
  if (typeof entry.cwd !== "string" || !isAbsolute(entry.cwd)) throw setupError("SETUP_CONFIG_UNSUPPORTED", "MCPのcwdは絶対pathだけを実効確認できます。");
  return entry.cwd;
}
