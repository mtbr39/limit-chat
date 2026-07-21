import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Group, Session, Membership } from '../types';
import { RESERVED_SLUGS } from '../lib/router';

/** グループ本体・セッション一覧・自分のメンバーシップを購読する */
export function useGroup(groupId: string | null, uid: string | null) {
  const [group, setGroup] = useState<Group | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setGroup(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return onSnapshot(doc(db, 'groups', groupId), (snap) => {
      setGroup(snap.exists() ? ({ id: snap.id, ...snap.data() } as Group) : null);
      setLoading(false);
    });
  }, [groupId]);

  useEffect(() => {
    if (!groupId) {
      setSessions([]);
      return;
    }
    const q = query(
      collection(db, 'groups', groupId, 'sessions'),
      orderBy('startTime', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setSessions(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Session)
      );
    });
  }, [groupId]);

  useEffect(() => {
    if (!groupId || !uid) {
      setMembership(null);
      return;
    }
    return onSnapshot(doc(db, 'groups', groupId, 'members', uid), (snap) => {
      setMembership(
        snap.exists() ? ({ id: snap.id, ...snap.data() } as Membership) : null
      );
    });
  }, [groupId, uid]);

  return { group, sessions, membership, loading };
}

/** トップページ用のグループ一覧 */
export function useGroupList() {
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'groups'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snap) => setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Group)),
      (e) => console.error('グループ一覧の取得に失敗しました', e)
    );
  }, []);

  return groups;
}

export function validateSlug(slug: string): string | null {
  if (!/^[a-z0-9][a-z0-9-]{1,30}$/.test(slug)) {
    return '英小文字・数字・ハイフンで 2〜31 文字にしてください';
  }
  if (RESERVED_SLUGS.includes(slug)) return 'この文字列は予約済みです';
  return null;
}

/** 管理者向けの書き込み操作 */
export function useGroupAdmin(uid: string | null) {
  const createGroup = useCallback(
    async (slug: string, name: string, description: string) => {
      if (!uid) throw new Error('ログインが必要です');
      const err = validateSlug(slug);
      if (err) throw new Error(err);

      const ref = doc(db, 'groups', slug);
      if ((await getDoc(ref)).exists()) {
        throw new Error('その URL はすでに使われています');
      }
      const group: Omit<Group, 'id'> = {
        name,
        description,
        ownerUid: uid,
        createdAt: Date.now(),
      };
      await setDoc(ref, group);
      return slug;
    },
    [uid]
  );

  const createSession = useCallback(
    async (
      groupId: string,
      input: {
        title: string;
        startTime: number;
        endTime: number;
        silenceLimitMs: number;
      }
    ) => {
      if (!uid) throw new Error('ログインが必要です');
      if (input.endTime <= input.startTime) {
        throw new Error('終了時間は開始時間より後にしてください');
      }
      const ref = doc(collection(db, 'groups', groupId, 'sessions'));
      const session: Omit<Session, 'id'> = {
        ...input,
        createdAt: Date.now(),
        createdBy: uid,
      };
      await setDoc(ref, session);
      return ref.id;
    },
    [uid]
  );

  return { createGroup, createSession };
}
