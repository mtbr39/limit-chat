import { useState, useEffect } from 'react';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/** この間隔で「まだ見ています」を打つ */
const HEARTBEAT_MS = 20_000;
/** 最後の在席打刻からこの時間以内ならオンラインとみなす */
export const ONLINE_TTL_MS = 45_000;

/** 最終在席時刻がオンライン扱いか */
export function isOnline(lastSeenAt: number | undefined, now: number): boolean {
  return lastSeenAt != null && now - lastSeenAt <= ONLINE_TTL_MS;
}

/**
 * 「いまサイトを開いているか」を扱うフック。
 * タブが見えている間だけ lastSeenAt を打ち続け（ハートビート）、
 * オンライン判定は lastSeenAt から時刻で導出する（脱落判定と同じ発想）。
 * 離脱後も lastSeenAt は残すので「何分前にオンラインだったか」を表示できる。
 *
 * @param enabled メンバー登録済みのときだけ在席を記録する
 * @returns uid ごとの最終在席時刻マップ
 */
export function usePresence(
  groupId: string | null,
  uid: string | null,
  enabled: boolean
): Map<string, number> {
  const [lastSeen, setLastSeen] = useState<Map<string, number>>(new Map());

  // 自分の在席を打刻する
  useEffect(() => {
    if (!groupId || !uid || !enabled) return;
    const ref = doc(db, 'groups', groupId, 'presence', uid);

    let stopped = false;
    const beat = () => {
      if (stopped) return;
      if (document.visibilityState !== 'visible') return;
      setDoc(ref, { lastSeenAt: Date.now() }, { merge: true }).catch(() => {});
    };

    beat();
    const id = setInterval(beat, HEARTBEAT_MS);
    // タブに戻ってきた瞬間にも打つ（間隔待ちで遅れないように）
    document.addEventListener('visibilitychange', beat);

    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', beat);
      // 離脱時に記録は消さない。TTL を過ぎればオフライン表示になり、
      // 最終在席時刻は「何分前にオンライン」の表示に使う。
    };
  }, [groupId, uid, enabled]);

  // 全員の在席を購読する
  useEffect(() => {
    if (!groupId) {
      setLastSeen(new Map());
      return;
    }
    return onSnapshot(collection(db, 'groups', groupId, 'presence'), (snap) => {
      const map = new Map<string, number>();
      for (const d of snap.docs) {
        const seen = d.data().lastSeenAt;
        if (typeof seen === 'number') map.set(d.id, seen);
      }
      setLastSeen(map);
    });
  }, [groupId]);

  return lastSeen;
}
