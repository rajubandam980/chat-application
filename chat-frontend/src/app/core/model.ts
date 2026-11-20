export interface AuthResponse {
  token: string;
  username: string;
}

export interface User {
  id: number;
  username: string;
}

export interface ChatMessage {
  id: number;
  sender: string;
  recipient: string;
  content: string;
  sentAt: string; // ISO date string from the backend
}