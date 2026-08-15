# Windows runtime error store repair

## 目的

Windows native で `codex-sidecar factory-diagnostics` と
`codex-sidecar factory-errors --action snapshot` が、正しい schema v2 state と
owner-only ACLを持つにもかかわらず `unverified` /
`FACTORY_RUNTIME_ERROR_STORE_UNAVAILABLE` になる欠陥を根治し、0.3.9として届ける。

## 実測済みの原因

- Windows ACL検証はWindows PowerShell 5.1の `powershell.exe` 子processを起動する。
- 親がPowerShell 7の時、子processが親の `PSModulePath` を継承し、
  `Microsoft.PowerShell.Security` のautoloadに失敗する。
- 0.3.8はstderrを捨てるため、`Get-Acl` がnullになった後のexit 41だけが
  generic failureとして残り、ACL不備に見えていた。
- 子processの期限が共通I/O期限2秒の半分、1秒に固定されている。
- この端末で同じACL scriptは正常終了するが、8回中1回は1,073msを要した。
- 現行0.3.8のWindows testでは factory error store 関連10件が失敗し、
  failure時刻と1秒killが一致した。
- state schema、owner、ACLは正常であり、state修復やACL緩和は不要である。

## 実装範囲

1. Windows PowerShell 5.1子processから親由来の `PSModulePath` だけを除き、
   Windows PowerShell自身の既定module pathを使わせる。
2. Windows ACL子processの期限を、実測に基づく独立したbounded timeoutへ分離する。
3. 同一operation内の重複ACL適用・検証を除き、通常時のprocess起動数を減らす。
4. 現在のowner-only ACL、symlink拒否、POSIX 0700/0600契約は維持する。
5. canonical repository `kitepon/codex-sidecar` に合わせ、公開packageのrepository metadataを修正する。
6. patch versionを上げ、npm 3 package、GitHub release、global install、factory診断まで届ける。

## 非目標

- state内容、fingerprint、retention、ack/resolve契約の変更。
- ACL要件の緩和、失敗時の成功扱い、PowerShell以外への暗黙fallback。
- `codex_work`、App Server、MCP transportの挙動変更。
- dotagentsの `install.sh`、`bin/verify-install.sh`、`README.md` の変更。

## 既知の罠

- timeoutだけを延ばし重複process起動を残すと、Windows capture全体の期限へ再衝突する。
- Windows専用分岐の整理でPOSIX mode/owner検査を迂回してはならない。
- publish対象は `origin/main` の祖先で、3 package versionとtarballを一致させる。
- macOS/WSL2を実機未確認のまま成功扱いしない。GitHub factory CIの各環境結果で確認する。

## 検証

- focused: core factory error store tests、CLI factory diagnostics/errors tests。
- related: typecheck、lint、core/CLI/MCP tests、build、release gate。
- Windows実機: 既存stateを変更せずsnapshot/diagnosticsがready、capture後もready。
- cross-platform: GitHub factory CIのmacOS native、Linux native、Windows native、WSL2を全green。
- 公開後: npm 3 package version、global CLI/MCP version、factory diagnostics、MCP initialize。
