import { useState, useEffect, useRef } from 'react';
import { Message, Participant, Session } from '../types';
import { SurvivalState, canSpeak, formatDuration } from '../lib/survival';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
          まだ沈黙タイマーは動いていません。最初の発言をするとカウントが始まります。
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

      <div className="messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.userId === me?.id ? 'mine' : ''}`}
          >
            <span className="sender">{msg.userName}</span>
            <span className="text">{msg.text}</span>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="empty">まだ発言がありません</p>
        )}
        <div ref={messagesEndRef} />
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
