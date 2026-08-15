# Windows runtime error store release acceptance（0.3.9）

## GitHub / npm

- release commit: `83cc3f654050978bfaad344440e9a65ce997e516`
- GitHub CI run 31857992812: macOS native、Linux native、Windows native、WSL2がすべてsuccess。
- GitHub Release: `v0.3.9`、release commitをtargetとして公開済み。
- npm: `codex-sidecar-core`、`codex-sidecar-cli`、`codex-sidecar-mcp` はすべて0.3.9。
- fresh prefix install: CLI 0.3.9、MCP initialize serverInfo 0.3.9。

## Windows native factory acceptance

- dotagents revision: `619e7230ac15851600a58015376a479ce158a103`。
- one-shot scheduled smoke receipt: run `f34c2a4e-f28a-4b5c-b77b-bc2fd0f9dce3`、`delivery_acknowledged=true`。
- 全15製品smoke: passed。codex-sidecar 0.3.9はinstalled / compatible、native diagnostics pass、runtime errors 0。
- BugHub delivery: report `1bdcde1a-041f-4111-8ef9-be869f17b135` を受理。outbox / retry / dead-letterはすべて0。
- Windows Task Scheduler: `dotagents-agents-update` の実行結果0、次回実行は2026-08-16 02:00 JST。

## 互換性

Windows専用実装だけを変更し、GitHub CIでmacOS native / Linux native / WSL2の既存契約が維持された。
dotagents側の一撃展開修正もWindows専用PowerShellとそのtestだけで、
`install.sh`、`bin/verify-install.sh`、`README.md` は変更していない。
