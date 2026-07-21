import { useState, useEffect, useCallback } from 'react';
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../firebase';

/**
 * 参加者は匿名ログイン、管理者はメール/パスワードでログインする。
 * 「特別なログイン」= 非匿名アカウントであること。
 */
export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      setLoading(false);
      if (!fbUser) {
        signInAnonymously(auth).catch((e) =>
          console.error('匿名ログインに失敗しました', e)
        );
      }
    });
  }, []);

  const signInAsAdmin = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signOutAdmin = useCallback(async () => {
    await signOut(auth);
    await signInAnonymously(auth);
  }, []);

  return {
    firebaseUser,
    uid: firebaseUser?.uid ?? null,
    isAdmin: !!firebaseUser && !firebaseUser.isAnonymous,
    loading,
    signInAsAdmin,
    signOutAdmin,
  };
}
