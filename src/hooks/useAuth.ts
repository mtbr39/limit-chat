import { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User } from '../types';

export function useAuth(roomId: string) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!firebaseUser || !roomId) return;

    const userDocRef = doc(db, 'rooms', roomId, 'users', firebaseUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setUser({ id: snapshot.id, ...snapshot.data() } as User);
      }
    });

    return unsubscribe;
  }, [firebaseUser, roomId]);

  const signIn = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const setName = async (name: string) => {
    if (!firebaseUser || !roomId) return;

    const userDocRef = doc(db, 'rooms', roomId, 'users', firebaseUser.uid);
    const now = Date.now();

    const existingDoc = await getDoc(userDocRef);
    if (existingDoc.exists()) {
      await setDoc(userDocRef, { name }, { merge: true });
    } else {
      const newUser: Omit<User, 'id'> = {
        name,
        isEliminated: false,
        lastMessageAt: now,
        joinedAt: now,
      };
      await setDoc(userDocRef, newUser);
    }
  };

  return { firebaseUser, user, loading, signIn, setName };
}
