import { useState, useEffect, useRef } from 'react';
import { Message, User, Room } from '../types';

interface Props {
  messages: Message[];
  user: User | null;
  room: Room | null;
  timeRemaining: number | null;
  onSendMessage: (text: string) => void;
}

export function ChatRoom({ messages, user, room, timeRemaining, onSendMessage }: Props) {
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && user && !user.isEliminated) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}秒`;
  };

  const isGameStarted = room?.isActive;
  const canSendMessage = user && !user.isEliminated && isGameStarted;

  return (
    <div className="chat-room">
      {timeRemaining !== null && user && !user.isEliminated && (
        <div className={`timer ${timeRemaining < 15000 ? 'danger' : timeRemaining < 30000 ? 'warning' : ''}`}>
          残り時間: {formatTime(timeRemaining)}
        </div>
      )}

      {user?.isEliminated && (
        <div className="eliminated-banner">
          あなたは脱落しました。観戦モードです。
        </div>
      )}

      <div className="messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.userId === user?.id ? 'mine' : ''}`}
          >
            <span className="sender">{msg.userName}</span>
            <span className="text">{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="message-form">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            !isGameStarted
              ? 'ゲーム開始を待っています...'
              : user?.isEliminated
              ? '脱落しました'
              : 'メッセージを入力...'
          }
          disabled={!canSendMessage}
        />
        <button type="submit" disabled={!canSendMessage || !text.trim()}>
          送信
        </button>
      </form>
    </div>
  );
}
