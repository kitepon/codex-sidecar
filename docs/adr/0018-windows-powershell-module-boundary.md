# ADR 0018: Windows PowerShell 5.1へ親のPSModulePathを継承しない

## Decision

ACL helperがWindows PowerShell 5.1を起動する時、複製したchild envから
`PSModulePath` keyだけをcase-insensitiveに除く。

これによりWindows PowerShell 5.1自身の既定module pathを使い、
`Microsoft.PowerShell.Security`を正規autoloadする。他の環境変数、ACL script、
owner-only条件、fail-closed挙動は維持する。

## 根拠

PowerShell 7由来のmodule pathを継承したWindows PowerShell 5.1では
`Get-Acl` module autoloadが失敗し、owner比較がexit 41になった。
同じscriptは親から直接実行すると成功したため、stateやACLではなくchild env境界が原因である。

`Import-Module`のabsolute path固定はWindows version/layoutを焼き込むため採用しない。
module load失敗の握り潰し、別ACL commandへのfallback、ACL要件緩和も採用しない。
