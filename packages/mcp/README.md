# codex-sidecar-mcp

MCP server for codex-sidecar.

```sh
npm install --global codex-sidecar-core@latest codex-sidecar-cli@latest codex-sidecar-mcp@latest
codex-sidecar setup
```

MCPサーバーを直接起動する既存の`codex-sidecar-mcp`も利用できます。
管理tool `codex_sidecar_status`はproject設定や認証なしでcore版とOS対応を返します。
初回・再実行・更新のMCP登録はCLIの同じsetupを使います。

- [MCP and HTTP usage](https://github.com/kitepon/codex-sidecar/blob/main/docs/USAGE.md)
- [Protocol contract](https://github.com/kitepon/codex-sidecar/blob/main/docs/PROTOCOL.md)
