import { useState } from 'react';
import { Session } from '../types';
import { formatDuration, formatRange } from '../lib/survival';

interface Props {
  session: Session;
  onSubmit: (name: string) => void;
  isLoading?: boolean;
  defaultName?: string;
}

export function EntryForm({ session, onSubmit, isLoading, defaultName }: Props) {
  const [name, setName] = useState(defaultName ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <div className="entry-form">
      <h2>{session.title}</h2>
      <p className="session-range">{formatRange(session.startTime, session.endTime)}</p>
      <p className="description">
        一度発言すると沈黙タイマーが動きだします。
        <br />
        {formatDuration(session.silenceLimitMs)}だまると脱落。終了時間まで残れば生き残りです。
        <br />
        <span className="hint">まだ一度も発言していない間は脱落しません。途中参加もできます。</span>
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="あなたの名前を入力"
          maxLength={20}
          disabled={isLoading}
        />
        <button type="submit" disabled={!name.trim() || isLoading}>
          {isLoading ? '参加中...' : '参加する'}
        </button>
      </form>
    </div>
  );
}
