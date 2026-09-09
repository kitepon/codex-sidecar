# AI別MCP登録形式の調査

取得日: 2026-09-10。確度: 形式はofficial、CLIによる確認はobserved。
原文はMarkItDownで取得し、公開保管する短い抜粋を[raw](raw/)へ分離した。
現在の操作契約は[利用ガイド](../../docs/USAGE.md#standalone-setup)を参照する。

| AI | 一次ソース | 設計に使った事実 |
| --- | --- | --- |
| Claude | [公式MCP文書](https://code.claude.com/docs/en/mcp) | user設定は`.claude.json`。local登録は同ファイルのprojects以下に入り、project/userより優先する。`${VAR}`と既定値を展開する。隔離した`CLAUDE_CONFIG_DIR`で公式`claude mcp add`を実行し、`.claude.json`生成を確認した。 |
| Codex | [公式MCP文書](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) | `config.toml`の`mcp_servers`に登録する。env、env_vars、cwd、起動timeout、enabledを持つ。remote実行など未対応の形はsetupが拒否する。 |
| Grok | [公式MCP文書](https://docs.x.ai/build/features/mcp-servers) | `~/.grok/config.toml`の`mcp_servers`が正規設定。env中の`${VAR}`と既定値を展開する。起動timeoutの既定は30秒。project設定が同名user登録を上書きする。 |
| Cursor | [公式MCP文書](https://cursor.com/docs/mcp) | user設定は`~/.cursor/mcp.json`。env参照は`${env:NAME}`。envFileは別機能であり、setupは未対応として変更前に停止する。 |

実測で確認した罠は、Claudeのuser登録だけを更新しても既存local登録が優先されることと、
TOML再整形後にもCodexのmodel設定をtableより前に保持する必要があること。
前者は既存local登録のcommand/argsも更新し、後者は再parse比較とtop-level試験で固定した。
設定の保存成功とAIアプリの再読込は別の観測であり、setupのverifiedは実MCPプロセスへの接続を示す。
