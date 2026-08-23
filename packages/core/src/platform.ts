// OS依存判定の唯一の置き場。本製品はPOSIX専用契約（hard link・process group・ps由来のprocess identity）を持ち、
// win32ゲートはこのpredicateだけを使う。エラーの型・code・messageは各所有moduleが従来どおり保つ。
export function isWin32(): boolean {
  return process.platform === "win32";
}
