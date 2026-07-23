import { Participant, Session } from '../types';
import { evaluate, summarize, formatDuration } from '../lib/survival';

interface Props {
  participants: Participant[];
  session: Session;
  now: number;
  currentUserId: string | null;
  /** 会話成立によるタイマー開始時刻（computeTimerStarts の結果） */
  timerStarts: Map<string, number>;
  /** ユーザーごとの発言数（countMessages の結果） */
  messageCounts: Map<string, number>;
}

export function ParticipantList({
  participants,
  session,
  now,
  currentUserId,
  timerStarts,
  messageCounts,
}: Props) {
  const { survivors, eliminated, silent, waiting } = summarize(
    participants,
    session,
    now,
    timerStarts
  );

  const row = (p: Participant, kind: string, badge?: string) => {
    const state = evaluate(p, session, now, timerStarts.get(p.id));
    const remaining =
      state.status === 'alive' && state.deadline !== null
        ? state.deadline - now
        : null;
    const count = messageCounts.get(p.id) ?? 0;

    return (
      <div
        key={p.id}
        className={`participant ${kind} ${p.id === currentUserId ? 'me' : ''}`}
      >
        <span className={`status-dot ${kind}`} />
        <span className="name">{p.name}</span>
        {p.id === currentUserId && <span className="me-badge">あなた</span>}
        {/* key に発言数を使い、増えるたびに要素を作り直してポップさせる */}
        <span key={count} className={`msg-count ${count > 0 ? 'pop' : ''}`}>
          💬{count}
        </span>
        {remaining !== null && (
          <span className={`remaining ${remaining < 15000 ? 'danger' : ''}`}>
            {formatDuration(remaining)}
          </span>
        )}
        {badge && <span className={`tag ${kind}`}>{badge}</span>}
      </div>
    );
  };

  return (
    <div className="participant-list">
      <h3>
        参加者 {participants.length}人
        {survivors.length > 0 && <span className="alive-count">／生存 {survivors.length}</span>}
      </h3>
      <div className="participants">
        {waiting.map((p) => row(p, 'waiting', '待機'))}
        {survivors.map((p) =>
          row(
            p,
            'alive',
            evaluate(p, session, now, timerStarts.get(p.id)).status === 'grace'
              ? '会話待ち'
              : undefined
          )
        )}
        {silent.map((p) => row(p, 'silent', '未発言'))}
        {eliminated.map((p) => row(p, 'dead', '脱落'))}
        {participants.length === 0 && (
          <p className="empty">まだ誰も参加していません</p>
        )}
      </div>
    </div>
  );
}
