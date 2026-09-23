# AGENTS.md

**この製品は退役済み。** このリポジトリは履歴参照用であり、新規導入・機能追加・releaseは行わない。

このリポジトリで作業する Codex / エージェント向けの入口メモ。

ユーザーとの会話は日本語で行う。

このリポジトリ固有の判断は本ファイルと`docs/README.md`だけで完結させる。
特定hostのglobal instructionや別repositoryを、製品開発の必須正本にしない。

## Project Purpose

`codex-sidecar` は、kitepon.dev の AI 開発基盤群から Codex を sidecar agent
として安全に呼び出すための共通実行レイヤー。

単なる `codex review` CLI ではなく、Throughline / Caveat / Latticeなどの
現役プロジェクトと接続できる「AI 作業OS」の部品として設計する。Claude Code が主で動く環境に、
Codex の別視点、反対意見、レビュー、調査、限定的な修正能力を差し込む。

同時に、汎用ツールとしても成立させる。設計は「generic core」と
「kitepon.dev ecosystem overlay」の二層に分ける。generic core は他の
リポジトリでも単体で使える CLI/MCP/安全実行基盤、overlay はユーザーの
MCP/OAuth/hook/memory/cost 系プロジェクトに強く刺さる preset / safety profile /
context adapter とする。

重要な前提:

- Claude が主導し、Codex は sidecar / second opinion として呼ばれる。
- 呼び出し元は人間だけでなく、MCP server、hook、memory tool、cost optimizer
  になり得る。
- 結果は人間向け文章だけでなく、他ツールが再利用できる machine-readable
  JSON として返す。
- このrepoは単独でinstall、設定、診断、復旧、更新、releaseできる。dotagentsは
  公開contractを統合するが、製品内部の状態や運用判断を所有しない。

対象 workflow と MCP tool:

- CLI workflow `review` / MCP tool `codex_review`: diff / branch / patch の読み取り専用レビュー
- CLI workflow `explore` / MCP tool `codex_explore`: コードベース調査とファイル参照つき回答
- CLI workflow `work` / MCP tool `codex_work`: isolated git worktree 上での小さな修正
- CLI workflow `opinion` / MCP tool `codex_opinion`: 設計案への反対意見、見落とし、代替案の提示
- CLI workflow `risk-check` / MCP tool `codex_risk_check`: OAuth / MCP / secrets / Docker / hooks / CI などの重点リスク確認
- CLI workflow `auditor` / MCP tool `codex_auditor`: primary tool-use auditor 用の `pass` / `missingTools` 判定
- CLI workflow `generate` / MCP tool `codex_generate`: caller所有schemaによる任意の構造化JSON生成

製品管理用CLIは`setup`、`diagnostics`、`factory-diagnostics`、`factory-errors`、
`auth-status`、`auth-recover`と、耐久work用の`work-start` / `work-result` /
`work-cancel` / `work-recover` / `work-auth-recover`を持つ。現在の全入口は
`docs/USAGE.md`を正とする。

非目的:

- 画像生成 API 課金の回避
- Codex App Server を一般 OpenAI API gateway として使うこと
- active working tree を Codex に自由編集させること
- approval prompt や危険操作を隠すこと

## Repository Shape

- `packages/core/`: config loading, safety policy, App Server/session handling,
  worktree isolation, normalized results
- `packages/cli/`: `codex-sidecar review|explore|work|opinion|risk-check|auditor`
- `packages/mcp/`: Claude Code などの MCP client から呼ぶ `codex_review` /
  `codex_explore` / `codex_work` / `codex_opinion` / `codex_risk_check` /
  `codex_auditor`
- `docs/`: 設計判断、protocol 方針、safety model
- `examples/`: consuming repo 側に置く `.codex-sidecar.yml` の例

## Ecosystem Context

現役の直接接続先は、明示handoffを渡す`Throughline`、罠contextを渡す`Caveat`、
repository-localなsymbol contextを提供する`Lattice`である。`codex-sidecar`は
それらを置き換えず、Codexを呼ぶ安全な実行境界、結果正規化、worktree隔離、
App Server protocol追従だけを担当する。

公開済みcontext schemaの`relay_entry`、`smartclaude_cost_hint`、
`codegraph_context`は後方互換名として維持する。これらの名前を、退役済み製品や
外部daemonへのruntime依存が現在もあるという意味に読み替えない。

## Engineering Rules

