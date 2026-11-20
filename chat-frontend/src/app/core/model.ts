export interface AuthResponse {
  token: string;
  username: string;
}

export interface User {
  id: number;
  username: string;
  online: boolean;
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

export interface ChatMessage {
  id: number;
  sender: string;
  recipient: string;
  content: string;
  sentAt: string; // ISO date string from the backend
  readAt: string | null; // null = not read yet
}

export interface PresenceEvent {
  username: string;
  online: boolean;
}

export interface TypingEvent {
  from: string;
  typing: boolean;
}

export interface ReadEvent {
  reader: string;
  readAt: string;
}