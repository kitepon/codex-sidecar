# RAG Index

| Topic | Source | Retrieved | Confidence | Notes |
| --- | --- | --- | --- | --- |
| Long-running MCP / `codex_work` disconnect resilience | Claude Code / MCP / Node.js official docs + local incident evidence | 2026-07-12 | High (cause class) | Completed plan: [LONG_RUNNING_WORK_RESILIENCE_PLAN.md](../docs/archive/LONG_RUNNING_WORK_RESILIENCE_PLAN.md). Raw sources only under `mcp-long-running/raw/`. |
| 4 AIの製品所有MCP登録 | Claude / Codex / Grok / Cursor公式文書 + CLI実測 | 2026-09-10 | official / observed | [形式・優先順位・環境変数](standalone-setup/README.md)、原文抜粋は同topicのraw。 |

運用規約: dotagents/PLAN.md 原則10に従い、一次ソースは `rag/<topic>/raw/`、要約・概念記事は topic 直下、採録判断と定期 Lint はこの台帳で管理する。