- 既存差分はユーザーの作業として扱い、勝手に戻さない。
- `codex_work` は active working tree に直接書かせない設計を守る。
- 書き込み可能 workflow では `allowed_paths` を必須にし、`deny_paths` を尊重する。
- safety / config / prompt shaping は `packages/core` に寄せ、CLI と MCP は薄く保つ。
- protocol 追従や Codex App Server の lifecycle は `packages/core` に閉じ込める。
- 導入・更新のMCP登録は`codex-sidecar setup`だけが所有する。OS/AI adapterと機能対応はcoreに置き、3 packageはそれぞれ同じ公開版へ更新する。
- 隠れたフォールバックで危険操作を進めない。失敗は明示的に返す。
- secrets / token / `.env` / OAuth DB / SQLite DB / hook config / deploy config は
  デフォルトで deny する方向を優先する。
- source の混同を避ける。official / unofficial / inferred / observed などの
  信頼境界がある場合は result schema に明示する。
- Codexを呼ぶ価値、コスト、想定効果を結果に残せるようにする。
- Operator との会話は日本語。code・comment・commit message・docs は、周囲のファイルが日本語でない限り英語で書く。
- タスク外の機能を足さない。CLI / MCP は薄く保ち、logic は core へ寄せる。

## Commands

Use `corepack pnpm`. Bare `pnpm` is not guaranteed to be on PATH in this environment and the project pins `pnpm@10.10.0` via `packageManager`. Do not switch package managers.

```bash
corepack pnpm install
corepack pnpm typecheck   # builds core first, then typechecks every package
corepack pnpm test        # core・CLI・MCPと導入結合試験
corepack pnpm build
```

Test runner is `node --test` against **compiled** `dist/*.test.js`, not source. Each package's `test` script does `tsc -p tsconfig.json && node --test dist/...test.js`. Implications:

- Running a single core test file directly:
  ```bash
  corepack pnpm --filter codex-sidecar-core build
  node --test packages/core/dist/safety.test.js
  ```
- Running a single MCP test:
  ```bash
  corepack pnpm --filter codex-sidecar-mcp build
  node --test packages/mcp/dist/index.test.js
  ```
- Filtering by test name uses node's native runner: `node --test --test-name-pattern='<regex>' packages/core/dist/<file>.test.js`.
- After editing `.ts`, you must rebuild before re-running a single test, or the new code is invisible.

`packages/cli`はcoreへ委譲し、CLI試験を持つ。導入の結合試験は3 packageのbuild後に`node --test scripts/setup-integration.test.mjs`で実行する。

製品全体の導入と更新後の登録は`codex-sidecar setup`、変更しない診断は`codex-sidecar setup --check`を使う。
AI別の共有設定保持とOS対応はcoreが所有する。手順は`docs/USAGE.md`、生成する対応表は`docs/PLATFORM_SUPPORT.md`を参照する。

Smoke a read-only App Server turn against this repo (after `corepack pnpm build`):

```bash
node packages/cli/dist/index.js diagnostics --project "$PWD" --preset review
node packages/cli/dist/index.js explore --project "$PWD" 'Reply exactly: OK'
```

追加のglobal wrapperやMCP登録は開発の前提にしない。任意のLattice sensor indexは
補助情報として使えるが、sourceの直接確認を置き換えない。

host固有の`.claude/settings.json`はgit管理外のまま、commitしない。

## Architecture

Two layers, three packages, strict one-way dependency:

```
caller (human / Claude Code / MCP client / hook)
  ↓
packages/cli ──┐
packages/mcp ──┤──→ packages/core ──→ Codex App Server (stdio)
               │                  └─→ isolated git worktree (codex_work only)
```

`packages/core` owns everything non-trivial: config loading (`config.ts`), preset expansion (`presets.ts`), path safety + safety profiles (`safety.ts`, `paths.ts`, `profiles.ts`), App Server lifecycle (`app-server-*.ts`), prompt shaping and JSON parsing (`structured-output.ts`), worktree isolation (`worktree*.ts`), and result schemas (`results.ts`, `types.ts`). CLI and MCP stay thin: they translate input into `SidecarRequest`, call core, return `SidecarResult`.

Dependency direction is enforced:

- CLI → core, MCP → core. **Never** core → CLI/MCP.
- App Server wire-format details (event names, message shapes) must not leak past `packages/core/src/app-server-*`.
- Ecosystem context enters core as **plain JSON context blocks**, not direct imports. Throughline, Caveat, and Lattice are the current neighboring products. Legacy `relay_entry`, `smartclaude_cost_hint`, and `codegraph_context` kind names remain wire-compatible; they are not runtime product dependencies. The `context.ts` adapter is the boundary.

`packages/core/src/index.ts` re-exports the entire public surface. When adding a module, add it there.

## Result contract (do not break)

