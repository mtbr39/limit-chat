/**
 * ブラウザ通知（Notification API）の共通処理。
 * タブが開いている間だけ動く。タブを完全に閉じても届く Push 通知（FCM）は
 * Service Worker とサーバー側の送信が必要になるため採用していない。
 */

const STORAGE_KEY = 'limitchat-notify';

export function notifySupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/** 権限が許可されていて、ユーザーがオフにしていなければ有効 */
export function notifyEnabled(): boolean {
  return (
    notifySupported() &&
    Notification.permission === 'granted' &&
    localStorage.getItem(STORAGE_KEY) !== 'off'
  );
}

export function notifyDenied(): boolean {
  return notifySupported() && Notification.permission === 'denied';
}

/** 権限をリクエストして有効化する。ユーザー操作（クリック）から呼ぶこと */
export async function enableNotify(): Promise<boolean> {
  if (!notifySupported()) return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  localStorage.setItem(STORAGE_KEY, 'on');
  return true;
}

export function disableNotify(): void {
  localStorage.setItem(STORAGE_KEY, 'off');
}

/**
 * 通知を表示する。
 * onlyWhenHidden を指定すると、このタブを見ているときは通知しない
 * （チャットメッセージ用。ページを見ていれば通知は不要）。
 * tag が同じ通知は上書きされ、連投で通知が積み重ならない。
 */
export function notify(
  title: string,
  body: string,
  opts?: { onlyWhenHidden?: boolean; tag?: string }
): void {
  if (!notifyEnabled()) return;
  if (opts?.onlyWhenHidden && document.visibilityState === 'visible') return;
  try {
    new Notification(title, { body, tag: opts?.tag });
  } catch {
    // Android Chrome などページからの直接生成が禁止されている環境では何もしない
  }
}
