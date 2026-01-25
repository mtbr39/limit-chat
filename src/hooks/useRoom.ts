import { useState, useEffect } from 'react';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Room, User } from '../types';

export function useRoom(roomId: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);

  useEffect(() => {
    if (!roomId) return;

    const roomDocRef = doc(db, 'rooms', roomId);
    const unsubscribe = onSnapshot(roomDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoom({ id: snapshot.id, ...snapshot.data() } as Room);
      }
    });

    return unsubscribe;
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    const usersRef = collection(db, 'rooms', roomId, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const users: User[] = [];
      snapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() } as User);
      });
      setParticipants(users);
    });

    return unsubscribe;
  }, [roomId]);

  const createRoom = async (startTime: number) => {
    const roomDocRef = doc(db, 'rooms', roomId);
    const existing = await getDoc(roomDocRef);

    if (!existing.exists()) {
      const newRoom: Omit<Room, 'id'> = {
        startTime,
        isActive: false,
        createdAt: Date.now(),
      };
      await setDoc(roomDocRef, newRoom);
    }
  };

  const startRoom = async () => {
    const roomDocRef = doc(db, 'rooms', roomId);
    await updateDoc(roomDocRef, { isActive: true });
  };

  const eliminateUser = async (userId: string) => {
    const userDocRef = doc(db, 'rooms', roomId, 'users', userId);
    await updateDoc(userDocRef, { isEliminated: true });
  };

  return { room, participants, createRoom, startRoom, eliminateUser };
}
