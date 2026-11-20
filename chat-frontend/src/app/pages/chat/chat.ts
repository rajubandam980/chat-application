import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ChatService } from '../../core/chat.service';
import { ChatMessage, PresenceEvent, ReadEvent, TypingEvent, User } from '../../core/model';

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

  /** Who is typing to me right now: { bob: true } */
  typing = signal<Record<string, boolean>>({});
  private typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // My own typing state (what I last told the other person)
  private amTypingTo: string | null = null;
  private lastTypingSent = 0;
  private stopTypingTimer?: ReturnType<typeof setTimeout>;

  /** Is the person I'm chatting with typing? */
  selectedTyping = computed(() => this.typing()[this.selected() ?? ''] ?? false);

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
    this.subs.add(this.chat.typing$.subscribe((t) => this.onTyping(t)));
    this.subs.add(this.chat.read$.subscribe((r) => this.onRead(r)));
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.stopTyping();
    this.typingTimers.forEach((t) => clearTimeout(t));
    this.subs.unsubscribe();
    document.title = 'Chat';
  }

  loadUsers(): void {
    this.chat.getUsers().subscribe((list) => {
      this.users.set(list);
      // Unread counts now come from the database, so they survive a refresh
      const counts: Record<string, number> = {};
      for (const u of list) counts[u.username] = u.unreadCount;
      this.unread.set(counts);
      // The open chat counts as read while I'm looking at it
      const open = this.selected();
      if (open && counts[open] && this.isVisible()) this.markRead(open);
    });
  }

  selectUser(username: string): void {
    this.stopTyping(); // tell the previous person I stopped
    this.draft = '';
    this.selected.set(username);
    this.messages.set([]);
    this.chat.getHistory(username).subscribe((history) => {
      this.messages.set(history);
      this.scrollToBottom();
      if (this.isVisible()) this.markRead(username);
    });
  }

  send(): void {
    const text = this.draft.trim();
    const to = this.selected();
    if (!text || !to) return;
    this.stopTyping();
    this.chat.send(to, text);
    this.draft = '';
  }

  logout(): void {
    this.stopTyping();
    this.chat.disconnect();
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  /** Called on every keystroke in the message box */
  onDraftChange(value: string): void {
    const to = this.selected();
    if (!to) return;
    if (!value.trim()) {
      this.stopTyping(); // box cleared -> not typing any more
      return;
    }

    // Send "typing" when I start, and again every 3 s while I keep typing
    const now = Date.now();
    if (this.amTypingTo !== to || now - this.lastTypingSent > 3000) {
      this.chat.sendTyping(to, true);
      this.amTypingTo = to;
      this.lastTypingSent = now;
    }

    // 2 s without a keystroke -> "stopped typing"
    clearTimeout(this.stopTypingTimer);
    this.stopTypingTimer = setTimeout(() => this.stopTyping(), 2000);
  }

  private stopTyping(): void {
    clearTimeout(this.stopTypingTimer);
    if (this.amTypingTo) {
      this.chat.sendTyping(this.amTypingTo, false);
      this.amTypingTo = null;
    }
  }

  private onTyping(e: TypingEvent): void {
    clearTimeout(this.typingTimers.get(e.from));
    this.typingTimers.delete(e.from);
    this.typing.update((t) => ({ ...t, [e.from]: e.typing }));

    // Safety net: if no new signal arrives within 5 s, hide "typing…"
    if (e.typing) {
      this.typingTimers.set(
        e.from,
        setTimeout(() => this.onTyping({ from: e.from, typing: false }), 5000)
      );
    }
  }

  private onMessage(m: ChatMessage): void {
    const other = m.sender === this.me ? m.recipient : m.sender;

    // Their message arrived, so they're no longer typing
    if (m.sender !== this.me) this.onTyping({ from: m.sender, typing: false });

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
    }

    if (m.sender !== this.me) {
      if (other === this.selected() && this.isVisible()) {
        this.markRead(other); // I'm looking at this chat right now
      } else {
        this.unread.update((u) => ({ ...u, [other]: (u[other] ?? 0) + 1 }));
      }
    }
  }

  /** Mark everything from `username` as read: on the server and locally */
  private markRead(username: string): void {
    this.chat.markRead(username);
    this.unread.update((u) => ({ ...u, [username]: 0 }));
  }

  /** Bob read my messages -> turn my ✓ into ✓✓ */
  private onRead(e: ReadEvent): void {
    const seen = (m: ChatMessage) =>
      m.sender === this.me && m.recipient === e.reader && !m.readAt ? { ...m, readAt: e.readAt } : m;
    this.messages.update((list) => list.map(seen));
    this.users.update((list) =>
      list.map((u) =>
        u.username === e.reader && u.lastMessage ? { ...u, lastMessage: seen(u.lastMessage) } : u
      )
    );
  }

  private isVisible(): boolean {
    return document.visibilityState === 'visible';
  }

  /** Coming back to the tab -> the open chat is now read */
  private onVisibilityChange = (): void => {
    const open = this.selected();
    if (open && this.isVisible() && this.unread()[open]) this.markRead(open);
  };

  private onPresence(p: PresenceEvent): void {
    if (p.username === this.me) return;
    if (!p.online) this.onTyping({ from: p.username, typing: false });
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