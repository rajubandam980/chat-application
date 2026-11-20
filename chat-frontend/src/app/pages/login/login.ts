import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  isRegister = signal(false);
  error = signal('');
  loading = signal(false);

  toggleMode(): void {
    this.isRegister.update((v) => !v);
    this.error.set('');
  }

  submit(): void {
    this.error.set('');
    this.loading.set(true);

    const request = this.isRegister()
      ? this.auth.register(this.username, this.password)
      : this.auth.login(this.username, this.password);

    request.subscribe({
      next: () => this.router.navigate(['/chat']),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 0) this.error.set('Cannot reach the server. Is the backend running?');
        else if (err.status === 409) this.error.set('That username is already taken.');
        else if (err.status === 400) this.error.set('Username: 3–50 characters. Password: at least 6.');
        else this.error.set('Wrong username or password.');
      },
    });
  }
}