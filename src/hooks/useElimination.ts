import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Room } from '../types';

const ELIMINATION_TIME = 60 * 1000; // 1分 = 60秒

export function useElimination(
  roomId: string,
  room: Room | null,
  user: User | null,
  participants: User[]
) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!room?.isActive || !user || user.isEliminated) {
      setTimeRemaining(null);
      return;
    }

    const checkElimination = () => {
      const now = Date.now();
      const elapsed = now - user.lastMessageAt;
      const remaining = ELIMINATION_TIME - elapsed;

      if (remaining <= 0) {
        // 脱落処理
        const userDocRef = doc(db, 'rooms', roomId, 'users', user.id);
        updateDoc(userDocRef, { isEliminated: true });
        setTimeRemaining(0);
      } else {
        setTimeRemaining(remaining);
      }
    };

    checkElimination();
    const interval = setInterval(checkElimination, 1000);

    return () => clearInterval(interval);
  }, [roomId, room?.isActive, user?.id, user?.lastMessageAt, user?.isEliminated]);

  // 他の参加者の脱落もチェック（ルーム作成者用）
  useEffect(() => {
    if (!room?.isActive) return;

    const checkAllParticipants = () => {
      const now = Date.now();
      participants.forEach((p) => {
        if (!p.isEliminated) {
          const elapsed = now - p.lastMessageAt;
          if (elapsed >= ELIMINATION_TIME) {
            const userDocRef = doc(db, 'rooms', roomId, 'users', p.id);
            updateDoc(userDocRef, { isEliminated: true });
          }
        }
      });
    };

    const interval = setInterval(checkAllParticipants, 5000);
    return () => clearInterval(interval);
  }, [roomId, room?.isActive, participants]);

  return { timeRemaining };
}
