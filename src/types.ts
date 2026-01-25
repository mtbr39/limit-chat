export interface User {
  id: string;
  name: string;
  isEliminated: boolean;
  lastMessageAt: number;
  joinedAt: number;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
}

export interface Room {
  id: string;
  startTime: number;
  isActive: boolean;
  createdAt: number;
}
