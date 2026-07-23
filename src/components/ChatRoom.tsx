import { useState, useEffect, useRef } from 'react';
import { Message, Participant, Session } from '../types';
import { SurvivalState, canSpeak, formatDuration } from '../lib/survival';

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

interface Props {
  messages: Message[];
  me: Participant | null;
  session: Session;
  state: SurvivalState;
  now: number;
  onSendMessage: (text: string) => void;
}

export function ChatRoom({ messages, me, session, state, now, onSendMessage }: Props) {
  const [text, setText] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);

  // scrollIntoView だとページ全体まで動いてしまうので、
  // メッセージ一覧のコンテナ内部だけをスクロールする
  useEffect(() => {
    const el = messagesRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const speakable = canSpeak(state);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && speakable) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  const remaining = state.deadline !== null ? state.deadline - now : null;
  const sessionRemaining = session.endTime - now;

  const placeholder = () => {
    switch (state.status) {
      case 'waiting':
        return '開始時間になるまで待ってください';
      case 'eliminated':
        return '脱落しました';
      case 'survived':
      case 'silent':
        return 'このセッションは終了しました';
      default:
        return 'メッセージを入力...';
    }
  };

  return (
    <div className="chat-room">
      {state.status === 'grace' && (
        <div className="banner grace">
          {me?.firstMessageAt == null
            ? 'まだ沈黙タイマーは動いていません。60秒以内にお互いが発言し合う（会話が成立する）とカウントが始まります。'
            : '発言に誰かが60秒以内に反応する（会話が成立する）と沈黙タイマーが始まります。'}
        </div>
      )}

      {state.status === 'alive' && remaining !== null && (
        <div
          className={`timer ${
            remaining < 15000 ? 'danger' : remaining < 30000 ? 'warning' : ''
          }`}
        >
          沈黙まで残り {formatDuration(remaining)}
          <span className="session-remaining">
            ／終了まで {formatDuration(sessionRemaining)}
          </span>
        </div>
      )}

      {state.status === 'eliminated' && (
        <div className="banner dead">
          あなたは脱落しました。観戦モードです。
        </div>
      )}

      {state.status === 'survived' && (
        <div className="banner survived">
          🎉 最後まで生き残りました！
        </div>
      )}

      {state.status === 'silent' && (
        <div className="banner silent">
          一度も発言しないままセッションが終了しました。
        </div>
      )}

      <div className="messages" ref={messagesRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.userId === me?.id ? 'mine' : ''}`}
          >
            <span className="message-meta">
              <span className="sender">{msg.userName}</span>
              <span className="time">{formatTime(msg.createdAt)}</span>
            </span>
            <span className="text">{msg.text}</span>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="empty">まだ発言がありません</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="message-form">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder()}
          maxLength={500}
          disabled={!speakable}
        />
        <button type="submit" disabled={!speakable || !text.trim()}>
          送信
        </button>
      </form>
    </div>
  );
}
