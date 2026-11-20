import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client, IMessage } from '@stomp/stompjs';
import { Observable, Subject } from 'rxjs';
import { API_URL, WS_URL } from './config';
import { AuthService } from './auth.service';
import { ChatMessage, PresenceEvent, ReadEvent, TypingEvent, User } from './model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private client?: Client;

  /** Every message I send or receive arrives here in real time */
  readonly messages$ = new Subject<ChatMessage>();
  /** Someone came online or went offline */
  readonly presence$ = new Subject<PresenceEvent>();
  /** Someone started or stopped typing to me */
  readonly typing$ = new Subject<TypingEvent>();
  /** Someone read the messages I sent them */
  readonly read$ = new Subject<ReadEvent>();
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

        // Public topic: everyone's online/offline changes
        this.client!.subscribe('/topic/presence', (frame: IMessage) => {
          this.presence$.next(JSON.parse(frame.body) as PresenceEvent);
        });

        // Private queue: "someone is typing to me" signals
        this.client!.subscribe('/user/queue/typing', (frame: IMessage) => {
          this.typing$.next(JSON.parse(frame.body) as TypingEvent);
        });

        // Private queue: "bob read your messages" receipts
        this.client!.subscribe('/user/queue/read', (frame: IMessage) => {
          this.read$.next(JSON.parse(frame.body) as ReadEvent);
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

  sendTyping(recipient: string, typing: boolean): void {
    if (!this.client?.connected) return;
    this.client.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify({ recipient, typing }),
    });
  }

  /** Tell the server I've read everything that `from` sent me */
  markRead(from: string): void {
    if (!this.client?.connected) return;
    this.client.publish({
      destination: '/app/chat.read',
      body: JSON.stringify({ from }),
    });
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${API_URL}/users`);
  }

  getHistory(otherUser: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${API_URL}/messages/${encodeURIComponent(otherUser)}`);
  }
}