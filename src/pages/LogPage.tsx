import { useGroup } from '../hooks/useGroup';
import { useChatDay } from '../hooks/useChat';
import { ChatLog } from '../components/ChatLog';
import { groupPath, linkProps } from '../lib/router';
import { formatDayLabel } from '../lib/day';

interface Props {
  groupId: string;
  dayKey: string;
  uid: string | null;
  isAdmin: boolean;
  navigate: (to: string) => void;
}

/**
 * 常時チャットの過去1日ぶんのログ（読み取り専用）。
 * 履歴なので、一度でも参加したメンバー（または管理者）だけが見られる。
 */
export function LogPage({ groupId, dayKey, uid, isAdmin, navigate }: Props) {
  const { group, membership, loading } = useGroup(groupId, uid);
  const { messages, loading: messagesLoading } = useChatDay(groupId, dayKey);

  const backLink = (
    <a {...linkProps({ to: groupPath(groupId), navigate, className: 'ghost-link' })}>
      ← {group?.name ?? groupId}
    </a>
  );

  if (loading) return <div className="loading">読み込み中...</div>;

  const canSeeHistory = !!membership || isAdmin;

  return (
    <div className="page">
      <header>
        <h1>{formatDayLabel(dayKey)} のチャット</h1>
        {group && <p className="subtitle">{group.name}</p>}
      </header>

      {!canSeeHistory ? (
        <div className="card center">
          <h2>ログを見るにはメンバー登録が必要です</h2>
          <p className="empty">
            一度チャットに参加すると、このグループの過去ログを見られるようになります。
          </p>
        </div>
      ) : (
        <div className="card chat-card">
          <div className="chat-room">
            <div className="banner silent">
              {formatDayLabel(dayKey)} のログです（読み取り専用）
            </div>
            {messagesLoading ? (
              <p className="empty" style={{ padding: '1rem' }}>
                読み込み中...
              </p>
            ) : (
              <ChatLog
                messages={messages}
                currentUserId={uid}
                emptyText="この日の発言はありません"
                autoScroll={false}
              />
            )}
          </div>
        </div>
      )}

      <footer className="page-footer">{backLink}</footer>
    </div>
  );
}
