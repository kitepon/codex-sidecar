# AGENTS.md

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

## Commands

想定コマンド:

```bash
git status --short --branch
corepack pnpm install
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

この環境では bare `pnpm` shim が PATH にない場合がある。`corepack pnpm` を使う。
勝手に別の package manager へ切り替えない。

追加のglobal wrapperやMCP登録は開発の前提にしない。任意のLattice sensor indexは
補助情報として使えるが、sourceの直接確認を置き換えない。

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

## Documentation Rules

- 現役文書は`docs/README.md`に列挙する。同じ目的の現役文書は、contractに最も近い
  1文書へmergeする。
- 完了plan、handoff、release作業記録、置換済みoverviewは`docs/archive/`へ移す。
  immutableな外部参照があるpathだけ、archiveへの短いstubを残す。
- ADRとevidenceは判断・受入の履歴であり、現行操作の正本にしない。
- install、config、state/schema、migration、diagnostics、recovery、update、releaseは
  本repoが所有する。dotagentsには製品横断wireと互換projectionだけを置く。
