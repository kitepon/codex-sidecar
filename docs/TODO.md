# Unresolved defects

This file contains only reproduced, unresolved defects owned by `codex-sidecar`.
Completed work is archived in
[`TODO-completed-baseline-20260830.md`](archive/TODO-completed-baseline-20260830.md).

## Reproduced on 2026-07-18

- [ ] **A stale sync-session auth lease can block the work queue with no usable
  recovery path.** A durable lease whose owner process was gone and whose
  journal had no open handles left `codex_work_start` queued at `auth-queue`.
  `codex_work_auth_recover` refused because the queued work run was not the
  lease owner. Add dead-owner evidence and an exact sync-session recovery entry.
- [ ] **`codex-sidecar-mcp` startup can hang indefinitely when durable lease
  state is wedged.** A fresh Codex TUI remained at MCP startup for more than 12
  minutes. Startup must remain bounded and expose degraded diagnostics instead
  of waiting forever on lease/state acquisition.
- [ ] **MCP processes and auth-session directories are not retained or reaped.**
  About 25 `codex-sidecar-mcp` processes and 96 auth-session directories were
  observed. Add a product-owned idle/parent-death lifecycle and retention rule.
- [ ] **Caveat advisory integration fails on every prompt with only a truncated
  sidecar error.** Reverify after the lease defects are fixed and return a
  bounded diagnostic reason when the advisory path is unavailable.
- [ ] **A read-only `codex_opinion` can be refused with `AUTH_LEASE_BUSY` while
  no work was intentionally running.** After stale-lease recovery is fixed,
  determine whether read-only workflows need the exclusive lease or a bounded
  queue with explicit holder diagnostics.

## Rules

- Keep only reproduced, unresolved product defects here. Move completed items
  and release records to `docs/archive/`.
- Do not close an item until a focused test or real smoke proves the behavior.
- `codex_work` remains isolated in a git worktree; no recovery shortcut may
  write into the active working tree.
