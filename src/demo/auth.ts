/**
 * デモモード用の firebase/auth 代替。
 * 匿名ユーザーはタブごとに別人になる（sessionStorage）。タブを2つ開けば2人で会話を試せる。
 * 管理者ログインは任意のメールアドレス・パスワードで通る。
 */
export interface User {
  uid: string;
  isAnonymous: boolean;
  email: string | null;
}

export interface Auth {
  currentUser: User | null;
}

const SESSION_KEY = 'limitchat-demo-user';

function loadUser(): User | null {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

const auth: Auth = { currentUser: loadUser() };
const listeners = new Set<(u: User | null) => void>();

function setUser(user: User | null) {
  auth.currentUser = user;
  try {
    if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // 保存できなくてもこのページ内では動く
  }
  for (const fn of [...listeners]) fn(user);
}

export function getAuth(_app?: unknown): Auth {
  return auth;
}

export function onAuthStateChanged(_auth: Auth, cb: (u: User | null) => void): () => void {
  listeners.add(cb);
  queueMicrotask(() => cb(auth.currentUser));
  return () => {
    listeners.delete(cb);
  };
}

export async function signInAnonymously(_auth: Auth) {
  const user: User = {
    uid: 'guest-' + Math.random().toString(36).slice(2, 10),
    isAnonymous: true,
    email: null,
  };
  setUser(user);
  return { user };
}

export async function signInWithEmailAndPassword(_auth: Auth, email: string, password: string) {
  if (!email || !password) throw new Error('メールアドレスとパスワードを入力してください（デモでは何でもOK）');
  const user: User = { uid: 'demo-admin', isAnonymous: false, email };
  setUser(user);
  return { user };
}

export async function signOut(_auth: Auth) {
  setUser(null);
}
