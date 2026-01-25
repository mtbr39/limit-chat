import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Message, User } from '../types';

export function useChat(roomId: string, user: User | null) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!roomId) return;

    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
    });

    return unsubscribe;
  }, [roomId]);

  const sendMessage = async (text: string) => {
    if (!user || !roomId || user.isEliminated) return;

    const now = Date.now();

    // メッセージを送信
    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    await addDoc(messagesRef, {
      userId: user.id,
      userName: user.name,
      text,
      createdAt: now,
    });

    // 最終発言時刻を更新
    const userDocRef = doc(db, 'rooms', roomId, 'users', user.id);
    await updateDoc(userDocRef, {
      lastMessageAt: now,
    });
  };

  return { messages, sendMessage };
}
