import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  onSnapshot,
  getDocs,
  query,
  where,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ChatMessage, ChatDay } from '../types';
import { dayKeyOf } from '../lib/day';

const MAX_TEXT = 500;

/**
 * 常時チャット（今日ぶん）を購読して発言できるようにするフック。
 * セッションの脱落ゲームとは独立した別ストリーム。
 * 発言は `groups/{groupId}/chat` に入り、dayKey（午前4時区切りの論理日）を持つ。
 */
export function useChat(groupId: string | null, uid: string | null) {
  const [todayKey, setTodayKey] = useState(() => dayKeyOf(Date.now()));
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // 開いたまま午前4時をまたいだら、購読する「今日」を切り替える。
  // dayKey が実際に変わったときだけ state を更新して再購読を最小限にする。
  useEffect(() => {
    const id = setInterval(() => {
      const key = dayKeyOf(Date.now());
      setTodayKey((prev) => (prev === key ? prev : key));
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!groupId) {
      setMessages([]);
      return;
    }
    // where + orderBy は複合インデックスを要求するので、dayKey で絞るだけにして
    // createdAt の並べ替えはクライアント側で行う（1日ぶんなので件数は限られる）。
    const q = query(
      collection(db, 'groups', groupId, 'chat'),
      where('dayKey', '==', todayKey)
    );
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage);
      list.sort((a, b) => a.createdAt - b.createdAt);
      setMessages(list);
    });
  }, [groupId, todayKey]);

  const sendMessage = useCallback(
    async (text: string, userName: string) => {
      const body = text.trim().slice(0, MAX_TEXT);
      if (!groupId || !uid || !body) return;
      const now = Date.now();
      const dayKey = dayKeyOf(now);

      await addDoc(collection(db, 'groups', groupId, 'chat'), {
        userId: uid,
        userName,
        text: body,
        createdAt: now,
        dayKey,
      });

      // 日別ログの索引を更新する。発言があった日だけがログとして残る。
      await setDoc(
        doc(db, 'groups', groupId, 'chatDays', dayKey),
        { lastMessageAt: now, messageCount: increment(1) },
        { merge: true }
      );
    },
    [groupId, uid]
  );

  return { messages, todayKey, sendMessage };
}

/** 発言のあった日（＝日別ログ）の一覧を購読する。新しい日が先頭 */
export function useChatDays(groupId: string | null) {
  const [days, setDays] = useState<ChatDay[]>([]);

  useEffect(() => {
    if (!groupId) {
      setDays([]);
      return;
    }
    // ドキュメント ID(__name__)での orderBy は追加インデックスを要求するので、
    // 並べ替えはクライアント側で行う（日別ログは件数が少ない）。
    // dayKey（"YYYY-MM-DD"）は文字列比較でも時系列順に並ぶので新しい日が先頭。
    return onSnapshot(collection(db, 'groups', groupId, 'chatDays'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatDay);
      list.sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
      setDays(list);
    });
  }, [groupId]);

  return days;
}

/**
 * 過去の1日ぶんのチャットログを読み込む（読み取り専用）。
 * 過去ログは午前4時を過ぎれば増えないので、購読ではなく一度だけ取得する。
 */
export function useChatDay(groupId: string | null, dayKey: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId || !dayKey) {
      setMessages([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    const q = query(
      collection(db, 'groups', groupId, 'chat'),
      where('dayKey', '==', dayKey)
    );
    getDocs(q)
      .then((snap) => {
        if (!alive) return;
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage);
        list.sort((a, b) => a.createdAt - b.createdAt);
        setMessages(list);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [groupId, dayKey]);

  return { messages, loading };
}
