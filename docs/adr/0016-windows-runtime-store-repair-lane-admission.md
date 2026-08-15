# ADR 0016: Windows runtime error store修理を統括レーンで扱う

## Decision

Windows欠陥の修理、macOS/Windows/Linux/WSL2互換受入、commit/push、npm公開、
global install、公開後smokeが多段に連鎖するため、この作業を統括レーンで扱う。

実装は親が直接所有する。外部writerやsub-agentは使わない。挙動修正は
Windows ACL子processのbounded実行と重複呼出し除去だけに限定し、
POSIXのownership/mode契約とstate schemaは変更しない。

## 根拠

- campaign計画: `docs/plan_windows-runtime-error-store-repair.md`
- lane条件: `chained_acceptance=true`
- オーナー承認: 異常対象repoのcloneと修正を行い、macOS/WSL2を壊さないこと。
