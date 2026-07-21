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
}
