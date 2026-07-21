/**
 * ルートには何も置かない。グループは URL を知っている人だけが入る想定なので、
 * 一覧も管理画面へのリンクも出さない。
 */
export function HomePage() {
  return (
    <div className="page">
      <div className="card center">
        <h2>サバイバルチャット</h2>
        <p className="empty">
          グループの URL を直接開いてください。
        </p>
      </div>
    </div>
  );
}
