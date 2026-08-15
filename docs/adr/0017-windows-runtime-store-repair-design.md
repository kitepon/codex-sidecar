# ADR 0017: Windows ACL子processの期限と重複検証を修正する

## Decision

1. Windows ACL子processに3秒の独立したbounded timeoutを与える。
2. Windows capture全体のbounded timeoutを10秒とする。
3. directoryは既存ACLが正しければ検証一回で通し、不正時だけ既存の
   apply-and-verifyで正規化する。
4. SQLite lockは既存fileを事前検証済みなら再適用・再検証せず、新規作成時だけ
   apply-and-verifyする。
5. atomic replacement後の最終file検証、symlink拒否、owner-only ACL、
   POSIX 0700/0600契約は維持する。

## 根拠

実測の最大1,073msに対し1秒は正常processをkillする。3秒は同じ外部境界を
boundedのまま保ちつつ、通常のWindows PowerShell起動揺らぎを許容する。
重複を除いた通常captureは複数回のACL processを必要とするため、全体期限は
子期限より長い10秒へ分離する。

単なるtimeout延長だけではprocess重複を温存するため採用しない。
ACL要件緩和、失敗の成功扱い、別commandへの暗黙fallbackも採用しない。
