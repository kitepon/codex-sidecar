# Windows runtime error store local gate（0.3.9）

## Focused

- Windows owner-only ACL回帰: 1 pass、0 fail。
- factory error store suite: 16件、13 pass、3 platform skip、0 fail。
- CLI factory関連: 11 pass、0 fail。

## Related

- core: 112件、100 pass、12 Windows非適用skip、0 fail。
- CLI: 32件、30 pass、2 Windows非適用skip、0 fail。
- MCP: 19 pass、0 fail。
- typecheck、lint、build、release commit gate、`git diff --check`: すべてexit 0。

version bump直後、CLI factory診断testがfixtureの固定0.3.8を参照して1件失敗した。
fixtureと期待値をpackage manifest version参照へ修正し、CLI全件を再実行してgreenを確認した。
一時的に同時発生したresolver helper 2件はCLI単独再現でgreenとなり、製品変更を加えていない。

## Windows実state

workspace buildの0.3.9 CLIで既存stateに対して次を確認した。

- `factory-diagnostics`: exit 0、overall/runtime error storeともready。
- `factory-errors --action snapshot`: exit 0、schema v2、records 0。
- 前後のstore SHA-256は同一で、read-only診断がstateを書き換えていない。

## Package

core/CLI/MCP tarballはすべて0.3.9。CLI/MCPのcore依存はregistry-safeな0.3.9へ変換済み。
公開repository metadataは `git+https://github.com/kitepon/codex-sidecar.git`。

pack directory:
`C:\Users\kite_\AppData\Local\Temp\codex-sidecar-release-0.3.9-cace824760de477081f23ab5e6992012`
