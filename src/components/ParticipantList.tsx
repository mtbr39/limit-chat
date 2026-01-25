import { User } from '../types';

interface Props {
  participants: User[];
  currentUserId?: string;
}

export function ParticipantList({ participants, currentUserId }: Props) {
  const active = participants.filter((p) => !p.isEliminated);
  const eliminated = participants.filter((p) => p.isEliminated);

  return (
    <div className="participant-list">
      <h3>参加者 ({active.length}人生存)</h3>
      <div className="participants">
        {active.map((p) => (
          <div
            key={p.id}
            className={`participant active ${p.id === currentUserId ? 'me' : ''}`}
          >
            <span className="status-dot alive"></span>
            <span className="name">{p.name}</span>
            {p.id === currentUserId && <span className="me-badge">あなた</span>}
          </div>
        ))}
        {eliminated.map((p) => (
          <div
            key={p.id}
            className={`participant eliminated ${p.id === currentUserId ? 'me' : ''}`}
          >
            <span className="status-dot dead"></span>
            <span className="name">{p.name}</span>
            {p.id === currentUserId && <span className="me-badge">あなた</span>}
            <span className="eliminated-badge">脱落</span>
          </div>
        ))}
      </div>
    </div>
  );
}
