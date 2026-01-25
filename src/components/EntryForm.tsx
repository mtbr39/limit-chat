import { useState } from 'react';

interface Props {
  onSubmit: (name: string) => void;
  isLoading?: boolean;
}

export function EntryForm({ onSubmit, isLoading }: Props) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <div className="entry-form">
      <h2>サバイバルチャットへようこそ</h2>
      <p className="description">
        1分間何も発言しないと脱落するチャットです。
        <br />
        生き残れるのは誰だ？
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
