# 製品所有setupの公開版検証

実測日: 2026-09-10。公開対象commit: `22b2a7c2a1e696102ca3436e3d5beb8011318783`。
core・CLI・MCPの0.3.13を依存順でnpm公開し、各版とCLI/MCPのcore依存0.3.13をregistryから取得した。
公開直後の404/ETARGETは配布反映後に解消した。公開済み版の再公開は行っていない。
実装と公開前の検証は[公開前記録](2026-09-10-standalone-setup-prepublication.md)を参照する。

## 公開npm版の実端末導入

MacのAiterm永続PTYから各端末へSSHし、同じセッションで公式の
`npm install --global --prefix ~/.codex-sidecar/public-0.3.13`に3 packageの0.3.13を指定した。
WindowsのprefixはUSERPROFILE配下で、PowerShell 7を使用した。
試験のHOMEとprojectは製品専用prefix内に作り、試験終了後に削除した。

| 検証 | Linux server | Linux workstation | Windows native |
| --- | --- | --- | --- |
| 公開3 packageの新規導入 | 成功 | 成功 | 成功 |
| 未登録のsetup --check | 非0終了 | 非0終了 | 非0終了 |
| Claude・Codex・Grok・Cursor初回登録 | 4/4成功 | 4/4成功 | 4/4成功 |
| 同じsetupの再実行・check | 成功 | 成功 | 成功 |
| 登録ごとのinitialize・tools/list・status | 4/4成功 | 4/4成功 | 4/4成功 |
| project診断・explore dry-run | 成功 | 成功 | 成功 |
| runtime error store snapshot | 成功 | 成功 | 成功 |
| 未対応async workの非0終了 | 対象外 | 対象外 | RUN_UNSUPPORTED_PLATFORM、exit 2 |

実モデルturn、AI本体の再読込、通常のglobal prefixへの更新、共有AI設定への切替は未実施。
MacはSSH接続が未成立のため、指定された手順による公開版導入は未実施。
共有AI設定の更新は他製品の導入と重複しない条件を確認してから行う。

## 操作中の失敗と復旧

WindowsのSSHが切断済みであることを確認せず送信したため、PowerShell用コマンドが
Macのzshへ届いた。npmがrepo内の`codex-sidecar-core@0.3.13/`をprefixとして
CLI/MCPを導入した。作成先を確認し、公式npm uninstall後に空ディレクトリを除去した。
共有AI設定へのsetupは実行されず、git statusがcleanに戻ったことを確認した。
WindowsへSSH再接続し、PowerShell 7のpromptを確認してから公開版導入を実施した。

## 工場からの移管範囲

4 AIのstdio登録生成、旧command/argsの置換、Windows npm shimの利用側解決、
読戻し、実MCP接続確認を`codex-sidecar setup`で代替できる。
運用端末の工場設定代行を撤去するのは、その端末の共有設定への切替完了後とする。
工場の監視、CI runner、認証ログイン、project設定は移管対象に含めない。

## 通常の導入先への更新完了

同日、オーナーがMacはこの端末であるためSSH不要と明示した。
MacはローカルAiterm、他の3端末はSSH接続を確認した同じAitermセッションで実施した。
通常のglobal prefixへ3 packageの0.3.13を公式npmで導入し、存在する4 AI設定を
製品領域のtarへ保存してから、製品のsetupとsetup --checkを端末ごとに順次実行した。

| 端末 | 通常globalの3 package更新 | setupの登録 | checkの実MCP確認 |
| --- | --- | --- | --- |
| Mac | 成功 | 4 AI更新 | 4/4 verified |
| Linux server | 成功 | 4 AI更新 | 4/4 verified |
| Linux workstation | 成功 | 3 AI更新、Grok新規作成 | 4/4 verified |
| Windows native / PowerShell 7 | 成功 | 4 AI更新 | 4/4 verified |

Macの公開版新規導入・隔離設定での初回/再実行/check/診断/dry-runも成功した。
Linux workstationはGrok設定が存在せず最初のtarが非0終了したため、setupを開始せず、
存在する設定だけでtarを作り直してから続行した。
これにより、前節のMac導入・通常global更新・共有AI設定切替の未完了条件は解消した。
実モデルturnと起動中のAI本体の再読込は今回の実測に含めない。
