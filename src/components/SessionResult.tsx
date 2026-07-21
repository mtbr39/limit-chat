import { Participant, Session } from '../types';
import { summarize, evaluate, formatDuration } from '../lib/survival';

interface Props {
  participants: Participant[];
  session: Session;
  now: number;
  currentUserId: string | null;
}

export function SessionResult({ participants, session, now, currentUserId }: Props) {
  const { survivors, eliminated, silent } = summarize(participants, session, now);

  const nameOf = (p: Participant) => (
    <span className={p.id === currentUserId ? 'name me' : 'name'}>
      {p.name}
      {p.id === currentUserId && <span className="me-badge">あなた</span>}
    </span>
  );

  return (
    <div className="result">
      <h2>結果</h2>

      <div className="result-block survived">
        <h3>生き残り {survivors.length}人</h3>
        {survivors.length === 0 ? (
          <p className="empty">全員脱落しました。</p>
        ) : (
          <ul>
            {survivors.map((p) => (
              <li key={p.id}>{nameOf(p)}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="result-block dead">
        <h3>脱落 {eliminated.length}人</h3>
        {eliminated.length === 0 ? (
          <p className="empty">脱落者はいません。</p>
        ) : (
          <ul>
            {eliminated.map((p) => {
              const { eliminatedAt } = evaluate(p, session, now);
              return (
                <li key={p.id}>
                  {nameOf(p)}
                  <span className="detail">
                    開始{formatDuration((eliminatedAt ?? 0) - session.startTime)}後に脱落
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {silent.length > 0 && (
        <div className="result-block silent">
          <h3>未発言 {silent.length}人</h3>
          <ul>
            {silent.map((p) => (
              <li key={p.id}>{nameOf(p)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
