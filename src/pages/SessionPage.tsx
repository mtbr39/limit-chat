import { useState } from 'react';
import { useSession } from '../hooks/useSession';
import { useGroup } from '../hooks/useGroup';
import { useNow } from '../hooks/useNow';
import { EntryForm } from '../components/EntryForm';
import { ChatRoom } from '../components/ChatRoom';
import { ParticipantList } from '../components/ParticipantList';
import { SessionResult } from '../components/SessionResult';
import { groupPath, linkProps } from '../lib/router';
import {
  evaluate,
  sessionPhase,
  formatRange,
  formatDuration,
} from '../lib/survival';

interface Props {
  groupId: string;
  sessionId: string;
  uid: string | null;
  navigate: (to: string) => void;
}

export function SessionPage({ groupId, sessionId, uid, navigate }: Props) {
  const { group, membership } = useGroup(groupId, uid);
  const { session, participants, messages, me, loading, join, sendMessage } =
    useSession(groupId, sessionId, uid);
  const now = useNow(1000);
  const [isJoining, setIsJoining] = useState(false);

  if (loading) return <div className="loading">読み込み中...</div>;

  if (!session) {
    return (
      <div className="page">
        <div className="card">
          <h2>セッションが見つかりません</h2>
          <a {...linkProps({ to: groupPath(groupId), navigate, className: 'ghost-link' })}>
            グループへ戻る
          </a>
        </div>
      </div>
    );
  }

  const phase = sessionPhase(session, now);

  const handleJoin = async (name: string) => {
    setIsJoining(true);
    try {
      await join(name);
    } finally {
      setIsJoining(false);
    }
  };

  const backLink = (
    <a {...linkProps({ to: groupPath(groupId), navigate, className: 'ghost-link' })}>
      ← {group?.name ?? groupId}
    </a>
  );

  // 開始前
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
            開始時間になるとこのページでチャットに参加できます。
          </p>
        </div>
        <footer className="page-footer">{backLink}</footer>
      </div>
    );
  }

  // 終了後（未参加者でも結果とログを見られる）
  if (phase === 'ended') {
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
                {messages.length === 0 && <p className="empty">発言はありませんでした</p>}
              </div>
            </div>
          </main>
        </div>
        <footer className="page-footer">{backLink}</footer>
      </div>
    );
  }

  // 開催中で未参加なら参加フォーム（開始10分後に来ても参加できる）
  if (!me) {
    return (
      <div className="page">
        <EntryForm
          session={session}
          onSubmit={handleJoin}
          isLoading={isJoining}
          defaultName={membership?.name}
        />
        <footer className="page-footer">{backLink}</footer>
      </div>
    );
  }

  const state = evaluate(me, session, now);

  return (
    <div className="page">
      <header>
        <h1>{session.title}</h1>
        <p className="subtitle">
          終了まで {formatDuration(session.endTime - now)}／沈黙{' '}
          {formatDuration(session.silenceLimitMs)} で脱落
        </p>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <ParticipantList
            participants={participants}
            session={session}
            now={now}
            currentUserId={uid}
          />
        </aside>

        <main className="chat-area">
          <ChatRoom
            messages={messages}
            me={me}
            session={session}
            state={state}
            now={now}
            onSendMessage={sendMessage}
          />
        </main>
      </div>

      <footer className="page-footer">{backLink}</footer>
    </div>
  );
}
