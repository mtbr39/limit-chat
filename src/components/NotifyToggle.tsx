import { useState } from 'react';
import {
  notifySupported,
  notifyEnabled,
  notifyDenied,
  enableNotify,
  disableNotify,
} from '../lib/notify';

/** ブラウザ通知のオン／オフ切り替えボタン */
export function NotifyToggle() {
  const [enabled, setEnabled] = useState(notifyEnabled());
  const [denied, setDenied] = useState(notifyDenied());

  if (!notifySupported()) return null;

  if (denied) {
    return (
      <p className="notify-toggle denied">
        通知がブラウザ側でブロックされています。アドレスバーのサイト設定から許可してください。
      </p>
    );
  }

  const toggle = async () => {
    if (enabled) {
      disableNotify();
      setEnabled(false);
    } else {
      const ok = await enableNotify();
      setEnabled(ok);
      setDenied(notifyDenied());
    }
  };

  return (
    <button type="button" className="notify-toggle ghost-link" onClick={toggle}>
      {enabled ? '🔔 通知オン（クリックでオフ）' : '🔕 通知をオンにする'}
    </button>
  );
}
