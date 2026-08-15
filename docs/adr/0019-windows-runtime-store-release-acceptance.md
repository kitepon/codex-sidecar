# ADR 0019: Windows runtime store 0.3.9を受け入れる

## Decision

commit `83cc3f654050978bfaad344440e9a65ce997e516` のWindows runtime error store修正を受け入れ、
codex-sidecar 0.3.9をこの修理の正式な完了版とする。

根拠は次のとおり。

- focused / related local gateがすべてgreen。
- GitHub CIのmacOS native、Linux native、Windows native、WSL2がすべてgreen。
- npmのcore / CLI / MCP 0.3.9とGitHub Release v0.3.9を公開済み。
- Windows nativeの一撃展開と、その毎日2時タスク自身の無人smokeが成功。
- dotagents全15製品smokeでcodex-sidecar 0.3.9がcompatible、native diagnostics pass、runtime errors 0。

受入証跡は `docs/evidence/2026-08-15-windows-runtime-store-release-acceptance.md` を正とする。
