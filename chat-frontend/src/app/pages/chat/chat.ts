import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ChatService } from '../../core/chat.service';
import { ChatMessage, PresenceEvent, User } from '../../core/model';

@Component({
  selector: 'app-chat',
  imports: [FormsModule, DatePipe],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  protected chat = inject(ChatService);
  private router = inject(Router);
  private subs = new Subscription();

  @ViewChild('messageList') messageList?: ElementRef<HTMLDivElement>;

  me = this.auth.username ?? '';
  users = signal<User[]>([]);
  selected = signal<string | null>(null);
  messages = signal<ChatMessage[]>([]);
  unread = signal<Record<string, number>>({});
  draft = '';

  /** Is the person I'm chatting with online? */
  selectedOnline = computed(
    () => this.users().find((u) => u.username === this.selected())?.online ?? false
  );

  /** Most recent conversations first, then everyone else A–Z */
  sortedUsers = computed(() =>
    [...this.users()].sort((a, b) => {
      const ta = a.lastMessage?.sentAt ?? '';
      const tb = b.lastMessage?.sentAt ?? '';
      if (ta !== tb) return tb.localeCompare(ta); // ISO dates sort as text
      return a.username.localeCompare(b.username);
    })
  );

  constructor() {
    // Every time the WebSocket (re)connects, reload the list so online dots are current
    effect(() => {
      if (this.chat.connected()) this.loadUsers();
    });

    // Show the unread count in the browser tab, e.g. "(2) Chat"
    effect(() => {
      const total = Object.values(this.unread()).reduce((sum, n) => sum + n, 0);
      document.title = total > 0 ? `(${total}) Chat` : 'Chat';
    });
  }

  ngOnInit(): void {
    this.chat.connect();
    this.loadUsers();
    this.subs.add(this.chat.messages$.subscribe((m) => this.onMessage(m)));
    this.subs.add(this.chat.presence$.subscribe((p) => this.onPresence(p)));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    document.title = 'Chat';
  }

  loadUsers(): void {
    this.chat.getUsers().subscribe((list) => this.users.set(list));
  }

  selectUser(username: string): void {
    this.selected.set(username);
    this.unread.update((u) => ({ ...u, [username]: 0 }));
    this.messages.set([]);
    this.chat.getHistory(username).subscribe((history) => {
      this.messages.set(history);
      this.scrollToBottom();
    });
  }

  send(): void {
    const text = this.draft.trim();
    const to = this.selected();
    if (!text || !to) return;
    this.chat.send(to, text);
    this.draft = '';
  }

  logout(): void {
    this.chat.disconnect();
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private onMessage(m: ChatMessage): void {
    const other = m.sender === this.me ? m.recipient : m.sender;

    // Someone new wrote to me -> refresh the user list
        // Someone new wrote to me -> refresh the user list
    if (!this.users().some((u) => u.username === other)) {
      this.loadUsers();
    } else {
      // Update the preview line; sortedUsers moves this chat to the top
      this.users.update((list) =>
        list.map((u) => (u.username === other ? { ...u, lastMessage: m } : u))
      );
    }

    if (other === this.selected()) {
      this.messages.update((list) => [...list, m]);
      this.scrollToBottom();
    } else if (m.sender !== this.me) {
      this.unread.update((u) => ({ ...u, [other]: (u[other] ?? 0) + 1 }));
    }
  }

  private onPresence(p: PresenceEvent): void {
    if (p.username === this.me) return;
    if (!this.users().some((u) => u.username === p.username)) {
      this.loadUsers(); // a brand-new user just signed up
      return;
    }
    this.users.update((list) =>
      list.map((u) => (u.username === p.username ? { ...u, online: p.online } : u))
    );
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.messageList?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  
}