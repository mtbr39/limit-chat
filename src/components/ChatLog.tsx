import { useEffect, useRef } from 'react';
import { ChatMessage } from '../types';

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

interface Props {
  messages: ChatMessage[];
  currentUserId: string | null;
  emptyText?: string;
  /** 新着で末尾へスクロールするか（過去ログ表示では先頭のまま見せたいので false） */
  autoScroll?: boolean;
}

/** チャットメッセージの一覧表示（入力欄は持たない）。常時チャットと過去ログで共用する */
export function ChatLog({
  messages,
  currentUserId,
  emptyText = 'まだ発言がありません',
  autoScroll = true,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoScroll) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, autoScroll]);

  return (
    <div className="messages" ref={listRef}>
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`message ${msg.userId === currentUserId ? 'mine' : ''}`}
        >
          <span className="message-meta">
            <span className="sender">{msg.userName}</span>
            <span className="time">{formatTime(msg.createdAt)}</span>
          </span>
          <span className="text">{msg.text}</span>
        </div>
      ))}
      {messages.length === 0 && <p className="empty">{emptyText}</p>}
    </div>
  );
}
