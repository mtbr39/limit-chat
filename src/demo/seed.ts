/**
 * デモモードの初期データと、会話相手になるボット。
 * - 「デモ部」グループに、開催中のサバイバルセッション・過去のセッション・常時チャットを用意する
 * - ボット2人が時々しゃべり、こちらが発言すると返事をする（会話が成立して沈黙タイマーが動く）
 * - もう1人のボットは黙ったままなので、しばらくすると脱落する様子が見られる
 */
import { dayKeyOf } from '../lib/day';
import { __readStore, __replaceStore, doc, setDoc, updateDoc, addDoc, collection, getFirestore, increment } from './firestore';

const SEED_KEY = 'limitchat-demo-seeded-at';
/** この時間が経つと開催中セッションが終わってしまうので、初期データを作り直す */
const RESEED_AFTER_MS = 3 * 60 * 60 * 1000;
const MIN = 60_000;
const GROUP = 'demo';
const LIVE = 'live-demo';

const BOTS = {
  'bot-minato': 'ミナト',
  'bot-haru': 'ハル',
  'bot-sora': 'ソラ',
} as const;
type BotId = keyof typeof BOTS;
const isBot = (uid: string) => uid in BOTS;

const CHATTER = [
  'さっきのゲーム、もう一戦やる？',
  'お腹すいてきた',
  'この沈黙ルール、地味に緊張するね',
  'いま何してた？',
  '明日って雨だっけ',
  'しゃべらないと脱落しちゃうよ〜',
  'BGM 何聞いてる？',
  'ちょっと飲み物とってきた',
  '最近ハマってるものある？',
  '眠くなってきたけどまだ落ちたくない',
];
const REPLIES = [
  'わかる！',
  'それいいね',
  'え、ほんとに？',
  'なるほど〜',
  'ようこそ！ゆっくりしていってね',
  'それでそれで？',
  'たしかに笑',
  'へー、知らなかった',
];
const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

type Data = Record<string, unknown>;

