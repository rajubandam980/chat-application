import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ChatService } from '../../core/chat.service';
import { ChatMessage, User } from '../../core/model';

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
  private sub?: Subscription;

  @ViewChild('messageList') messageList?: ElementRef<HTMLDivElement>;

  me = this.auth.username ?? '';
  users = signal<User[]>([]);
  selected = signal<string | null>(null);
  messages = signal<ChatMessage[]>([]);
  unread = signal<Record<string, number>>({});
  draft = '';

  ngOnInit(): void {
    this.chat.connect();
    this.loadUsers();
    this.sub = this.chat.messages$.subscribe((m) => this.onMessage(m));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
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
    if (!this.users().some((u) => u.username === other)) this.loadUsers();

    if (other === this.selected()) {
      this.messages.update((list) => [...list, m]);
      this.scrollToBottom();
    } else if (m.sender !== this.me) {
      this.unread.update((u) => ({ ...u, [other]: (u[other] ?? 0) + 1 }));
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.messageList?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}