Every workflow — `review`, `explore`, `opinion`, `risk-check`, `auditor`, `work` — returns a single `SidecarResult` JSON object. Each non-`generate` turn sends the workflow-specific schema in `turn/start.params.outputSchema`; Codex App Server older than 0.144.1, or an initialize response whose version cannot be verified, fails explicitly before `turn/start` with no prompt-only fallback. `generate` is excluded because its caller-owned contract may require any JSON shape. `structured-output.ts` still parses the Codex assistant turn as one JSON object with a **hard core** (valid JSON, object root, non-empty `summary` + `recommendedNextAction`) and a **soft layer** (everything else). A hard-core failure is `PROTOCOL_ERROR` / `status: "failed"` — **there is no prose fallback; do not add one.** A soft-layer failure (a drifted workflow-specific field) degrades to `status: "partial"`: the raw report is exposed verbatim in `unvalidatedReport`, violations are listed in `error`, lossless coercions are disclosed in `normalizationNotes`, and `work` still attaches `changedFiles`/`worktreePath`. Typed workflow fields are omitted on `partial` so no fabricated default (e.g. `basis="inferred"`) is presented as the model's. Only two lossless coercions run — bare confidence level string → `{ level }`, string `affectedFiles`/`fileReferences` element → `{ path }`; synonym `severity` and free-text `basis` are surfaced as violations, never guessed. See `docs/PROTOCOL.md` and `docs/archive/STRUCTURED_OUTPUT_TOLERANCE_PLAN.md`.

Workflow-specific fields — a failure here now degrades to `partial`, not `failed` (see `docs/PROTOCOL.md` §Structured App Server Output):

- `review`: `findings`, `missingTests`, `residualRisks`
- `risk-check`: `risks`
- `auditor`: `pass`, `missingTools`
- `opinion`: `recommendation`, `objections`, `assumptions`, `failureModes`
- `explore`: answer in `summary`, citations in `fileReferences`
- `work`: `tests`, `risks`

Stable contracts that must not break across releases: `SidecarRequest`, `SidecarResult`, workflow names, safety error codes, finding/risk schemas, file reference schema, context block schema, raw event log reference schema.

## Invariants

These are load-bearing. Engineering Rules の全項目とあわせて守る。

- **`codex_work` never edits the active working tree.** The runner does `git worktree add --detach`, points App Server's `projectRoot` at the isolated path, validates changed files against `allowedPaths` / `denyPaths`, and preserves the worktree by default for human review. Do not add an "active-tree" code path.
- **No hidden fallback.** If a source, transport, or protocol path fails, return an explicit error (e.g. `APP_SERVER_TIMEOUT`, `SAFETY_REFUSAL`, `PROTOCOL_ERROR`). Never silently substitute another source — especially across official/unofficial, secret/non-secret, or auth/non-auth boundaries.
- **Deny by default for sensitive files.** `.env*`, `**/*.key`, `**/*.pem`, OAuth/token stores, SQLite auth DBs, hook config, deploy config — these stay denied unless the consuming project's `.codex-sidecar.yml` explicitly opts in to read-only inspection.
- **Source boundaries are explicit.** Findings and risks carry `basis: "observed" | "inferred"` and result records distinguish trust levels. Don't blur them in normalization.
- **Model policy is opt-in, not defaulted.** If neither caller, preset, nor `defaults` set `model` / `modelReasoningEffort`, sidecar omits the `-c model=...` startup flag so Codex inherits its own `CODEX_HOME` configuration. `modelPolicy.source` is `explicit` or `inherited` — preserve that distinction.

## MCP transport modes

`packages/mcp` ships two transports selected at runtime:

- **stdio** (default): preserves the `codex-sidecar-mcp` npm bin behavior. The symlinked-bin regression test ([packages/mcp/src/index.test.ts](packages/mcp/src/index.test.ts)) covers it.
- **Streamable HTTP**: enabled with `CODEX_SIDECAR_MCP_TRANSPORT=http`. Implementation in [packages/mcp/src/server-http.ts](packages/mcp/src/server-http.ts), tests in [packages/mcp/src/server-http.test.ts](packages/mcp/src/server-http.test.ts).

Env vars for HTTP mode:

| Var | Default | Notes |
|---|---|---|
| `CODEX_SIDECAR_MCP_HOST` | `127.0.0.1` | Bind a specific interface; use a LAN IP for cross-host access. |
| `CODEX_SIDECAR_MCP_PORT` | `39201` | TCP port. |
| `CODEX_SIDECAR_MCP_BEARER` | unset | When set, every request must include `Authorization: Bearer <token>`. |
| `CODEX_SIDECAR_MCP_ALLOWED_HOSTS` | derived from host/port | Comma-separated allowlist for DNS rebinding protection. Must include both bare host and `host:port`. |

