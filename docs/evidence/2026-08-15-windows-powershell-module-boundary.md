# Windows PowerShell module boundary（2026-08-15）

## 追加再現

timeout分離後もWindows focused testは失敗した。失敗fixtureへ製品の
`readSidecarRuntimeErrors`を直接実行すると、ACL helperはexit 41を返した。

同じNode child境界でstderrを一時観測すると、Windows PowerShell 5.1は
`Get-Acl`を見つける一方、`Microsoft.PowerShell.Security` moduleをautoloadできず、
`$acl`とownerがnullになっていた。process自体はnon-terminating errorのためexit 0で、
後続のowner比較がexit 41へ変換していた。

同じACL scriptを親PowerShellから直接実行するとexit 0でowner-only ACLを適用できた。
差はNode childが継承したPowerShell 7由来の `PSModulePath` だった。

## 修理境界

Windows PowerShell 5.1子processのenv複製から、case-insensitiveに
`PSModulePath` keyだけを除く。他のenv、ACL script、owner/SID比較、権限条件は変更しない。
子processは自身の既定module pathを構築し、正規Windows moduleをautoloadする。
