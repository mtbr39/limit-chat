import { useState } from 'react';
import { useSession } from '../hooks/useSession';
import { useNow } from '../hooks/useNow';
import { EntryForm } from './EntryForm';
import { ChatRoom } from './ChatRoom';
import { ParticipantList } from './ParticipantList';
import { Session, Membership } from '../types';
import { evaluate, formatDuration } from '../lib/survival';

interface Props {
  groupId: string;
  session: Session;
  uid: string | null;
  membership: Membership | null;
}

/** 開催中セッションのチャット。グループのトップページに埋め込まれる */
export function LiveSession({ groupId, session, uid, membership }: Props) {
  const { participants, messages, me, join, sendMessage } = useSession(
    groupId,
    session.id,
    uid
  );
  const now = useNow(1000);
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async (name: string) => {
    setIsJoining(true);
    try {
      await join(name);
    } finally {
      setIsJoining(false);
    }
  };

  if (!me) {
    return (
      <EntryForm
        session={session}
        onSubmit={handleJoin}
        isLoading={isJoining}
        defaultName={membership?.name}
      />
    );
  }

  const state = evaluate(me, session, now);

  return (
    <>
      <div className="live-heading">
        <h2>
          <span className="live-dot" />
          {session.title}
        </h2>
        <p className="live-meta">
          終了まで {formatDuration(session.endTime - now)}／沈黙{' '}
          {formatDuration(session.silenceLimitMs)} で脱落
        </p>
      </div>

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
    </>
  );
}
