import { useGroup } from '../hooks/useGroup';
import { useNow } from '../hooks/useNow';
import { Session } from '../types';
import { sessionPath, linkProps } from '../lib/router';
import { sessionPhase, formatRange, formatDuration } from '../lib/survival';

interface Props {
  groupId: string;
  uid: string | null;
  isAdmin: boolean;
  navigate: (to: string) => void;
}

export function GroupPage({ groupId, uid, isAdmin, navigate }: Props) {
  const { group, sessions, membership, loading } = useGroup(groupId, uid);
  const now = useNow(1000);

  if (loading) return <div className="loading">読み込み中...</div>;

  if (!group) {
    return (
      <div className="page">
        <div className="card">
          <h2>グループが見つかりません</h2>
          <p className="empty">/{groupId} は存在しないか、削除されています。</p>
          <a {...linkProps({ to: '/', navigate, className: 'ghost-link' })}>トップへ</a>
        </div>
      </div>
    );
  }

  const upcoming = sessions
    .filter((s) => sessionPhase(s, now) === 'before')
    .sort((a, b) => a.startTime - b.startTime);
  const live = sessions.filter((s) => sessionPhase(s, now) === 'live');
  const past = sessions.filter((s) => sessionPhase(s, now) === 'ended');

  // 一度でも参加した人（=メンバー）だけが過去の履歴を見られる
  const canSeeHistory = !!membership || isAdmin;

  const sessionRow = (s: Session, note?: string) => (
    <li key={s.id}>
      <a {...linkProps({ to: sessionPath(group.id, s.id), navigate, className: 'session-item' })}>
        <span className="session-title">{s.title}</span>
        <span className="session-when">{formatRange(s.startTime, s.endTime)}</span>
        <span className="session-rule">
          沈黙 {formatDuration(s.silenceLimitMs)} で脱落
        </span>
        {note && <span className="session-note">{note}</span>}
      </a>
    </li>
  );

  return (
    <div className="page">
      <header>
        <h1>{group.name}</h1>
        {group.description && <p className="subtitle">{group.description}</p>}
        <p className="group-url">このグループのURL: /{group.id}</p>
      </header>

      {live.length > 0 && (
        <section className="card highlight">
          <h2>開催中</h2>
          <ul className="session-list">
            {live.map((s) => sessionRow(s, '今すぐ参加できます'))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>次回の予定</h2>
        {upcoming.length === 0 ? (
          <p className="empty">予定されているセッションはありません。</p>
        ) : (
          <ul className="session-list">
            {upcoming.map((s) =>
              sessionRow(s, `開始まで ${formatDuration(s.startTime - now)}`)
            )}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>過去のセッション</h2>
        {!canSeeHistory ? (
          <p className="empty">
            一度セッションに参加すると、このグループの履歴を見られるようになります。
          </p>
        ) : past.length === 0 ? (
          <p className="empty">まだ開催実績がありません。</p>
        ) : (
          <ul className="session-list">{past.map((s) => sessionRow(s))}</ul>
        )}
      </section>

      <footer className="page-footer">
        <a {...linkProps({ to: '/', navigate, className: 'ghost-link' })}>トップへ</a>
        {isAdmin && (
          <a {...linkProps({ to: '/admin', navigate, className: 'ghost-link' })}>
            管理画面
          </a>
        )}
      </footer>
    </div>
  );
}
