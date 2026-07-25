import { useAuth } from './hooks/useAuth';
import { useRoute } from './lib/router';
import { HomePage } from './pages/HomePage';
import { GroupPage } from './pages/GroupPage';
import { SessionPage } from './pages/SessionPage';
import { LogPage } from './pages/LogPage';
import { AdminPage } from './pages/AdminPage';

function App() {
  const { uid, isAdmin, loading, signInAsAdmin, signOutAdmin } = useAuth();
  const { route, navigate } = useRoute();

  if (loading || !uid) {
    return <div className="loading">読み込み中...</div>;
  }

  switch (route.name) {
    case 'home':
      return <HomePage />;

    case 'admin':
      return (
        <AdminPage
          uid={uid}
          isAdmin={isAdmin}
          signInAsAdmin={signInAsAdmin}
          signOutAdmin={signOutAdmin}
          navigate={navigate}
        />
      );

    case 'group':
      return (
        <GroupPage
          groupId={route.groupId}
          uid={uid}
          isAdmin={isAdmin}
          navigate={navigate}
        />
      );

    case 'session':
      return (
        <SessionPage
          groupId={route.groupId}
          sessionId={route.sessionId}
          uid={uid}
          navigate={navigate}
        />
      );

    case 'log':
      return (
        <LogPage
          groupId={route.groupId}
          dayKey={route.dayKey}
          uid={uid}
          isAdmin={isAdmin}
          navigate={navigate}
        />
      );

    default:
      return (
        <div className="page">
          <div className="card center">
            <h2>ページが見つかりません</h2>
          </div>
        </div>
      );
  }
}

export default App;
