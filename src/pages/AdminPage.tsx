import { useState } from 'react';
import { useGroupList, useGroupAdmin, useGroup } from '../hooks/useGroup';
import { groupPath, sessionPath, linkProps } from '../lib/router';
import { formatRange } from '../lib/survival';

interface Props {
  uid: string | null;
  isAdmin: boolean;
  signInAsAdmin: (email: string, password: string) => Promise<void>;
  signOutAdmin: () => Promise<void>;
  navigate: (to: string) => void;
}

/** datetime-local の value に変換（ローカルタイム） */
function toLocalInput(ts: number): string {
  const d = new Date(ts - new Date().getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

export function AdminPage({
  uid,
  isAdmin,
  signInAsAdmin,
  signOutAdmin,
  navigate,
}: Props) {
  if (!isAdmin) {
    return <LoginCard signInAsAdmin={signInAsAdmin} />;
  }
  return <AdminConsole uid={uid} signOutAdmin={signOutAdmin} navigate={navigate} />;
}

function LoginCard({ signInAsAdmin }: Pick<Props, 'signInAsAdmin'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInAsAdmin(email, password);
    } catch {
      setError('メールアドレスまたはパスワードが違います');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="entry-form">
        <h2>管理者ログイン</h2>
        <p className="description">
          セッションの開催予定を作れるのは管理者だけです。
        </p>
        <form onSubmit={submit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="メールアドレス"
            autoComplete="username"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            autoComplete="current-password"
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy || !email || !password}>
            {busy ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminConsole({
  uid,
  signOutAdmin,
  navigate,
}: Pick<Props, 'uid' | 'signOutAdmin' | 'navigate'>) {
  const groups = useGroupList();
  const { createGroup, createSession } = useGroupAdmin(uid);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  return (
    <div className="page">
      <header>
        <h1>管理画面</h1>
      </header>

      <CreateGroupCard
        onCreate={createGroup}
        onCreated={(slug) => setSelectedGroupId(slug)}
      />

      <section className="card">
        <h2>グループ</h2>
        {groups.length === 0 ? (
          <p className="empty">まだグループがありません。</p>
        ) : (
          <ul className="group-list">
            {groups.map((g) => (
              <li key={g.id}>
                <button
                  className={`group-item selectable ${
                    selectedGroupId === g.id ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedGroupId(g.id)}
                >
                  <span className="group-name">{g.name}</span>
                  <span className="group-slug">/{g.id}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedGroupId && (
        <CreateSessionCard
          groupId={selectedGroupId}
          onCreate={createSession}
          navigate={navigate}
        />
      )}

      <footer className="page-footer">
        <button className="ghost-link" onClick={signOutAdmin}>
          ログアウト
        </button>
      </footer>
    </div>
  );
}

function CreateGroupCard({
  onCreate,
  onCreated,
}: {
  onCreate: (slug: string, name: string, description: string) => Promise<string>;
  onCreated: (slug: string) => void;
}) {
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onCreate(slug.trim(), name.trim(), description.trim());
      onCreated(slug.trim());
      setSlug('');
      setName('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>グループを作る</h2>
      <form className="admin-form" onSubmit={submit}>
        <label>
          URL（固定・あとから変更できません）
          <div className="slug-input">
            <span className="prefix">{window.location.origin}/</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="my-group"
            />
          </div>
        </label>
        <label>
          グループ名
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ぼくらのサバイバル部"
          />
        </label>
        <label>
          説明（任意）
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="毎週金曜の夜にやってます"
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy || !slug.trim() || !name.trim()}>
          {busy ? '作成中...' : 'グループを作成'}
        </button>
      </form>
    </section>
  );
}

function CreateSessionCard({
  groupId,
  onCreate,
  navigate,
}: {
  groupId: string;
  onCreate: (
    groupId: string,
    input: {
      title: string;
      startTime: number;
      endTime: number;
      silenceLimitMs: number;
    }
  ) => Promise<string>;
  navigate: (to: string) => void;
}) {
  const { sessions } = useGroup(groupId, null);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(() => toLocalInput(Date.now() + 5 * 60 * 1000));
  const [end, setEnd] = useState(() => toLocalInput(Date.now() + 35 * 60 * 1000));
  const [silenceSec, setSilenceSec] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const id = await onCreate(groupId, {
        title: title.trim() || '無題のセッション',
        startTime: new Date(start).getTime(),
        endTime: new Date(end).getTime(),
        silenceLimitMs: silenceSec * 1000,
      });
      setTitle('');
      navigate(sessionPath(groupId, id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>
        セッションを作る <span className="group-slug">/{groupId}</span>
      </h2>
      <form className="admin-form" onSubmit={submit}>
        <label>
          タイトル
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="第3回サバイバル"
          />
        </label>
        <div className="form-row">
          <label>
            開始時間
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            終了時間
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        <label>
          沈黙の制限（秒）
          <input
            type="number"
            min={10}
            max={3600}
            value={silenceSec}
            onChange={(e) => setSilenceSec(Number(e.target.value))}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? '作成中...' : 'セッションを作成'}
        </button>
      </form>

      <h3 className="sub-heading">このグループのセッション</h3>
      {sessions.length === 0 ? (
        <p className="empty">まだありません。</p>
      ) : (
        <ul className="session-list compact">
          {sessions.map((s) => (
            <li key={s.id}>
              <a
                {...linkProps({
                  to: sessionPath(groupId, s.id),
                  navigate,
                  className: 'session-item',
                })}
              >
                <span className="session-title">{s.title}</span>
                <span className="session-when">
                  {formatRange(s.startTime, s.endTime)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <a
        {...linkProps({ to: groupPath(groupId), navigate, className: 'ghost-link' })}
      >
        グループページを見る
      </a>
    </section>
  );
}
