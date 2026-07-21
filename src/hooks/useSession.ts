import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Session, Participant, Message } from '../types';

/**
 * セッション本体・参加者・メッセージを購読する。
 * 脱落フラグは保存しない（lib/survival.ts で lastMessageAt から導出する）。
 */
export function useSession(
  groupId: string | null,
  sessionId: string | null,
  uid: string | null
) {
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const ready = !!groupId && !!sessionId;

  useEffect(() => {
    if (!ready) {
      setSession(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return onSnapshot(doc(db, 'groups', groupId!, 'sessions', sessionId!), (snap) => {
      setSession(snap.exists() ? ({ id: snap.id, ...snap.data() } as Session) : null);
      setLoading(false);
    });
  }, [groupId, sessionId, ready]);

  useEffect(() => {
    if (!ready) {
      setParticipants([]);
      return;
    }
    const ref = collection(db, 'groups', groupId!, 'sessions', sessionId!, 'participants');
    return onSnapshot(query(ref, orderBy('joinedAt', 'asc')), (snap) => {
      setParticipants(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Participant));
    });
  }, [groupId, sessionId, ready]);

  useEffect(() => {
    if (!ready) {
      setMessages([]);
      return;
    }
    const ref = collection(db, 'groups', groupId!, 'sessions', sessionId!, 'messages');
    return onSnapshot(query(ref, orderBy('createdAt', 'asc')), (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Message));
    });
  }, [groupId, sessionId, ready]);

  const me = participants.find((p) => p.id === uid) ?? null;

  /** セッションに参加する。同時にグループのメンバーにもなる */
  const join = useCallback(
    async (name: string) => {
      if (!ready || !uid) return;
      const now = Date.now();
      const participantRef = doc(
        db,
        'groups',
        groupId!,
        'sessions',
        sessionId!,
        'participants',
        uid
      );

      if ((await getDoc(participantRef)).exists()) {
        await updateDoc(participantRef, { name });
      } else {
        const participant: Omit<Participant, 'id'> = {
          name,
          joinedAt: now,
          firstMessageAt: null,
          lastMessageAt: null,
        };
        await setDoc(participantRef, participant);
      }

      // グループの履歴を見られるようにメンバーとして記録する
      const memberRef = doc(db, 'groups', groupId!, 'members', uid);
      await setDoc(memberRef, { name, joinedAt: now }, { merge: true });
    },
    [groupId, sessionId, uid, ready]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!ready || !uid || !me) return;
      const now = Date.now();

      await addDoc(
        collection(db, 'groups', groupId!, 'sessions', sessionId!, 'messages'),
        { userId: uid, userName: me.name, text, createdAt: now }
      );

      const participantRef = doc(
        db,
        'groups',
        groupId!,
        'sessions',
        sessionId!,
        'participants',
        uid
      );
      await updateDoc(participantRef, {
        lastMessageAt: now,
        ...(me.firstMessageAt === null ? { firstMessageAt: now } : {}),
      });
    },
    [groupId, sessionId, uid, me, ready]
  );

  return { session, participants, messages, me, loading, join, sendMessage };
}