### `allowedHosts` gotcha

The MCP SDK matches the `Host` HTTP header verbatim. `["127.0.0.1"]` alone rejects a client connecting to `http://127.0.0.1:39201/` with `Invalid Host header: 127.0.0.1:39201`. The `defaultAllowedHosts` helper in [server-http.ts](packages/mcp/src/server-http.ts) computes both forms. When writing tests that bind `port: 0` (ephemeral), either resolve the port before constructing the transport or omit `allowedHosts` to disable protection.

## LAN deployment (Docker)

[Dockerfile](Dockerfile), [.dockerignore](.dockerignore), and [docker-compose.yml](docker-compose.yml) build the MCP package and expose it on a single LAN IP. The compose file parameterizes the bind host/port/volumes via env so the committed defaults can be overridden per host:

- `CODEX_SIDECAR_BIND_HOST` / `CODEX_SIDECAR_PORT`: host bind for the published port (default `192.168.1.2:39201`).
- `CODEX_HOME_HOST`: host path to `~/.codex` (Codex CLI auth, sessions). Mounted to `/root/.codex` so the container reuses host login.
- `PROJECTS_HOST`: host path to consumer repositories. Mounted to `/projects`. Callers pass `projectRoot=/projects/<repo>` — these are server-side paths, not client paths.

The image pins codex CLI to `@openai/codex@${CODEX_CLI_VERSION}` (build arg) so the App Server invoked inside the container matches the host's codex version.

Operational reset: `docker compose down` removes the container; `docker compose up -d --build` rebuilds after source changes.

## MCP distribution: the symlinked-bin gotcha

`codex-sidecar-mcp` is consumed via `npm install -g`, which puts a **symlink** on PATH. Clients (Claude Code, other MCP hosts) launch the symlink, not `dist/server.js` directly. The stdio entrypoint resolves the symlink before deciding whether it was invoked as the executable.

If you change `packages/mcp/src/server.ts` startup logic or the `bin` wiring, the MCP test (`packages/mcp/src/index.test.ts`) is what catches a regression where the globally installed command exits immediately instead of running the stdio server. Don't skip it.

## Raw event logs

App Server runs write one JSONL per turn under `<projectRoot>/.codex-sidecar/logs/app-server/`. `SidecarResult.rawEventLogRef` is the local path. The directory is git-ignored because lines contain prompts, file paths, and stderr. Treat the ref as a local debug artifact, not a portable report.

## Current Notes

現在のpackage版はrootと3 packageの`package.json`が正。CLI / MCP (stdio + Streamable HTTP) / read-only App
Server / raw event log / timeout control / worktree-backed `codex_work` /
耐久work制御 / auth recovery / product-owned runtime error store /
`factory-diagnostics` / `factory-errors` / ecosystem context adapters /
explicit Codex model policy が実装済み。
MCP の HTTP transport は `CODEX_SIDECAR_MCP_TRANSPORT=http` で有効化し、
`Dockerfile` + `docker-compose.yml` で LAN bind の sidecar として
デプロイできる (詳細は README の LAN MCP セクション / docs/USAGE.md)。

まだ残っている主な穴:

- read-only result の workflow-specific structured fields は継続強化対象。
- Throughline / Caveat の完全な Codex 対応は各 upstream repository の作業。
  `codex-sidecar` ではまず reader/context adapter と fixture を扱う。
- HTTP transport は単一 Node プロセス内の in-memory session のみ。複数プロセス /
  マルチノードで共有する場合は `EventStore` を別途実装する必要がある。

## Related Docs

- [README.md](README.md): project overview and repository layout.
- [docs/README.md](docs/README.md): current docsの唯一の索引、所有境界、文書寿命。
- [docs/TODO.md](docs/TODO.md): 未解決の再現済み製品欠陥だけを持つdurable task list。
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): package boundaries, layering, safety model, and result contract.
- [docs/PROTOCOL.md](docs/PROTOCOL.md): Codex App Server protocol boundary and stable sidecar contracts.
- [docs/USAGE.md](docs/USAGE.md): CLI / MCP examples, worktree behavior, structured result shapes

## Documentation Rules

- 現役文書は`docs/README.md`に列挙する。同じ目的の現役文書は、contractに最も近い
  1文書へmergeする。
- 完了plan、handoff、release作業記録、置換済みoverviewは`docs/archive/`へ移す。
  immutableな外部参照があるpathだけ、archiveへの短いstubを残す。
- ADRとevidenceは判断・受入の履歴であり、現行操作の正本にしない。
- install、config、state/schema、migration、diagnostics、recovery、update、releaseは
  本repoが所有する。dotagentsには製品横断wireと互換projectionだけを置く。
