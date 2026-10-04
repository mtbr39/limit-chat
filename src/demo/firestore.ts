/**
 * デモモード用の firebase/firestore 代替。
 * `vite --mode demo` のときだけ vite.config.ts の alias で差し替わる。
 * データは localStorage に保存し、storage イベントで他のタブとも同期する。
 * アプリが使っている API（doc/collection/query/where/orderBy/increment と読み書き・購読）だけを実装している。
 */
import { ensureSeeded } from './seed';

type Data = Record<string, unknown>;

const STORAGE_KEY = 'limitchat-demo-db';

// ---------------------------------------------------------------- ストア

let store: Record<string, Data> = load();
const listeners = new Set<() => void>();

function load(): Record<string, Data> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // 容量超過などは無視（このタブ内では動き続ける）
  }
}

let notifyQueued = false;
function notify() {
  if (notifyQueued) return;
  notifyQueued = true;
  queueMicrotask(() => {
    notifyQueued = false;
    for (const fn of [...listeners]) fn();
  });
}

function commit() {
  persist();
  notify();
}

// 他のタブで書き込まれたら読み直す
window.addEventListener('storage', (e) => {
  if (e.key !== STORAGE_KEY) return;
  store = load();
  notify();
});

/** シードやリセット用: ストアを丸ごと置き換える */
export function __replaceStore(next: Record<string, Data>) {
  store = next;
  commit();
}
export function __readStore(): Record<string, Data> {
  return store;
}

// ---------------------------------------------------------------- 参照

export interface Firestore {
  type: 'firestore';
}
export interface DocumentReference {
  type: 'doc';
  path: string;
  id: string;
}
export interface CollectionReference {
  type: 'collection';
  path: string;
  id: string;
}
type Constraint =
  | { type: 'where'; field: string; op: '=='; value: unknown }
  | { type: 'orderBy'; field: string; dir: 'asc' | 'desc' };
export interface Query {
  type: 'query';
  path: string;
  constraints: Constraint[];
}

export function getFirestore(): Firestore {
  ensureSeeded();
  return { type: 'firestore' };
}

const join = (base: string, segments: string[]) =>
  [base, ...segments].filter(Boolean).join('/');

const autoId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

export function collection(
  parent: Firestore | DocumentReference,
  ...segments: string[]
): CollectionReference {
  const path = join(parent.type === 'doc' ? parent.path : '', segments);
  return { type: 'collection', path, id: path.split('/').pop()! };
}

export function doc(
  parent: Firestore | CollectionReference | DocumentReference,
  ...segments: string[]
): DocumentReference {
  const base = parent.type === 'firestore' ? '' : parent.path;
  // doc(collectionRef) は自動 ID の新しいドキュメント
  const path = segments.length ? join(base, segments) : join(base, [autoId()]);
  return { type: 'doc', path, id: path.split('/').pop()! };
}

export function where(field: string, op: '==', value: unknown): Constraint {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): Constraint {
  return { type: 'orderBy', field, dir };
}

export function query(ref: CollectionReference | Query, ...constraints: Constraint[]): Query {
  return {
    type: 'query',
    path: ref.path,
    constraints: [...(ref.type === 'query' ? ref.constraints : []), ...constraints],
  };
}

// ---------------------------------------------------------------- 値

interface IncrementSentinel {
  __op: 'increment';
  by: number;
}
export function increment(by: number): IncrementSentinel {
  return { __op: 'increment', by };
}

function applyFields(base: Data, patch: Data): Data {
  const out: Data = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && (v as IncrementSentinel).__op === 'increment') {
      out[k] = (typeof out[k] === 'number' ? (out[k] as number) : 0) + (v as IncrementSentinel).by;
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ---------------------------------------------------------------- スナップショット

export interface DocumentSnapshot {
  id: string;
  exists(): boolean;
  data(): Data | undefined;
}
export interface QueryDocumentSnapshot {
  id: string;
  data(): Data;
}
export interface QuerySnapshot {
  docs: QueryDocumentSnapshot[];
  empty: boolean;
  size: number;
}

function docSnapshot(ref: DocumentReference): DocumentSnapshot {
  const data = store[ref.path];
  return {
    id: ref.id,
    exists: () => data !== undefined,
    data: () => (data === undefined ? undefined : { ...data }),
  };
}

function querySnapshot(q: CollectionReference | Query): QuerySnapshot {
  const prefix = q.path + '/';
  const depth = q.path.split('/').length + 1;
  let rows = Object.entries(store)
    .filter(([p]) => p.startsWith(prefix) && p.split('/').length === depth)
    .map(([p, data]) => ({ id: p.split('/').pop()!, data }));

  const constraints = q.type === 'query' ? q.constraints : [];
  for (const c of constraints) {
    if (c.type === 'where') rows = rows.filter((r) => r.data[c.field] === c.value);
  }
  for (const c of constraints) {
    if (c.type !== 'orderBy') continue;
    const sign = c.dir === 'desc' ? -1 : 1;
    rows.sort((a, b) => {
      const x = a.data[c.field] as number | string;
      const y = b.data[c.field] as number | string;
      return x < y ? -sign : x > y ? sign : 0;
    });
  }
  const docs = rows.map((r) => ({ id: r.id, data: () => ({ ...r.data }) }));
  return { docs, empty: docs.length === 0, size: docs.length };
}

// ---------------------------------------------------------------- 読み書き

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

export async function getDoc(ref: DocumentReference): Promise<DocumentSnapshot> {
  await tick();
  return docSnapshot(ref);
}

export async function getDocs(q: CollectionReference | Query): Promise<QuerySnapshot> {
  await tick();
  return querySnapshot(q);
}

export async function setDoc(
  ref: DocumentReference,
  data: Data,
  options?: { merge?: boolean }
): Promise<void> {
  const base = options?.merge ? store[ref.path] ?? {} : {};
  store[ref.path] = applyFields(base, data);
  commit();
}

export async function updateDoc(ref: DocumentReference, data: Data): Promise<void> {
  if (!store[ref.path]) throw new Error(`No document to update: ${ref.path}`);
  store[ref.path] = applyFields(store[ref.path], data);
  commit();
}

export async function addDoc(ref: CollectionReference, data: Data): Promise<DocumentReference> {
  const d = doc(ref);
  await setDoc(d, data);
  return d;
}

export function onSnapshot(
  ref: DocumentReference | CollectionReference | Query,
  next: (snap: any) => void,
  _error?: (e: Error) => void
): () => void {
  let last = '';
  const emit = () => {
    const snap = ref.type === 'doc' ? docSnapshot(ref) : querySnapshot(ref);
    // 中身が変わったときだけ通知する（無関係な書き込みで再描画しない）
    const key = JSON.stringify(
      ref.type === 'doc'
        ? (snap as DocumentSnapshot).data() ?? null
        : (snap as QuerySnapshot).docs.map((d) => [d.id, d.data()])
    );
    if (key === last) return;
    last = key;
    next(snap);
  };
  listeners.add(emit);
  queueMicrotask(emit);
  return () => {
    listeners.delete(emit);
  };
}
