import { useEffect, useRef } from 'react';
import { useGroup } from '../hooks/useGroup';
import { useNow } from '../hooks/useNow';
import { LiveSession } from '../components/LiveSession';
import { MemberList } from '../components/MemberList';
import { GroupJoinForm } from '../components/GroupJoinForm';
import { NotifyToggle } from '../components/NotifyToggle';
import { Session } from '../types';
import { sessionPath, linkProps } from '../lib/router';
import { sessionPhase, formatRange, formatDuration } from '../lib/survival';
import { notify } from '../lib/notify';

interface Props {
  groupId: string;
  uid: string | null;
  isAdmin: boolean;
  navigate: (to: string) => void;
}

export function GroupPage({ groupId, uid, isAdmin, navigate }: Props) {
  const {
    group,
    sessions,
    members,
    membership,
    loading,
    joinGroup,
    updateNote,
    updateName,
  } = useGroup(groupId, uid);
  const now = useNow(1000);

  // キャンセルされた回は参加者側には出さない
  const activeSessions = sessions.filter((s) => !s.canceledAt);

  // 同時に開催されるセッションは 1 つだけ
  const liveSession = activeSessions.find((s) => sessionPhase(s, now) === 'live') ?? null;
  const upcoming = activeSessions
    .filter((s) => sessionPhase(s, now) === 'before')
    .sort((a, b) => a.startTime - b.startTime);
  const past = activeSessions.filter((s) => sessionPhase(s, now) === 'ended');

  // このページを開いた時刻。それより前の出来事は通知しない（リロードで再通知しない）
  const watchStart = useRef(Date.now());

  // セッション開催の通知。ページを開いている間に開始時刻を迎えたときだけ鳴らす
  const notifiedSessions = useRef(new Set<string>());
  useEffect(() => {
    if (!liveSession || !group) return;
    if (liveSession.startTime < watchStart.current) return;
    if (notifiedSessions.current.has(liveSession.id)) return;
    notifiedSessions.current.add(liveSession.id);
    notify(group.name, `「${liveSession.title}」が始まりました！`, {
      tag: `session-${liveSession.id}`,
    });
  }, [liveSession, group]);

  // ひとこと変更の通知。自分の変更は通知しない
  const seenNotes = useRef(new Map<string, number | null>());
  useEffect(() => {
    for (const m of members) {
      const prev = seenNotes.current.get(m.id);
      seenNotes.current.set(m.id, m.noteUpdatedAt);
      if (m.id === uid) continue;
      if (m.noteUpdatedAt == null) continue;
      if (m.noteUpdatedAt <= watchStart.current) continue;
      if (prev === m.noteUpdatedAt) continue;
      notify(`${m.name}さんがひとことを更新`, m.note, { tag: `note-${m.id}` });
    }
  }, [members, uid]);

  if (loading) return <div className="loading">読み込み中...</div>;

  if (!group) {
    return (
      <div className="page">
        <div className="card center">
          <h2>グループが見つかりません</h2>
          <p className="empty">/{groupId} は存在しないか、削除されています。</p>
        </div>
      </div>
    );
  }

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
        <NotifyToggle />
      </header>

      {liveSession && (
        <LiveSession
          groupId={group.id}
          session={liveSession}
          uid={uid}
          membership={membership}
        />
      )}

      {!membership && <GroupJoinForm group={group} onJoin={joinGroup} />}

      {/*
        開催されていない間は「ひとこと」が唯一のコミュニケーション手段なので、
        メンバー一覧をメインコンテンツとして先頭に置く。
      */}
      <MemberList
        members={members}
        currentUserId={uid}
        isMember={!!membership}
        onUpdateNote={updateNote}
        onUpdateName={updateName}
      />

      {!liveSession && (
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
    </div>
  );
}
