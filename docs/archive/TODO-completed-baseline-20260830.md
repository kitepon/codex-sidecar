# Completed task baseline through 0.3.11

This archive holds completed work that was removed from the current `docs/TODO.md` on 2026-08-30.
The current file now contains only unresolved, reproduced product defects.

## Completed releases and capabilities

- 0.3.1 fixed npm-symlinked `codex-sidecar-mcp` startup and retains its regression test.
- 0.3.3 delivered durable disconnect-safe work, explicit recovery, and Docker verification.
- 0.3.4 added the CLI/MCP version contract.
- Explicit model selection and the Caveat advisory rollout were completed and archived in
  [CODEX_MODEL_POLICY_TODO.md](CODEX_MODEL_POLICY_TODO.md).

| Priority | Task | Evidence |
| --- | --- | --- |
| P0 | Normalize read-only workflows into structured `SidecarResult` fields | [GitHub #1](https://github.com/kitepon/codex-sidecar/issues/1) |
| P0 | Persist raw App Server event logs and diagnostics | [GitHub #2](https://github.com/kitepon/codex-sidecar/issues/2) |
| P1 | Expose timeout and cancellation controls for App Server turns | [GitHub #3](https://github.com/kitepon/codex-sidecar/issues/3) |
| P1 | Wire MCP tools to real sidecar execution | [GitHub #4](https://github.com/kitepon/codex-sidecar/issues/4) |
| P0 | Implement worktree-backed `codex_work` execution | [GitHub #5](https://github.com/kitepon/codex-sidecar/issues/5) |
| P2 | Add ecosystem adapters and fixture snapshots | [GitHub #6](https://github.com/kitepon/codex-sidecar/issues/6) |
| P0 | Add explicit Codex model policy | [archived plan](CODEX_MODEL_POLICY_TODO.md) |
| P0 | Degrade schema-drifted reports to `partial` without losing completed worktrees | [archived plan](STRUCTURED_OUTPUT_TOLERANCE_PLAN.md) |
| P0 | Make long-running `codex_work` survive client restart | [archived plan](LONG_RUNNING_WORK_RESILIENCE_PLAN.md) |
| P2 | Add `codex-sidecar --version` | [archived plan](CLI_VERSION_PLAN.md) |

Lattice is the formal successor to CodeGraph. Current architecture and optional sensor use are owned by
[`docs/ARCHITECTURE.md`](../ARCHITECTURE.md); this archive is not an operating contract.
