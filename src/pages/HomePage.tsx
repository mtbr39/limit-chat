import { useGroupList } from '../hooks/useGroup';
import { groupPath, linkProps } from '../lib/router';

interface Props {
  navigate: (to: string) => void;
  isAdmin: boolean;
}

export function HomePage({ navigate, isAdmin }: Props) {
  const groups = useGroupList();

  return (
    <div className="page">
      <header>
        <h1>サバイバルチャット</h1>
        <p className="subtitle">だまったら脱落。終了時間まで生き残れ。</p>
      </header>

      <section className="card">
        <h2>グループ</h2>
        {groups.length === 0 ? (
          <p className="empty">まだグループがありません。</p>
        ) : (
          <ul className="group-list">
            {groups.map((g) => (
              <li key={g.id}>
                <a {...linkProps({ to: groupPath(g.id), navigate, className: 'group-item' })}>
                  <span className="group-name">{g.name}</span>
                  <span className="group-slug">/{g.id}</span>
                  {g.description && <span className="group-desc">{g.description}</span>}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="page-footer">
        <a {...linkProps({ to: '/admin', navigate, className: 'ghost-link' })}>
          {isAdmin ? '管理画面へ' : '管理者ログイン'}
        </a>
      </footer>
    </div>
  );
}
