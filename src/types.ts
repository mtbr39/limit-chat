export interface Group {
  /** URL の末尾に使う固定スラッグ。ドキュメント ID と同一 */
  id: string;
  name: string;
  description: string;
  ownerUid: string;
  createdAt: number;
}

export interface Session {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  /** 沈黙して脱落するまでのミリ秒 */
  silenceLimitMs: number;
  createdAt: number;
  createdBy: string;
  /** キャンセルされた時刻。開催中でも中止できる。未設定なら開催予定どおり */
  canceledAt?: number | null;
}

export interface Participant {
  id: string;
  name: string;
  joinedAt: number;
  /** 初回発言まで null。null の間は脱落しない */
  firstMessageAt: number | null;
  lastMessageAt: number | null;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
}

export interface Membership {
  id: string;
  name: string;
  joinedAt: number;
  /** プロフィールのひとこと */
  note: string;
  noteUpdatedAt: number | null;
}

/**
 * 常時チャットの1発言（`groups/{groupId}/chat/{id}`）。
 * セッションの Message とは別コレクション。脱落ゲームとは独立した雑談用。
 */
export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
  /** createdAt から導出した論理日（午前4時区切り, "2026-07-26"）。日別ログの索引に使う */
  dayKey: string;
}

/**
 * 常時チャットの日別ログ索引（`groups/{groupId}/chatDays/{dayKey}`）。
 * どの日に発言があったか一覧するために、発言のたびに更新する軽い集計。
 */
export interface ChatDay {
  /** ドキュメント ID と同一（"2026-07-26"） */
  id: string;
  lastMessageAt: number;
  messageCount: number;
}

/**
 * 「いま開いているか」の在席記録（`groups/{groupId}/presence/{uid}`）。
 * タブが見えている間だけ lastSeenAt を打ち続け、オンライン判定は時刻から導出する。
 */
export interface Presence {
  id: string;
  lastSeenAt: number;
}
