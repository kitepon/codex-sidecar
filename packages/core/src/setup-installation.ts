import { access, realpath, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { delimiter, join, dirname } from "node:path";
import { resolveMcpCommand } from "./windows-command-resolver.js";
import { setupError, type McpCommand } from "./setup-clients.js";

export async function installedMcpCommand(environment: NodeJS.ProcessEnv): Promise<McpCommand> {
  if (process.platform === "win32") {
    const command = await resolveMcpCommand({ env: environment });
    if (command) return command;
    throw setupError("SETUP_MCP_MISSING", "公式npm版codex-sidecar-mcpの起動コマンドを解決できません。3 packageを同じ版でインストールしてください。");
  }
  for (const directory of (environment.PATH ?? "").split(delimiter).filter(Boolean)) {
    const command = join(directory, "codex-sidecar-mcp");
    try { await access(command, constants.X_OK); }
    catch (error) { if (["ENOENT", "ENOTDIR"].includes((error as NodeJS.ErrnoException).code ?? "")) continue; throw setupError("SETUP_MCP_INVALID", "MCPコマンドに実行権限がありません。"); }
    const entry = await realpath(command);
    let manifest: { name?: string; bin?: Record<string, string> };
    try { manifest = JSON.parse(await readFile(join(dirname(dirname(entry)), "package.json"), "utf8")); }
    catch { throw setupError("SETUP_MCP_INVALID", "MCPコマンドが公式npm packageを指していません。"); }
    if (manifest.name !== "codex-sidecar-mcp" || manifest.bin?.["codex-sidecar-mcp"] !== "dist/server.js") throw setupError("SETUP_MCP_INVALID", "MCPコマンドのpackage manifestが一致しません。");
    return { command: process.execPath, args: [entry] };
  }
  throw setupError("SETUP_MCP_MISSING", "codex-sidecar-mcpがPATHにありません。3 packageを同じ版でインストールしてください。");
}
