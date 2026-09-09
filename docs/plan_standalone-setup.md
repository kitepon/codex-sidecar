# 製品所有の導入・MCP登録

## 目的と範囲

既存CLIに `setup` を加え、初回・再実行・更新で同じ前提確認、4 AIのstdio登録、読戻し、MCP実効確認を実行する。変更範囲は本repoと本製品の導入先だけ。工場・別製品repoは変更しない。3 package、project設定、auth保護の契約を維持する。

## 工程

- [x] fetch、dirty/stash、製品正典、公開npm版の確認。
- [x] CLI関連ベースライン32件成功。
- [x] 登録の既存形とOS別機能の実測、境界設計。
- [x] setup、診断、OS能力判定の実装とfocused試験。
- [x] 別ベンダーの境界反証と全ドキュメント点検。
- [ ] 製品release gate、main統合、commit/push、3 package公開。
- [ ] Aiterm SSHセッションで公開npm版の公式導入、setup、実機smoke。
- [ ] 実測・未実施・工場から削除できる処理を報告。

## 裁定と検証

F: 設定所有範囲、公開契約、auth保持、受入、公開と実機導入は親が担当。
A: 共通設定処理とOS/AI adapterの実装。実装は親が直列で行う。登録形式と能力判定が設計に依存するため、並列writerを置かない。独立反証は別ベンダーへ読取り専用で依頼する。
H: 資格情報・外部公開サービスに人の操作が必要な場合だけ停止する。

機能を根拠なくWindowsへ全面移植しない。所有外登録、env、timeout、無効化を維持し、project設定を自動生成しない。初回、再実行、更新、古い登録、所有外保持、失敗の非0終了をfocused試験で確認する。実機共有設定への導入は同一端末で他製品と同時実行しない。

## 着手証拠

開始HEADは459405795b2548646c845a462d71d60248cdba59、dirty/stashなし。fetch後の先行2コミットを実diff確認し、48f1f3aへfast-forward。公開npm版はcore/CLI/MCPとも0.3.11、repo manifestは0.3.12。作業branchはkitepon-rgb/standalone-setup。

Windows SSHはPowerShell 7.6.5 / Node 24.19.0。公開0.3.11のauth-statusはRUN_UNSUPPORTED_PLATFORMでexit 1。Linux SSHの同コマンドはavailable。

外部不足: AitermのMac PTYからSSHしたWindowsでmark:trueがPOSIX printfを送った。通常send/readは利用可能。必要な公開契約はSSH先shellに適合する完了検知。Aiterm repoは変更しない。

## 現在地

0.3.13の実装・3 package更新・local release gate・最低Node版のtarball導入を確認済み。
公開は未実施。GitHub APIでこのrepoのself-hosted runnerは0件、直近5件のCIはcancelled。
mainへの統合・push後に今回のCIの実状態を確認する。必要な外部契約は、製品workflowの
`factory`と各環境ラベルを持つrunnerがこのrepoのjobを実行できること。
MacのSSHはlocalhost・127.0.0.1・LANアドレスで接続不成立。Linux workstationの現行SSH先は未確認。
公開前のtarball試験を、公開npm版の実機導入の代わりには数えない。
