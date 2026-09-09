import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../packages/core/src/platform.ts", import.meta.url), "utf8");
const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { platformCapabilities } = await import("data:text/javascript;base64," + Buffer.from(javascript).toString("base64"));
const systems = ["darwin", "linux", "win32"];
const labels = { setup: "導入・MCP登録", mcpStdio: "MCP stdio接続・製品status", configurationDiagnostics: "project設定診断", runtimeErrorStore: "runtime error store", synchronousDryRun: "同期workflowのdry-run", codexExecution: "Codex実行（read-only・generate）", synchronousWork: "同期work", asynchronousWork: "耐久async work", authRecovery: "認証leaseの診断・復旧" };
if (JSON.stringify(Object.keys(platformCapabilities()).sort()) !== JSON.stringify(Object.keys(labels).sort())) {
  throw new Error("PLATFORM_DOCUMENT_FEATURE_MISMATCH: 能力定義と対応表の機能一覧が一致しません。");
}
const table = Object.entries(labels).map(([feature, label]) => {
  const entries = systems.map((system) => platformCapabilities(system)[feature]);
  return "| " + [label, ...entries.map((entry) => entry.status === "supported" ? "対応" : "未対応"), entries.find((entry) => entry.reason)?.reason ?? "—"].join(" | ") + " |";
}).join("\n");
const output = `<!-- 生成物。変更元: packages/core/src/platform.ts -->
# OS別の機能対応

この表は製品の対応契約です。実機で実行した範囲と結果はreleaseの受入証拠で区別します。
Node.jsの最低版はpackage manifestを参照してください。

| 機能 | macOS native | Linux native | Windows native | 未対応理由 |
| --- | --- | --- | --- | --- |
${table}

Windowsの未対応機能は <code>RUN_UNSUPPORTED_PLATFORM</code> を返します。
MCP登録と接続の成功は、未対応workflowの実行成功を意味しません。
Codexを起動する機能には、別途Codex CLI、Git、ログイン、project設定が必要です。
この表で扱うOS以外は実機受入の対象外です。

導入・診断は[利用ガイド](USAGE.md#standalone-setup)を参照してください。
生成: <code>node scripts/render-platform-support.mjs --write</code>。照合: <code>node scripts/render-platform-support.mjs --check</code>。
`;
const target = new URL("../docs/PLATFORM_SUPPORT.md", import.meta.url);
if (process.argv[2] === "--write") await writeFile(target, output);
else if (process.argv[2] === "--check") {
  if (await readFile(target, "utf8") !== output) throw new Error("PLATFORM_DOCUMENT_DRIFT: OS対応表を再生成してください。");
} else throw new Error("--writeまたは--checkを指定してください。");
