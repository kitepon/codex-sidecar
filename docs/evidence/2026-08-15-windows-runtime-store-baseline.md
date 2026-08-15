# Windows runtime error store baseline（2026-08-15）

## Installed 0.3.8

- `codex-sidecar factory-diagnostics --project <dotagents>`: exit 1、
  `runtimeErrorStore.status=unverified`、`collection=enabled`、`store=unverified`。
- `codex-sidecar factory-errors --action snapshot`: exit 1、
  `FACTORY_RUNTIME_ERROR_STORE_UNAVAILABLE`。
- storeはschema v2の空stateで、directory/fileともownerはcurrent SID、
  inheritance無効、current SIDのFullControl一件だけだった。

## Source baseline

`corepack pnpm install --frozen-lockfile` と `corepack pnpm typecheck` は成功。
続く `corepack pnpm test` はcoreの111件中89 pass、10 fail、12 skipで停止した。
10 failはすべてfactory error store経路で、`bounded child process failed`、
capture `status=failed`、store未生成へ集約された。

## 原因実測

0.3.8はWindows ACL検証用 `powershell.exe` を1秒でkillする。
同じACL scriptを同じstateへ8回実行すると全回exit 0だったが、
所要時間は675〜1,073msで、1回が現行期限を超えた。

さらに一回のcaptureはdirectory、SQLite lock、store、temporary fileの
ACL適用・検証で同種子processを重複起動するため、子ごとの期限だけでなく
Windows capture全体5秒の期限にも余裕がない。

## 結論

state破損やACL不備ではなく、Windows子process期限と重複起動の設計欠陥である。
state/ACL契約を緩めず、Windowsだけbounded期限を分離し、同一operation内の
重複適用・検証を除く。
