import { useGroup } from '../hooks/useGroup';
import { useNow } from '../hooks/useNow';
import { LiveSession } from '../components/LiveSession';
import { MemberList } from '../components/MemberList';
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
  const { group, sessions, members, membership, loading, updateNote } = useGroup(
    groupId,
    uid
  );
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

  // 同時に開催されるセッションは 1 つだけ
  const liveSession = sessions.find((s) => sessionPhase(s, now) === 'live') ?? null;
  const upcoming = sessions
    .filter((s) => sessionPhase(s, now) === 'before')
    .sort((a, b) => a.startTime - b.startTime);
  const past = sessions.filter((s) => sessionPhase(s, now) === 'ended');

  // 一度でも参加した人（=メンバー）だけが過去の履歴を見られる
  const canSeeHistory = !!membership || isAdmin;

  const sessionRow = (s: Session, note?: string) => (
    <li key={s.id}>
      <a {...linkProps({ to: sessionPath(group.id, s.id), navigate, className: 'session-item' })}>
        <span className="session-title">{s.title}</span>
        <span className="session-when">{formatRange(s.startTime, s.endTime)}</span>
        <span className="session-rule">沈黙 {formatDuration(s.silenceLimitMs)} で脱落</span>
        {note && <span className="session-note">{note}</span>}
      </a>
    </li>
  );

  return (
    <div className="page">
      <header>
        <h1>{group.name}</h1>
        {group.description && <p className="subtitle">{group.description}</p>}
        <p className="group-url">/{group.id}</p>
      </header>

      {liveSession ? (
        <LiveSession
          groupId={group.id}
          session={liveSession}
          uid={uid}
          membership={membership}
        />
      ) : (
        <section className="card center">
          <h2>いまは開催されていません</h2>
          {upcoming.length > 0 ? (
            <>
              <p className="countdown-label">{upcoming[0].title} 開始まで</p>
              <div className="countdown">
                {formatDuration(upcoming[0].startTime - now)}
              </div>
              <p className="empty">
                時間になるとこのページでチャットが始まります。
              </p>
            </>
          ) : (
            <p className="empty">次回の予定はまだ決まっていません。</p>
          )}
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="card">
          <h2>これからの予定</h2>
          <ul className="session-list">
            {upcoming.map((s) =>
              sessionRow(s, `開始まで ${formatDuration(s.startTime - now)}`)
            )}
          </ul>
        </section>
      )}

      <MemberList
        members={members}
        currentUserId={uid}
        isMember={!!membership}
        onUpdateNote={updateNote}
      />

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
