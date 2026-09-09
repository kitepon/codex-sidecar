<!-- 生成物。変更元: packages/core/src/platform.ts -->
# OS別の機能対応

この表は製品の対応契約です。実機で実行した範囲と結果はreleaseの受入証拠で区別します。
Node.jsの最低版はpackage manifestを参照してください。

| 機能 | macOS native | Linux native | Windows native | 未対応理由 |
| --- | --- | --- | --- | --- |
| 導入・MCP登録 | 対応 | 対応 | 対応 | — |
| MCP stdio接続・製品status | 対応 | 対応 | 対応 | — |
| project設定診断 | 対応 | 対応 | 対応 | — |
| runtime error store | 対応 | 対応 | 対応 | — |
| 同期workflowのdry-run | 対応 | 対応 | 対応 | — |
| Codex実行（read-only・generate） | 対応 | 対応 | 未対応 | auth leases require POSIX hard links |
| 同期work | 対応 | 対応 | 未対応 | auth leases require POSIX hard links |
| 耐久async work | 対応 | 対応 | 未対応 | async work workers require POSIX process groups |
| 認証leaseの診断・復旧 | 対応 | 対応 | 未対応 | auth leases require POSIX hard links |

Windowsの未対応機能は <code>RUN_UNSUPPORTED_PLATFORM</code> を返します。
MCP登録と接続の成功は、未対応workflowの実行成功を意味しません。
Codexを起動する機能には、別途Codex CLI、Git、ログイン、project設定が必要です。
この表で扱うOS以外は実機受入の対象外です。

導入・診断は[利用ガイド](USAGE.md#standalone-setup)を参照してください。
生成: <code>node scripts/render-platform-support.mjs --write</code>。照合: <code>node scripts/render-platform-support.mjs --check</code>。
