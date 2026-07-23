import { useEffect, useRef } from 'react';
import { useSession } from '../hooks/useSession';
import { useNow } from '../hooks/useNow';
import { ChatRoom } from './ChatRoom';
import { ParticipantList } from './ParticipantList';
import { Session, Membership } from '../types';
import {
  computeTimerStarts,
  countMessages,
  evaluate,
  formatDuration,
} from '../lib/survival';

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
  const joinAttempted = useRef(false);

  // グループに参加済み（名前がある）なら、チャット開始時に自動で参加者になる。
  // 名前はグループページの参加フォームで登録済みのものを使うので、ここでは訊かない。
  useEffect(() => {
    if (!me && membership && !joinAttempted.current) {
      joinAttempted.current = true;
      join(membership.name).catch(() => {
        joinAttempted.current = false;
      });
    }
  }, [me, membership, join]);

  // まだグループに参加していない人には、下のグループ参加フォームで
  // 名前を登録してもらう。ここではチャットを出さない。
  if (!membership) return null;

  if (!me) {
    return <div className="loading">チャットに参加しています...</div>;
  }

  const timerStarts = computeTimerStarts(messages);
  const messageCounts = countMessages(messages);
  const state = evaluate(me, session, now, timerStarts.get(me.id));

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
            timerStarts={timerStarts}
            messageCounts={messageCounts}
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
