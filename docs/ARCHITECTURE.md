# Architecture

## Overview

`codex-sidecar` keeps Codex orchestration in one independent project instead of
scattering protocol handling across every consuming repository.

The project is both a generic tool and part of kitepon.dev's AI developer
tooling ecosystem. Claude Code remains the primary working agent in that
ecosystem; Codex is invoked as a sidecar for a second opinion, codebase
investigation, risk analysis, and scoped work that should happen inside an
isolated worktree.

Consuming projects should only need a small `.codex-sidecar.yml` file that
declares default behavior, path boundaries, and named presets.

Callers may be humans, CLI scripts, Claude Code MCP tools, hooks, or other
automation such as memory/context/cost tools. For that reason, every workflow
must return a stable machine-readable result, with human prose treated as one
field rather than the only output.

## Ecosystem Fit

`codex-sidecar` composes with current neighboring products instead of
duplicating them: Throughline supplies explicit handoffs, Caveat supplies trap
context, and a repository-local Lattice sensor can supply symbol context. The
sidecar receives plain JSON context, shapes it for Codex, runs the session, and
returns normalized results. None of those products is required for standalone
use.

The published context kind names `relay_entry`, `smartclaude_cost_hint`, and
`codegraph_context` remain accepted for wire compatibility. They do not create
runtime imports or assert that the products named by those legacy identifiers
remain active.

Integration ownership stays with the product that must change. If
`throughline_handoff` needs more than read-only import or Codex sessions need
capture/resume, Throughline owns that feature. If `caveat_entry` needs automatic
prompt/error retrieval or Codex-origin record/update behavior, Caveat owns that
feature. `codex-sidecar` owns only its plain-JSON adapters and execution boundary.

## Layering

The architecture has two layers.

### Generic Core

This layer must be useful for any repository:

- config loading
- preset resolution
- path safety
- App Server protocol handling
- worktree isolation
- CLI/MCP request handling
- normalized JSON result contracts

### Ecosystem Overlay

This layer adds defaults and optional context for kitepon.dev projects:

- safety profiles for MCP/OAuth/hooks/Docker/memory repos
- plain-JSON context adapters, including current Throughline/Caveat input and legacy wire kinds
- risk presets for source boundaries, token stores, hooks, and public endpoints
- fixture projects that mirror the user's recurring repo shapes

Overlay code must not leak into generic behavior. A project without ecosystem
options should get a clean generic sidecar.

## Packages

### `packages/core`

Owns shared behavior:

- project config loading
- preset resolution
- explicit Codex model policy resolution
- safety policy normalization
- path allow/deny matching
- prompt shaping
- ecosystem context adapters
- Codex App Server process lifecycle
- stdio JSON-line protocol handling
- initialize / thread / turn request handling
- read-only turn completion waiting and assistant text normalization
- session/event normalization for richer result fields
- worktree isolation for write operations
- durable work manifests, run-control records, and recovery projection
- global canonical-auth lease ownership for durable work
- result schemas and JSON contract normalization
- diagnostics and raw event log references
- the product-owned runtime error store and its schema migration
- native factory diagnostics and bounded runtime-error projections

### `packages/cli`

Provides local commands:

- `codex-sidecar review`
- `codex-sidecar explore`
- `codex-sidecar work`
- `codex-sidecar work-start`, `work-result`, `work-cancel`, `work-recover`, and
  `work-auth-recover`
- `codex-sidecar opinion`
- `codex-sidecar risk-check`
- `codex-sidecar auditor`
- `codex-sidecar generate`
- `codex-sidecar diagnostics`, `factory-diagnostics`, and `factory-errors`
- `codex-sidecar auth-status` and `auth-recover`

The CLI should stay thin and delegate policy decisions to `core`.

The CLI is also the generic user-facing entrypoint. It does not require
Throughline, Caveat, Lattice, dotagents, or any other ecosystem project.

Read-only workflows call Codex App Server through `core`. Write workflows run
through isolated git worktrees and return reviewable changed-file metadata
without touching the active working tree.

Synchronous `work` is retained for direct use. Async work is a separate control
surface: the caller-held idempotency key identifies a durable run, while start
and result use a run-control union rather than overloading `SidecarResult` with
nonterminal states. After launch handoff, the worker is detached from the
coordinator and durable records live under the repository's git common
directory. This lets a new CLI/MCP process recover a run after stdio or caller
loss without treating a transport session as execution ownership.

CLI model flags are request overrides. If omitted, model policy still resolves
inside `core` from preset/default config, or remains absent so Codex can inherit
its own isolated configuration.

The isolated `CODEX_HOME` carries only permitted top-level model configuration
from the user-global `$CODEX_HOME/config.toml`: `model`, `model_provider`, and
`model_reasoning_effort`. Context-window and auto-compaction threshold overrides
are deliberately not copied, so Codex uses its defaults unless a trusted project
configuration applies. All TOML tables are excluded. Trusted project
`.codex/config.toml` is not copied; Codex loads it from the thread working
directory, which is the isolated worktree for async work.

### `packages/mcp`

Provides an MCP server for Claude Code:

- `codex_review`
- `codex_explore`
- `codex_work`
- `codex_opinion`
- `codex_risk_check`
- `codex_auditor`
- `codex_generate`
- `codex_work_start`, `codex_work_result`, `codex_work_cancel`,
  `codex_work_recover`, `codex_work_auth_recover`

