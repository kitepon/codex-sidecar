# Documentation map

This is the single canonical index for `codex-sidecar` documentation. The
repository owns every contract needed to install, configure, operate,
diagnose, recover, update, and release the product on its own. `dotagents` may
consume those public contracts for factory integration, but it does not own or
control the product's internal operation.

`codex-sidecar` is a pnpm monorepo that runs Codex as a controlled sidecar for
reviews, exploration, risk checks, structured generation, and scoped work in
isolated git worktrees. Package versions are owned by the root and package
manifests; this map does not duplicate their mutable value.

## Current Docs

- [../README.md](../README.md): public overview, standalone installation, supported commands, current status, and development entrypoints.
- [../README.ja.md](../README.ja.md): Japanese public overview and standalone operating guide.
- [../AGENTS.md](../AGENTS.md): product-owned engineering and documentation rules.
- [USAGE.md](USAGE.md): CLI/MCP usage, durable async recovery controls, GPT-5.6 settings, release procedure, and structured result examples.
- [PLATFORM_SUPPORT.md](PLATFORM_SUPPORT.md): 製品の能力定義から生成するOS別対応表。
- [plan_standalone-setup.md](plan_standalone-setup.md): 導入・登録の製品所有化の作業計画（完了時にarchiveへ移動）。
- [ARCHITECTURE.md](ARCHITECTURE.md): package boundaries, layering, safety model, isolated configuration, and result contract.
- [PROTOCOL.md](PROTOCOL.md): Codex App Server protocol boundary, schema-partial behavior, and stable sidecar contracts.
- [TODO.md](TODO.md): reproduced, unresolved product defects only.

## Decisions

Architecture decision records and acceptance evidence are indexed at
[adr/INDEX.md](adr/INDEX.md).

## Archive

Historical plans and external handoff briefs live under [archive/](archive/).
Archived material explains past decisions but is never a source of current
behavior. ADRs and acceptance evidence remain in their dedicated directories
because they are immutable records rather than operating instructions.

## Documentation lifecycle

- A current document is listed in this file and owns one distinct purpose.
- When two current documents explain the same contract, merge them into the
  document closest to that contract and update every reference.
- Move completed plans, release work records, handoffs, and superseded
  overviews to `archive/`; retain a current-path stub only when an immutable
  external record depends on that path.
- Product installation, configuration, state/schema, migrations, diagnostics,
  recovery, updates, and releases stay in this repository. Cross-product
  wiring and compatibility projections belong to `dotagents`.