function buildSeed(now: number): Record<string, Data> {
  const db: Record<string, Data> = {};
  const put = (path: string, data: Data) => (db[path] = data);
  const g = `groups/${GROUP}`;
  const today = dayKeyOf(now);
  const yesterdayTs = now - 24 * 60 * MIN;
  const yesterday = dayKeyOf(yesterdayTs);

  put(g, {
    name: 'デモ部',
    description:
      'Firebase なしで動くデモ用のグループです。下の「参加する」から名前を登録すると、常時チャットや開催中の脱落ゲームに参加できます。',
    ownerUid: 'demo-admin',
    createdAt: now - 3 * 24 * 60 * MIN,
  });

  const notes: Record<BotId, string> = {
    'bot-minato': 'よろしくね！夜はだいたいいます',
    'bot-haru': '話しかけてくれたら返します',
    'bot-sora': '見てるだけ…',
  };
  (Object.keys(BOTS) as BotId[]).forEach((id, i) => {
    put(`${g}/members/${id}`, {
      name: BOTS[id],
      joinedAt: now - (3 * 24 - i) * 60 * MIN,
      note: notes[id],
      noteUpdatedAt: now - 2 * 60 * MIN,
    });
    put(`${g}/presence/${id}`, { lastSeenAt: now });
  });

  // 常時チャット（昨日と今日）
  const chat = (id: string, uid: BotId, text: string, at: number) =>
    put(`${g}/chat/${id}`, { userId: uid, userName: BOTS[uid], text, createdAt: at, dayKey: dayKeyOf(at) });
  chat('y1', 'bot-minato', '昨日のログもこうして残るよ', yesterdayTs);
  chat('y2', 'bot-haru', '午前4時で日付が切り替わるんだって', yesterdayTs + 2 * MIN);
  chat('y3', 'bot-sora', 'へー', yesterdayTs + 3 * MIN);
  put(`${g}/chatDays/${yesterday}`, { lastMessageAt: yesterdayTs + 3 * MIN, messageCount: 3 });
  // 午前4時直後でも「今日」に収まるよう、数分前の発言にする
  chat('t1', 'bot-minato', 'おはよう〜', now - 6 * MIN);
  chat('t2', 'bot-haru', 'おはよう！今夜もサバイバルやってるよ', now - 5 * MIN);
  chat('t3', 'bot-minato', '新しい人が来たら話しかけてみよう', now - 4 * MIN);
  put(`${g}/chatDays/${today}`, { lastMessageAt: now - 4 * MIN, messageCount: 3 });

  // 開催中のセッション
  const s = `${g}/sessions/${LIVE}`;
  put(s, {
    title: '夜のサバイバル雑談',
    startTime: now - 3 * MIN,
    endTime: now + 2 * 60 * MIN,
    silenceLimitMs: 5 * MIN,
    createdAt: now - 60 * MIN,
    createdBy: 'demo-admin',
    canceledAt: null,
  });
  const liveMsgs: [BotId, string, number][] = [
    ['bot-minato', 'はじまった！', now - 3 * MIN],
    ['bot-haru', 'よろしく〜', now - 3 * MIN + 20_000],
    ['bot-sora', 'よろしく', now - 3 * MIN + 40_000],
    ['bot-minato', '5分しゃべらないと脱落だからね', now - 2 * MIN],
    ['bot-haru', '気をつけよう', now - 2 * MIN + 30_000],
  ];
  liveMsgs.forEach(([uid, text, at], i) =>
    put(`${s}/messages/m${i}`, { userId: uid, userName: BOTS[uid], text, createdAt: at })
  );
  (Object.keys(BOTS) as BotId[]).forEach((id) => {
    const mine = liveMsgs.filter(([u]) => u === id).map(([, , at]) => at);
    put(`${s}/participants/${id}`, {
      name: BOTS[id],
      joinedAt: now - 4 * MIN,
      firstMessageAt: mine[0] ?? null,
      lastMessageAt: mine[mine.length - 1] ?? null,
    });
  });

  // 終了したセッション（結果画面の例）
  const p = `${g}/sessions/past-demo`;
  const pastStart = yesterdayTs - 60 * MIN;
  put(p, {
    title: '昨日のサバイバル',
    startTime: pastStart,
    endTime: pastStart + 30 * MIN,
    silenceLimitMs: 3 * MIN,
    createdAt: pastStart - 60 * MIN,
    createdBy: 'demo-admin',
    canceledAt: null,
  });
  const pastMsgs: [BotId, string, number][] = [
    ['bot-minato', 'スタート！', pastStart + MIN],
    ['bot-sora', 'がんばる', pastStart + MIN + 30_000],
    ['bot-haru', '最後まで残るぞ', pastStart + 2 * MIN],
    ['bot-minato', 'まだいる？', pastStart + 4 * MIN],
    ['bot-haru', 'いるよ', pastStart + 4 * MIN + 20_000],
  ];
  for (let t = pastStart + 6 * MIN; t < pastStart + 30 * MIN; t += 2 * MIN) {
    pastMsgs.push(['bot-minato', pick(CHATTER), t], ['bot-haru', pick(REPLIES), t + 30_000]);
  }
  pastMsgs.forEach(([uid, text, at], i) =>
    put(`${p}/messages/m${i}`, { userId: uid, userName: BOTS[uid], text, createdAt: at })
  );
  (Object.keys(BOTS) as BotId[]).forEach((id) => {
    const mine = pastMsgs.filter(([u]) => u === id).map(([, , at]) => at);
    put(`${p}/participants/${id}`, {
      name: BOTS[id],
      joinedAt: pastStart,
      firstMessageAt: mine[0] ?? null,
      lastMessageAt: mine[mine.length - 1] ?? null,
    });
  });

  // 開催予定のセッション
  put(`${g}/sessions/next-demo`, {
    title: '明日のサバイバル',
    startTime: now + 24 * 60 * MIN,
    endTime: now + 25 * 60 * MIN,
    silenceLimitMs: 5 * MIN,
    createdAt: now,
    createdBy: 'demo-admin',
    canceledAt: null,
  });

  return db;
}

let seeded = false;

export function ensureSeeded() {
  if (seeded) return;
  seeded = true;
  const now = Date.now();
  const at = Number(localStorage.getItem(SEED_KEY) || 0);
  if (!at || now - at > RESEED_AFTER_MS || !__readStore()[`groups/${GROUP}`]) reset();
  startBots();
  showBanner();
}

export function reset() {
  const now = Date.now();
  try {
    localStorage.setItem(SEED_KEY, String(now));
  } catch {
    // 保存できなくても初期データでは動く
  }
  __replaceStore(buildSeed(now));
}

// ---------------------------------------------------------------- ボット