The MCP layer exposes stable tool schemas and translates calls into the same
`core` request types used by the CLI. Read-only tools use the shared core
execution path and return `SidecarResult` JSON as structured MCP content.

MCP model fields mirror the CLI flags and remain optional for inherited Codex
configuration.

The MCP package is also a distributed npm `bin`. Its stdio entrypoint must work
when invoked through npm's symlinked command path, because Claude Code and other
MCP clients normally launch `codex-sidecar-mcp` from PATH rather than importing
the real `dist/server.js` file directly.

Transports are selected at runtime, not at build time. Two are supported:

- **stdio** (default): the existing npm-bin path, used by Claude Code, MCP
  inspector, and local hooks. Tools and call semantics are identical to the
  HTTP transport — only the framing differs.
- **Streamable HTTP** (`CODEX_SIDECAR_MCP_TRANSPORT=http`): a long-running
  process bound to a chosen host/port, serving multiple LAN clients. Sessions
  are in-memory per Node process; resumability via `EventStore` is not enabled
  by default. DNS rebinding protection and optional bearer-token auth are
  configured through env so deployment policy lives in compose/systemd, not in
  the codebase.

Read-only tools should be easy to call. Write-capable tools must require an
explicit project config and must surface safety refusals as structured errors.

The repository ships a `Dockerfile` and `docker-compose.yml` for the HTTP
transport. The image pins `@openai/codex` and mounts the host's `~/.codex` so
the Codex CLI inside the container reuses host authentication. Server-side
`projectRoot` paths under `/projects/<repo>` map to host paths under the
configured `PROJECTS_HOST`.

## Suggested Core Modules

Inside `packages/core/src`:

- `config`: load and validate `.codex-sidecar.yml`
- `presets`: expand preset names into normalized requests
- `safety`: read/write policy checks
- `paths`: glob matching, path normalization, traversal defense
- `profiles`: generic and ecosystem safety profiles
- `results`: JSON schemas and result builders
- `app-server`: request builders for Codex App Server methods
- `app-server-client`: stdio process client, JSON-line parser, requests, notifications
- `app-server-events`: notification helpers for turn completion and assistant text
- `app-server-runner`: read-only execution path and `SidecarResult` conversion
- `worktree`: isolated worktree lifecycle
- `worktree-runner`: `codex_work` execution inside an isolated git worktree
- `context`: optional plain JSON context block adapters
- `structured-output`: workflow-specific prompt shaping and output parsing
- `diagnostics`: config and normalized-request checks through CLI and dry-run surfaces

## Safety Model

Read-only workflows may inspect files and git state inside the target project.
Write workflows must use an isolated git worktree and must be constrained by
`allowed_paths` and `deny_paths`.

Default deny categories should include secrets, `.env`, private keys, OAuth
token stores, SQLite auth databases, hook registration files, deployment
overrides, and generated artifacts unless a consuming project explicitly allows
safe read-only inspection.

Approval prompts, dangerous operations, and Codex App Server policy decisions
must remain visible to the user. The sidecar should normalize outputs, not hide
important control-flow decisions.

Durable work control is fail-closed. Cancel is an explicit durable intent;
quarantine and auth recovery require operator confirmation. An abnormal worker
kill does not authorize automatic worktree cleanup, path-policy salvage, or
patch adoption. The canonical `CODEX_HOME/auth.json` is protected by a global
lease across projects. If an abnormal started worker has neither clean-shutdown
evidence nor run-local auth rotation, an operator can release that exact lease
only after external re-login and explicit `keep-canonical-after-login` recovery.
A complete clean journal stranded before lease unlink is eligible only for exact
`release-clean` recovery.

No hidden fallback rule: if a requested source, protocol, transport, or tool path
fails, return an explicit error. Do not silently substitute another source or
implementation path, especially where official/unofficial data boundaries,
secrets, auth, deploy, or CI behavior are involved.

Lattice is the formal successor that fully absorbed CodeGraph; independent
CodeGraph packages, MCP servers, and daemons are retired. Each project still
needs a Lattice sensor index before graph queries are valid. Sensor output is
useful for exploration, but edits and final claims still need direct file
verification.

## Result Contract

Every workflow should return a JSON object that can be consumed by other tools.
Human-readable prose is allowed, but it must not be the only interface.

Common fields:

- `status`
- `summary`
- `findings`
- `risks`
- `openQuestions`
- `fileReferences`
- `changedFiles`
- `tests`
- `confidence`
- `sourceBoundaries`
- `recommendedNextAction`
- `costNotes`

Risk and finding records should distinguish observed evidence from inference.

## Dependency Direction

Allowed:

- CLI imports core.
- MCP imports core.
- ecosystem adapters import generic core types.
- core may expose adapter interfaces.

Avoid:

- core importing CLI or MCP.
- generic safety logic importing ecosystem projects directly.
- App Server protocol code leaking into CLI or MCP.
- downstream tools parsing prose instead of JSON fields.

## Related Docs

- [../README.md](../README.md): project overview and repository layout.
- [../AGENTS.md](../AGENTS.md): working instructions for Codex and future agents.
- [README.md](README.md): docs index and archive map.
- [TODO.md](TODO.md): reproduced, unresolved product defects.
- [archive/CODEX_MODEL_POLICY_TODO.md](archive/CODEX_MODEL_POLICY_TODO.md): archived completed Codex model policy plan.
- [PROTOCOL.md](PROTOCOL.md): Codex App Server protocol boundary and stable sidecar contracts.
