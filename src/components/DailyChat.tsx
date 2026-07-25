import { useState, useEffect, useRef } from 'react';
import { Membership } from '../types';
import { useChat } from '../hooks/useChat';
import { ChatLog } from './ChatLog';
import { notify } from '../lib/notify';

interface Props {
  groupId: string;
  uid: string | null;
  membership: Membership | null;
}

/**
 * 常時チャット（そのグループのメイン機能）。開催の有無にかかわらず使える。
 * 発言はメンバー登録した人だけ。午前4時を過ぎるとその日ぶんは過去ログになる。
 */
export function DailyChat({ groupId, uid, membership }: Props) {
  const { messages, sendMessage } = useChat(groupId, uid);
  const [text, setText] = useState('');

  // 新着メッセージの通知。このタブを見ているときと、自分の発言は通知しない。
  // 開いた時点より前（リロード時の履歴）も通知しない。
  const watchStart = useRef(Date.now());
  const seen = useRef(new Set<string>());
  useEffect(() => {
    for (const msg of messages) {
      if (seen.current.has(msg.id)) continue;
      seen.current.add(msg.id);
      if (msg.userId === uid) continue;
      if (msg.createdAt <= watchStart.current) continue;
      notify(msg.userName, msg.text, { onlyWhenHidden: true, tag: 'dailychat' });
    }
  }, [messages, uid]);

  const canPost = !!membership;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !canPost || !membership) return;
    sendMessage(body, membership.name);
    setText('');
  };

  return (
    <section className="card chat-card">
      <h2>チャット</h2>
      <div className="chat-room">
        <ChatLog messages={messages} currentUserId={uid} />

        <form onSubmit={handleSubmit} className="message-form">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              canPost ? 'メッセージを入力...' : '発言するには下で名前を登録してください'
            }
            maxLength={500}
            disabled={!canPost}
          />
          <button type="submit" disabled={!canPost || !text.trim()}>
            送信
          </button>
        </form>
      </div>
    </section>
  );
}
