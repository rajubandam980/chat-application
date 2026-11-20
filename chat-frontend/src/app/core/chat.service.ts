import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client, IMessage } from '@stomp/stompjs';
import { Observable, Subject } from 'rxjs';
import { API_URL, WS_URL } from './config';
import { AuthService } from './auth.service';
import { ChatMessage, User } from './model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private client?: Client;

  /** Every message I send or receive arrives here in real time */
  readonly messages$ = new Subject<ChatMessage>();
  /** true while the WebSocket connection is open */
  readonly connected = signal(false);

  connect(): void {
    if (this.client?.active) return;

    this.client = new Client({
      brokerURL: WS_URL,
      connectHeaders: { Authorization: `Bearer ${this.auth.token}` },
      reconnectDelay: 5000, // try again every 5 s if the connection drops
      onConnect: () => {
        this.connected.set(true);
        // Private queue: the server delivers only my messages here
        this.client!.subscribe('/user/queue/messages', (frame: IMessage) => {
          this.messages$.next(JSON.parse(frame.body) as ChatMessage);
        });
      },
      onWebSocketClose: () => this.connected.set(false),
      onStompError: (frame) => console.error('STOMP error:', frame.headers['message']),
    });

    this.client.activate();
  }

  disconnect(): void {
    this.client?.deactivate();
    this.connected.set(false);
  }

  send(recipient: string, content: string): void {
    if (!this.client?.connected) return;
    this.client.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({ recipient, content }),
    });
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${API_URL}/users`);
  }

  getHistory(otherUser: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${API_URL}/messages/${encodeURIComponent(otherUser)}`);
  }
}