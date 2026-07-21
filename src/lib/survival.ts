import { Participant, Session } from '../types';

export type SurvivalStatus =
  /** セッション開始前 */
  | 'waiting'
  /** 参加済みだがまだ一度も発言していない（この間は脱落しない） */
  | 'grace'
  /** 発言済みで沈黙タイマー進行中 */
  | 'alive'
  /** 沈黙しすぎて脱落 */
  | 'eliminated'
  /** 終了時刻まで脱落しなかった */
  | 'survived'
  /** 一度も発言しないまま終了した */
  | 'silent';

export interface SurvivalState {
  status: SurvivalStatus;
  /** 沈黙タイマーの期限。タイマーが動いていないときは null */
  deadline: number | null;
  /** 脱落が確定した時刻。脱落していなければ null */
  eliminatedAt: number | null;
}

export function sessionPhase(
  session: Session,
  now: number
): 'before' | 'live' | 'ended' {
  if (now < session.startTime) return 'before';
  if (now >= session.endTime) return 'ended';
  return 'live';
}

/**
 * 参加者の状態を lastMessageAt から導出する。
 * DB に脱落フラグを書かないので、過去セッションでも同じ関数で正しい結果が出る。
 */
export function evaluate(
  participant: Participant,
  session: Session,
  now: number
): SurvivalState {
  const phase = sessionPhase(session, now);

  if (phase === 'before') {
    return { status: 'waiting', deadline: null, eliminatedAt: null };
  }

  // 未発言なら沈黙タイマーは始まっていない。開始10分後に来ても参加できる。
  if (participant.firstMessageAt === null || participant.lastMessageAt === null) {
    return {
      status: phase === 'ended' ? 'silent' : 'grace',
      deadline: null,
      eliminatedAt: null,
    };
  }

  const deadline = participant.lastMessageAt + session.silenceLimitMs;

  // 期限が終了時刻を過ぎているなら、沈黙のまま終了時刻を迎えたので脱落ではない
  if (deadline > session.endTime) {
    return {
      status: phase === 'ended' ? 'survived' : 'alive',
      deadline,
      eliminatedAt: null,
    };
  }

  if (deadline <= now) {
    return { status: 'eliminated', deadline, eliminatedAt: deadline };
  }

  return {
    status: phase === 'ended' ? 'survived' : 'alive',
    deadline,
    eliminatedAt: null,
  };
}

export function canSpeak(state: SurvivalState): boolean {
  return state.status === 'grace' || state.status === 'alive';
}

export interface SessionOutcome {
  survivors: Participant[];
  eliminated: Participant[];
  silent: Participant[];
  waiting: Participant[];
}

export function summarize(
  participants: Participant[],
  session: Session,
  now: number
): SessionOutcome {
  const outcome: SessionOutcome = {
    survivors: [],
    eliminated: [],
    silent: [],
    waiting: [],
  };

  for (const p of participants) {
    const { status } = evaluate(p, session, now);
    if (status === 'eliminated') outcome.eliminated.push(p);
    else if (status === 'silent') outcome.silent.push(p);
    else if (status === 'waiting') outcome.waiting.push(p);
    else outcome.survivors.push(p);
  }

  // 脱落者は脱落が早い順
  outcome.eliminated.sort(
    (a, b) => (a.lastMessageAt ?? 0) - (b.lastMessageAt ?? 0)
  );
  return outcome;
}

export function formatRange(startTime: number, endTime: number): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const sameDay = start.toDateString() === end.toDateString();
  const date = start.toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
  const time = (d: Date) =>
    d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

  return sameDay
    ? `${date} ${time(start)} 〜 ${time(end)}`
    : `${date} ${time(start)} 〜 ${end.toLocaleString('ja-JP')}`;
}

/** 「7月21日 14:32」のような絶対表記 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 「3分前」のような相対表記。1日以上前は日付にする */
export function formatTimeAgo(timestamp: number, now: number): string {
  const diff = now - timestamp;
  if (diff < 60 * 1000) return 'たった今';

  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes < 60) return `${minutes}分前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;

  return new Date(timestamp).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}時間${m}分`;
  if (m > 0) return `${m}分${String(s).padStart(2, '0')}秒`;
  return `${s}秒`;
}
