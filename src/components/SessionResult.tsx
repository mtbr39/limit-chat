import { Message, Participant, Session } from '../types';
import { computeTimerStarts, countMessages, summarize } from '../lib/survival';

interface Props {
  participants: Participant[];
  session: Session;
  messages: Message[];
  now: number;
  currentUserId: string | null;
}

export function SessionResult({
  participants,
  session,
  messages,
  now,
  currentUserId,
}: Props) {
  const timerStarts = computeTimerStarts(messages);
  const { survivors, eliminated, silent } = summarize(
    participants,
    session,
    now,
    timerStarts
  );

  const nameOf = (p: Participant) => (
    <span className={p.id === currentUserId ? 'name me' : 'name'}>
      {p.name}
      {p.id === currentUserId && <span className="me-badge">あなた</span>}
    </span>
  );

  // 発言数が多い順に順位をつける。生き残りは同数なら脱落者より上位。
  const counts = countMessages(messages);
  const survivorIds = new Set(survivors.map((p) => p.id));
  const ranked = [...survivors, ...eliminated]
    .map((p) => ({
      p,
      count: counts.get(p.id) ?? 0,
      survived: survivorIds.has(p.id),
    }))
    .sort(
      (a, b) => b.count - a.count || Number(b.survived) - Number(a.survived)
    );

  // 発言数が同じなら同率順位（例: 2位, 2位, 4位）
  const rankOf = (index: number): number => {
    while (index > 0 && ranked[index].count === ranked[index - 1].count) {
      index--;
    }
    return index + 1;
  };

  return (
    <div className="result">
      <h2>結果</h2>

      <div className="result-block">
        <h3>順位（発言数）</h3>
        {ranked.length === 0 ? (
          <p className="empty">発言した人はいませんでした。</p>
        ) : (
          <ul>
            {ranked.map(({ p, count, survived }, i) => (
              <li key={p.id} className={survived ? 'survived' : 'dead'}>
                <span className="rank">{rankOf(i)}位</span>
                {nameOf(p)}
                {!survived && <span className="tag dead">脱落</span>}
                <span className="detail">💬{count}</span>
              </li>
            ))}
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
