import { useState } from 'react';
import { Membership } from '../types';
import { useNow } from '../hooks/useNow';
import { formatTimeAgo, formatDateTime } from '../lib/survival';

interface Props {
  members: Membership[];
  currentUserId: string | null;
  isMember: boolean;
  onUpdateNote: (note: string) => Promise<void>;
}

const MAX_NOTE = 60;

export function MemberList({ members, currentUserId, isMember, onUpdateNote }: Props) {
  const me = members.find((m) => m.id === currentUserId) ?? null;
  const now = useNow(30 * 1000);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const startEditing = () => {
    setDraft(me?.note ?? '');
    setEditing(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onUpdateNote(draft.trim().slice(0, MAX_NOTE));
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>メンバー {members.length}人</h2>

      {members.length === 0 ? (
        <p className="empty">まだ誰も参加していません。</p>
      ) : (
        <ul className="member-list">
          {members.map((m) => (
            <li key={m.id} className={m.id === currentUserId ? 'member me' : 'member'}>
              <div className="member-head">
                <span className="member-name">{m.name}</span>
                {m.id === currentUserId && <span className="me-badge">あなた</span>}
              </div>
              {m.note ? (
                <>
                  <p className="member-note">{m.note}</p>
                  {m.noteUpdatedAt !== null && (
                    <time
                      className="member-note-time"
                      dateTime={new Date(m.noteUpdatedAt).toISOString()}
                    >
                      <span className="relative">
                        {formatTimeAgo(m.noteUpdatedAt, now)}
                      </span>
                      <span className="absolute">
                        {formatDateTime(m.noteUpdatedAt)}
                      </span>
                    </time>
                  )}
                </>
              ) : (
                <p className="member-note empty">ひとこと未設定</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {isMember &&
        (editing ? (
          <form className="note-editor" onSubmit={save}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="ひとことを書く"
              maxLength={MAX_NOTE}
              autoFocus
            />
            <button type="submit" disabled={busy}>
              {busy ? '保存中...' : '保存'}
            </button>
            <button type="button" className="ghost-link" onClick={() => setEditing(false)}>
              キャンセル
            </button>
          </form>
        ) : (
          <button className="note-edit-trigger" onClick={startEditing}>
            {me?.note ? '✏️ ひとことを編集' : '✏️ ひとことを書く'}
          </button>
        ))}
    </section>
  );
}
