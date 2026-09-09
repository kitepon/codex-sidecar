import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { setupError, settingsObject, type McpCommand } from "./setup-clients.js";

export interface SetupProbeInput {
  command: McpCommand;
  environment: Record<string, string>;
  timeoutMs: number;
  cwd?: string;
  version: string;
  project?: { root: string; configFile: string };
}

// 設定から読戻した起動情報で、実際のMCPサーバーとcoreの応答を確認する。
export async function probeSetupRegistration(input: SetupProbeInput): Promise<void> {
  const transport = new StdioClientTransport({ ...input.command, env: input.environment, cwd: input.cwd, stderr: "ignore" });
  const client = new Client({ name: "codex-sidecar-setup", version: input.version });
  try {
    await client.connect(transport, { timeout: input.timeoutMs });
    const info = client.getServerVersion();
    if (info?.name !== "codex-sidecar" || info.version !== input.version) throw setupError("SETUP_VERSION_MISMATCH", "MCPとCLIの版が一致しません。3 packageを同じ版に更新してください。");
    const list = await client.listTools({}, { timeout: input.timeoutMs });
    if (!list.tools.some((tool) => tool.name === "codex_sidecar_status")) throw setupError("SETUP_VERSION_MISMATCH", "MCPの製品診断入口がありません。3 packageを同じ版に更新してください。");
    const response = await client.callTool({ name: "codex_sidecar_status", arguments: {} }, undefined, { timeout: input.timeoutMs });
    const status = response.structuredContent;
    if (response.isError || !settingsObject(status) || status.status !== "ok" || status.coreVersion !== input.version) throw setupError("SETUP_VERSION_MISMATCH", "実行中MCPのcoreとCLIの版が一致しません。");
    if (input.project) {
      const result = await client.callTool({ name: "codex_explore", arguments: { projectRoot: input.project.root, configFile: input.project.configFile, dryRun: true, prompt: "導入設定の確認" } }, undefined, { timeout: input.timeoutMs });
      if (result.isError || !settingsObject(result.structuredContent) || result.structuredContent.status !== "dry-run") throw setupError("SETUP_PROJECT_INVALID", "指定projectのMCP dry-runに失敗しました。project設定を確認してください。");
    }
  } catch (error) {
    if ((error as { code?: unknown }).code && String((error as { code: unknown }).code).startsWith("SETUP_")) throw error;
    // 外部serverのstderr・応答には秘密が含まれ得るため、そのまま公開結果へ転記しない。
    throw setupError("SETUP_MCP_FAILED", "MCPの起動またはツール呼出しに失敗しました。登録のenvとtimeout、インストール状態を確認してください。");
  } finally {
    await client.close();
  }
}
