# 0020: 導入とMCP登録を製品が所有する

日付: 2026-09-10。Decision: 実装境界を採用。公開・実機の最終結果は受入証拠で別途確定する。

## 境界

`core`が4 AIの設定adapter、npm起動情報の解決、保存・読戻し・MCP probe、OS能力を所有し、
CLIは`setup`引数の解釈と非0終了だけを担当する。MCPはproject/auth不要の製品statusを公開する。
3 packageと既存project/auth契約を維持する。dotagentsや別製品repoへ変更を加えない。

## 独立反証と親の裁定

別ベンダーGrok 4.6 highが読取り専用で設計と実装を検査した。
設計4観点、実装2指摘を重複整理し、優先順位・更新・model継承・環境の境界で反証した。
実装検査の完了観測は2026-09-09T15:48:04.059Z。

| 指摘 | 裁定と根拠 |
| --- | --- |
| Claudeのuser登録だけでは既存local登録が優先される | 採用。同じuserファイル内の既存local登録もcommand/argsを更新し、現在projectの実効登録でprobeする。公式CLIの隔離実測とfocused testで確認。user登録先自体が誤りという部分は公式仕様から棄却。 |
| Windowsの絶対entrypointが更新後に古くなる | 棄却。初回・更新・再実行は同じnpm解決処理を通る。旧commandから別entrypointへの更新を試験で確認。実機導入の結果は別証拠とする。 |
| project無しの初回導入とproject設定必須が矛盾する | 採用。製品statusはproject/auth不要、project指定時だけ既存設定のdry-runを追加する。実MCP試験で両経路を確認。 |
| TOML整形で隔離Codexのmodel継承が消える | 棄却。smol-tomlはtop-level modelをtableより前に出力する。既存のmodel・effortと配置を試験で確認した。 |
| shellのHTTP transport envを無視しstdioへ強制すべき | 棄却。既存envの意味を黙って変更できない。現行は共有設定への書込み前に衝突を明示する。stdioで実際に接続できない環境を成功扱いしない。 |
| PATH先頭の非公式wrapperを飛ばし後続npmを使うべき | 棄却。PATHで実際に選ばれるコマンドとの不一致を隠す。現行はSETUP_MCP_INVALIDで止め、古いwrapperの混在を可視化する。 |

盲点確認では公式仕様と追加突合し、Grokのenv展開・起動timeout、登録cwdを補正した。
Grokの未展開envは失敗するfocused testを先行して原因を固定し、修正後に成功した。
既存のmodel、auth、env、timeout、無効化、他登録の値保持と非0終了を受入条件に含めた。

## 公開の受入条件

製品release gate、tarball/最低Node版、mainへの着地とCI成功を公開前に確認する。
公開後はAitermのSSHセッションで公式npm導入・setup・実効smokeを行う。
SSH接続不能や人の操作待ちを模擬試験で代替せず、未実施として区別する。