function startBots() {
  const db = getFirestore();
  const g = `groups/${GROUP}`;
  let nextChatterAt = Date.now() + 30_000 + Math.random() * 30_000;

  const say = async (botId: BotId, text: string) => {
    const now = Date.now();
    await addDoc(collection(db, 'groups', GROUP, 'sessions', LIVE, 'messages'), {
      userId: botId,
      userName: BOTS[botId],
      text,
      createdAt: now,
    });
    await updateDoc(doc(db, 'groups', GROUP, 'sessions', LIVE, 'participants', botId), {
      lastMessageAt: now,
    });
  };

  setInterval(() => {
    // 複数タブで二重にしゃべらないよう、見えているタブだけが動かす
    if (document.visibilityState !== 'visible') return;
    const store = __readStore();
    const now = Date.now();

    // 在席表示用にボットの打刻を更新
    for (const id of ['bot-minato', 'bot-haru'] as BotId[]) {
      const p = store[`${g}/presence/${id}`];
      if (!p || now - (p.lastSeenAt as number) > 15_000) {
        setDoc(doc(db, 'groups', GROUP, 'presence', id), { lastSeenAt: now }, { merge: true });
      }
    }

    // 開催中セッション: 人の発言に返事をする / ときどき自分から話す
    const session = store[`${g}/sessions/${LIVE}`];
    if (session && !session.canceledAt && now < (session.endTime as number)) {
      const msgs = Object.entries(store)
        .filter(([path]) => path.startsWith(`${g}/sessions/${LIVE}/messages/`))
        .map(([, d]) => d as { userId: string; userName: string; createdAt: number })
        .sort((a, b) => a.createdAt - b.createdAt);
      const last = msgs[msgs.length - 1];
      if (last && !isBot(last.userId) && now - last.createdAt > 3000) {
        const replier: BotId = Math.random() < 0.5 ? 'bot-minato' : 'bot-haru';
        say(replier, pick(REPLIES).replace('！', `、${last.userName}さん！`));
        nextChatterAt = now + 40_000 + Math.random() * 40_000;
      } else if (now > nextChatterAt) {
        const lastBot = last && isBot(last.userId) ? (last.userId as BotId) : null;
        const speaker: BotId = lastBot === 'bot-minato' ? 'bot-haru' : 'bot-minato';
        say(speaker, pick(CHATTER));
        nextChatterAt = now + 40_000 + Math.random() * 40_000;
      }
    }

    // 常時チャット: 人の発言に一度だけ返事をする
    const today = dayKeyOf(now);
    const chats = Object.entries(store)
      .filter(([path]) => path.startsWith(`${g}/chat/`))
      .map(([, d]) => d as { userId: string; userName: string; createdAt: number; dayKey: string })
      .filter((c) => c.dayKey === today)
      .sort((a, b) => a.createdAt - b.createdAt);
    const lastChat = chats[chats.length - 1];
    if (lastChat && !isBot(lastChat.userId) && now - lastChat.createdAt > 4000 && now - lastChat.createdAt < 2 * MIN) {
      addDoc(collection(db, 'groups', GROUP, 'chat'), {
        userId: 'bot-haru',
        userName: BOTS['bot-haru'],
        text: pick(REPLIES),
        createdAt: now,
        dayKey: today,
      });
      setDoc(doc(db, 'groups', GROUP, 'chatDays', today), { lastMessageAt: now, messageCount: increment(1) }, { merge: true });
    }
  }, 2000);
}

// ---------------------------------------------------------------- 案内バー

function showBanner() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const bar = document.createElement('div');
  bar.setAttribute('role', 'note');
  bar.style.cssText =
    'position:sticky;top:0;z-index:1000;display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;' +
    'padding:6px 12px;font:12px/1.5 system-ui,sans-serif;background:#2b2f45;color:#e8eaf6;';
  bar.innerHTML =
    '<strong>デモモード</strong>' +
    '<span>Firebase なしで動いています。データはこのブラウザ内だけに保存されます。タブを増やすと別の参加者になれます。</span>' +
    `<a href="${base}/${GROUP}" style="color:#9fa8ff">デモ部を開く</a>` +
    `<a href="${base}/admin" style="color:#9fa8ff">管理画面（何でもログイン可）</a>` +
    '<button type="button" style="margin-left:auto;font:inherit;padding:2px 10px;border-radius:6px;border:1px solid #6b7099;background:transparent;color:inherit;cursor:pointer">データをリセット</button>';
  bar.querySelector('button')!.addEventListener('click', () => {
    if (!confirm('デモのデータを初期状態に戻しますか？')) return;
    reset();
    location.href = `${base}/${GROUP}`;
  });
  const mount = () => document.body.prepend(bar);
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
}
