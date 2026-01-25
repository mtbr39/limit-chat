import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useRoom } from './hooks/useRoom';
import { useChat } from './hooks/useChat';
import { useElimination } from './hooks/useElimination';
import { EntryForm } from './components/EntryForm';
import { RoomSetup } from './components/RoomSetup';
import { ChatRoom } from './components/ChatRoom';
import { ParticipantList } from './components/ParticipantList';

const ROOM_ID = 'main-room';

function App() {
  const [isJoining, setIsJoining] = useState(false);
  const { firebaseUser, user, loading, signIn, setName } = useAuth(ROOM_ID);
  const { room, participants, createRoom, startRoom } = useRoom(ROOM_ID);
  const { messages, sendMessage } = useChat(ROOM_ID, user);
  const { timeRemaining } = useElimination(ROOM_ID, room, user, participants);

  useEffect(() => {
    if (!loading && !firebaseUser) {
      signIn();
    }
  }, [loading, firebaseUser, signIn]);

  const handleJoin = async (name: string) => {
    setIsJoining(true);
    await setName(name);
    setIsJoining(false);
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  if (!user) {
    return (
      <div className="container">
        <EntryForm onSubmit={handleJoin} isLoading={isJoining} />
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <h1>サバイバルチャット</h1>
        <p className="subtitle">1分間沈黙したら脱落！</p>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <ParticipantList participants={participants} currentUserId={user.id} />
          {!room?.isActive && (
            <RoomSetup
              room={room}
              participantCount={participants.length}
              onCreateRoom={createRoom}
              onStartRoom={startRoom}
            />
          )}
        </aside>

        <main className="chat-area">
          <ChatRoom
            messages={messages}
            user={user}
            room={room}
            timeRemaining={timeRemaining}
            onSendMessage={sendMessage}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
