import { useEffect } from 'react';
import { useSession } from '../hooks/useSession';
import { useGroup } from '../hooks/useGroup';
import { useNow } from '../hooks/useNow';
import { SessionResult } from '../components/SessionResult';
import { groupPath, linkProps } from '../lib/router';
import { sessionPhase, formatRange, formatDuration } from '../lib/survival';

interface Props {
  groupId: string;
  sessionId: string;
  uid: string | null;
  navigate: (to: string) => void;
}

/**
 * セッション単体のページ。開催中のチャットはグループのトップページで行うので、
 * ここは開始前のカウントダウンと終了後の結果表示だけを担当する。
 */
export function SessionPage({ groupId, sessionId, uid, navigate }: Props) {
  const { group } = useGroup(groupId, uid);
  const { session, participants, messages, loading } = useSession(
    groupId,
    sessionId,
    uid
  );
  const now = useNow(1000);

  const phase = session ? sessionPhase(session, now) : null;

  // 開催中ならチャット会場であるグループトップへ送る
  useEffect(() => {
    if (phase === 'live' && session && !session.canceledAt) {
      navigate(groupPath(groupId));
    }
  }, [phase, session, groupId, navigate]);

  if (loading) return <div className="loading">読み込み中...</div>;

  const backLink = (
    <a {...linkProps({ to: groupPath(groupId), navigate, className: 'ghost-link' })}>
      ← {group?.name ?? groupId}
    </a>
  );

  if (!session) {
    return (
      <div className="page">
        <div className="card">
          <h2>セッションが見つかりません</h2>
          {backLink}
        </div>
      </div>
    );
  }

  if (session.canceledAt) {
    return (
      <div className="page">
        <header>
          <h1>{session.title}</h1>
          <p className="subtitle">{formatRange(session.startTime, session.endTime)}</p>
        </header>
        <div className="card center">
          <h2>この回はキャンセルされました</h2>
          <p className="empty">開催は取りやめになりました。</p>
        </div>
        <footer className="page-footer">{backLink}</footer>
      </div>
    );
  }

  if (phase === 'live') {
    return <div className="loading">チャット会場へ移動しています...</div>;
  }

  if (phase === 'before') {
    return (
      <div className="page">
        <header>
          <h1>{session.title}</h1>
          <p className="subtitle">{formatRange(session.startTime, session.endTime)}</p>
        </header>
        <div className="card center">
          <p className="countdown-label">開始まで</p>
          <div className="countdown">{formatDuration(session.startTime - now)}</div>
          <p className="empty">
            開始時間になると、グループのトップページでチャットが始まります。
          </p>
        </div>
        <footer className="page-footer">{backLink}</footer>
      </div>
    );
  }

  return (
    <div className="page">
      <header>
        <h1>{session.title}</h1>
        <p className="subtitle">{formatRange(session.startTime, session.endTime)}</p>
      </header>
      <div className="main-content">
        <aside className="sidebar">
          <SessionResult
            participants={participants}
            session={session}
            now={now}
            currentUserId={uid}
          />
        </aside>
        <main className="chat-area">
          <div className="chat-room">
            <div className="banner silent">終了したセッションのログです</div>
            <div className="messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${msg.userId === uid ? 'mine' : ''}`}
                >
                  <span className="sender">{msg.userName}</span>
                  <span className="text">{msg.text}</span>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="empty">発言はありませんでした</p>
              )}
            </div>
          </div>
        </main>
      </div>
      <footer className="page-footer">{backLink}</footer>
    </div>
  );
}
