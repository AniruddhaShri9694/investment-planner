import { HttpClient } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-config';

interface AuthResponse {
  accessToken: string;
  expiresAtUtc: string;
  email: string;
}

interface StoredSession extends AuthResponse {}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'folio-api-session';
  private readonly storedSession = this.readSession();
  readonly token = signal(this.storedSession?.accessToken ?? null);
  readonly email = signal(this.storedSession?.email ?? null);
  readonly authenticated = computed(() => this.token() !== null);

  constructor(private readonly http: HttpClient) {}

  async authenticate(
    mode: 'login' | 'register',
    email: string,
    password: string,
  ): Promise<void> {
    const session = await firstValueFrom(
      this.http.post<AuthResponse>(`${API_BASE_URL}/auth/${mode}`, {
        email,
        password,
      }),
    );

    this.token.set(session.accessToken);
    this.email.set(session.email);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(this.storageKey, JSON.stringify(session));
    }
  }

  logout(): void {
    this.token.set(null);
    this.email.set(null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(this.storageKey);
    }
  }

  private readSession(): StoredSession | undefined {
    if (typeof sessionStorage === 'undefined') return undefined;
    try {
      const saved = sessionStorage.getItem(this.storageKey);
      if (!saved) return undefined;
      const session = JSON.parse(saved) as StoredSession;
      if (
        !session.accessToken ||
        !session.email ||
        new Date(session.expiresAtUtc).getTime() <= Date.now()
      ) {
        sessionStorage.removeItem(this.storageKey);
        return undefined;
      }
      return session;
    } catch {
      sessionStorage.removeItem(this.storageKey);
      return undefined;
    }
  }
}