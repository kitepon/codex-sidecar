# codex-sidecar-core

Core library for codex-sidecar. Most users should install the CLI or MCP package instead of using this package directly.

`setupSidecar`が導入・MCP登録・読戻し・実効確認を所有し、CLIはこの入口を呼びます。
OS能力とAI設定形式、Windows npm shimの解決もcoreへ集約しています。
core・CLI・MCPの3 packageは同じ公開版でそれぞれ更新します。

- [Product overview](https://github.com/kitepon/codex-sidecar#readme)
- [Architecture](https://github.com/kitepon/codex-sidecar/blob/main/docs/ARCHITECTURE.md)
- [Protocol contract](https://github.com/kitepon/codex-sidecar/blob/main/docs/PROTOCOL.md)
