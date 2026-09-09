# 製品所有setupの公開前検証

実測日: 2026-09-10。対象manifest: core / CLI / MCPとも0.3.13。
この記録は公開前の検証であり、公開npm版の実機導入成功を示すものではない。
最終実装commitは`c2dcd2ce6dd53ce140e8272976b3c1c249a9be63`。
[CI 34375601938](https://github.com/kitepon/codex-sidecar/actions/runs/34375601938)でMac・Linux server・Linux workstation・Windowsの4環境すべて成功した。
設計の採否は[ADR 0020](../adr/0020-product-owned-setup.md)、工程履歴は[作業計画](../archive/plan_standalone-setup.md)を参照する。

## 確認結果

| 検証 | 結果 |
| --- | --- |
| local typecheck / lint / build | 成功 |
| core全試験 | 280成功、OS固有2件skip |
| CLI全試験 | 33成功 |
| MCP全試験（stdio / HTTP） | 19成功 |
| setup実プロセス結合試験 | 2成功。初回・再実行・check・project不正・timeout・stderr非露出 |
| release/repository gate | 11成功。npm 12のpack出力形式への対応後に再確認 |
| setup focused試験 | 11成功。初回・更新・旧登録・所有外保持・無効化・失敗・部分結果・env・local優先・project衝突 |
| Windows nativeのfocused試験 | setup 11成功、Windows resolver 16成功。PowerShell 7.6.5 / Node 24.19.0、Aiterm SSHで実施 |
| WindowsのACL保存経路 | PowerShell 7へ修正後、runnerと同じPATHで保存最小試験とruntime error store関連試験が成功 |
| Linux serverのfocused試験 | setup 11成功、Windows resolver 16成功。Aiterm SSHで実施 |
| 3 packageのtarball | 想定外ファイルなし、CLI/MCPのcore依存は0.3.13でworkspace指定なし |
| 最低Node 22.13.0 | 隔離prefixへ3 tarballをnpm導入し、CLI版・4 AI初回setup・check・runtime error store診断が成功 |
| Docker HTTP | e9e2f7dからLinux serverでimageをbuild。localhostの一時portでinitializeが0.3.13を返した。containerは削除済み |
| 全文書点検 | 現役の導入案内・構成・protocol・3 package README・日英overviewを更新。ADR/evidence/archiveは履歴として維持。Markdownリンク閉包とOS表の生成照合が成功 |

実端末のHOMEをcwdにした試験で、fixtureが所有外project登録を読んでSETUP_SCOPE_CONFLICTになった。
試験のprojectを隔離homeへ明示して修正し、同じWindows/Linux環境で再確認した。製品コードの修正ではない。

## OS・AI・機能の観測範囲

| 機能 | Mac native | Linux server native | Windows native | Linux workstation |
| --- | --- | --- | --- | --- |
| Claude / Codex / Grok / Cursor登録と実MCP status | ローカル隔離tarballで4/4成功 | SSH・隔離tarballで4/4成功 | SSH・隔離tarballで4/4成功 | 未実施 |
| 同じsetupの再実行・check | 成功 | 成功 | 成功 | 未実施 |
| project診断・同期dry-run | local関連試験で成功 | SSH・隔離tarballで成功 | SSH・隔離tarballで成功 | 未実施 |
| runtime error store snapshot | 最低Node版で成功 | SSH・隔離tarballで成功 | SSH・隔離tarballで成功 | 未実施 |
| 実モデル実行・同期work | 今回の実モデルsmokeは未実施 | 今回の実モデルsmokeは未実施 | POSIX依存のため未対応 | 未実施 |
| async work | 関連試験で成功、実モデルsmoke未実施 | 今回の実モデルsmokeは未実施 | RUN_UNSUPPORTED_PLATFORMの非0終了を確認 | 未実施 |
| auth-status | 今回の実機smoke未実施 | 既存公開版でavailable | 既存公開版・既存cacheでRUN_UNSUPPORTED_PLATFORM。空cacheではavailable | 未実施 |
| 公開npm版の更新・共有AI設定の導入 | 未実施 | 未実施 | 未実施 | 未実施 |

4/4は保存・読戻しした各設定でMCP initialize / tools/list / status呼出しを実施した値である。
AI本体の再読込、組織policy、model turn成功までを表すものではない。
Windows/Linuxのtarball導入・CLI実行は、Mac上のAiterm永続PTYからSSHした同じセッションで
公式`npm install --global --prefix`を使った。設定と試験projectは製品所有の隔離領域に置いた。
通常のglobal導入先と共有AI設定は更新していない。

## 外部の未充足条件

- GitHub APIのrepo runner一覧は0件を返したが、CI 34373924747の実jobはOrganization runnerで
  4環境とも実行された。repo一覧からrunner不在と推定した判断は撤回する。
  Mac/Linux server/Linux workstationは成功。Windowsは保存処理のpowershell.exeがPATHに無く失敗した。
  SSHでrunnerのPATHを再現し、powershell.exeはENOENT、pwsh.exeはexit 0、保存focused試験は失敗を確認した。
  製品のACL呼出しをPowerShell 7へ変更したc304ba7のCIではWindowsのcore/CLI/MCP試験が成功した。
  残った配布物検査の`spawnSync npm ENOENT`もPowerShell 7起動へ修正し、c2dcd2cの全環境CIが成功した。
- MacのSSHはlocalhost / 127.0.0.1でConnection refused、LANアドレスでも接続不成立。
- Linux workstationは既存SSH設定から特定し、main-server経由で同じAiterm PTYからSSHログインした。
  Mac鍵による直接接続はpublickey拒否。既存のmain-serverの鍵とknown_hostsを使用し、鍵の登録・変更はしていない。
  Windows nativeもSSH接続できた。WSLやDockerをWindows実機試験の代わりに使っていない。
- npm公開用認証はMac/Windowsが401、Linux2台は未ログイン。公式web loginで本人認証が必要。
- AitermのMac PTYからSSHしたWindowsでmark付き送信がPOSIX printfを混入した。
  通常send/readは利用可能。必要な契約はSSH先shellに適合する完了検知。別repoは変更していない。

## 工場から除去できる代行処理

公開版の実機導入が通った後、4 AIのstdio登録生成・旧command/argsの置換・Windows npm shimの
利用側解決・設定読戻し・MCP接続確認を`codex-sidecar setup`に置き換えられる。
更新は3 packageの公式npm更新後に同じsetupを呼ぶ。診断は`setup --check`を使う。
工場の外部監視、CI runner、認証ログイン、project設定をsetupへ移管したとは扱わない。
