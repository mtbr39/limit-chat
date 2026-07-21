import { useState } from 'react';
import { Group } from '../types';

interface Props {
  group: Group;
  onJoin: (name: string) => Promise<void>;
}

/** セッションの開催有無に関わらず、グループのメンバーになるための入口 */
export function GroupJoinForm({ group, onJoin }: Props) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onJoin(name.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card center join-card">
      <h2>{group.name} に参加する</h2>
      <p className="description">
        名前を登録するとメンバー一覧に並び、ひとことを書けるようになります。
        <br />
        <span className="hint">
          過去のセッションの記録も、参加すると見られます。
        </span>
      </p>
      <form onSubmit={submit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="あなたの名前を入力"
          maxLength={20}
          disabled={busy}
        />
        <button type="submit" disabled={busy || !name.trim()}>
          {busy ? '参加中...' : '参加する'}
        </button>
      </form>
    </section>
  );
}
