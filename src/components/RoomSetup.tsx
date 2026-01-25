import { useState, useEffect } from 'react';
import { Room } from '../types';

interface Props {
  room: Room | null;
  participantCount: number;
  onCreateRoom: (startTime: number) => void;
  onStartRoom: () => void;
}

export function RoomSetup({ room, participantCount, onCreateRoom, onStartRoom }: Props) {
  const [startTime, setStartTime] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!room || room.isActive) return;

    const checkStart = () => {
      const now = Date.now();
      const diff = room.startTime - now;

      if (diff <= 0) {
        onStartRoom();
        setCountdown(null);
      } else {
        setCountdown(Math.ceil(diff / 1000));
      }
    };

    checkStart();
    const interval = setInterval(checkStart, 1000);
    return () => clearInterval(interval);
  }, [room, onStartRoom]);

  const handleCreateRoom = () => {
    if (startTime) {
      const time = new Date(startTime).getTime();
      if (time > Date.now()) {
        onCreateRoom(time);
      }
    }
  };

  const handleStartNow = () => {
    onCreateRoom(Date.now());
    setTimeout(onStartRoom, 100);
  };

  if (room?.isActive) {
    return null;
  }

  if (room) {
    return (
      <div className="room-setup">
        <h3>ゲーム開始待機中</h3>
        <p>参加者: {participantCount}人</p>
        {countdown !== null && (
          <div className="countdown">
            開始まで: {countdown}秒
          </div>
        )}
        <p className="start-time">
          開始予定: {new Date(room.startTime).toLocaleString()}
        </p>
      </div>
    );
  }

  return (
    <div className="room-setup">
      <h3>ルーム設定</h3>
      <p>参加者: {participantCount}人</p>
      <div className="setup-options">
        <div className="option">
          <label>開始時刻を設定:</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <button onClick={handleCreateRoom} disabled={!startTime}>
            時間を設定
          </button>
        </div>
        <div className="option">
          <button onClick={handleStartNow} className="start-now">
            今すぐ開始
          </button>
        </div>
      </div>
    </div>
  );
}
