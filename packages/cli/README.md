# codex-sidecar-cli

Command-line interface for codex-sidecar.

```sh
npm install --global codex-sidecar-core@latest codex-sidecar-cli@latest codex-sidecar-mcp@latest
codex-sidecar setup
codex-sidecar setup --check
```

初回と更新で同じsetupを使い、Claude・Codex・Grok・Cursorのstdio登録、読戻し、MCPツール応答を確認します。
既存env・timeout・無効化・他の登録・project設定・認証を保持します。
WindowsではMCP接続・診断・同期dry-runが使えます。Codex実行・耐久work・認証復旧はPOSIX依存で未対応です。

- [Standalone usage](https://github.com/kitepon/codex-sidecar/blob/main/docs/USAGE.md)
- [Product overview](https://github.com/kitepon/codex-sidecar#readme)
