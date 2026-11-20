export interface AuthResponse {
  token: string;
  username: string;
}

export interface User {
  id: number;
  username: string;
  online: boolean;
  lastMessage: ChatMessage | null;
}

export interface PresenceEvent {
  username: string;
  online: boolean;
}

export interface ChatMessage {
  id: number;
  sender: string;
  recipient: string;
  content: string;
  sentAt: string; // ISO date string from the backend
}