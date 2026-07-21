import { Participant, Session } from '../types';
import { evaluate, summarize, formatDuration } from '../lib/survival';

interface Props {
  participants: Participant[];
  session: Session;
  now: number;
  currentUserId: string | null;
}

export function ParticipantList({ participants, session, now, currentUserId }: Props) {
  const { survivors, eliminated, silent, waiting } = summarize(
    participants,
    session,
    now
  );

  const row = (p: Participant, kind: string, badge?: string) => {
    const state = evaluate(p, session, now);
    const remaining =
      state.status === 'alive' && state.deadline !== null
        ? state.deadline - now
        : null;

    return (
      <div
        key={p.id}
        className={`participant ${kind} ${p.id === currentUserId ? 'me' : ''}`}
      >
        <span className={`status-dot ${kind}`} />
        <span className="name">{p.name}</span>
        {p.id === currentUserId && <span className="me-badge">あなた</span>}
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
            evaluate(p, session, now).status === 'grace' ? '未発言' : undefined
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
