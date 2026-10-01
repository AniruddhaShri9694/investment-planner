import { HttpClient } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-config';

interface AuthResponse {
  accessToken: string;
  expiresAtUtc: string;
  email: string;
  displayName?: string;
}

interface StoredSession extends AuthResponse {}

interface UserProfile {
  displayName: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'folio-api-session';
  private readonly storedSession = this.readSession();
  readonly token = signal(this.storedSession?.accessToken ?? null);
  readonly email = signal(this.storedSession?.email ?? null);
  readonly displayName = signal(this.storedSession?.displayName ?? null);
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
    this.displayName.set(session.displayName || null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(this.storageKey, JSON.stringify(session));
    }
  }

  async loadDisplayName(): Promise<string | null> {
    const profile = await firstValueFrom(
      this.http.get<UserProfile>(`${API_BASE_URL}/auth/profile`, {
        headers: this.authHeaders(),
      }),
    );
    this.displayName.set(profile.displayName || null);
    this.persistDisplayName(profile.displayName);
    return profile.displayName || null;
  }

  async saveDisplayName(displayName: string): Promise<void> {
    const profile = await firstValueFrom(
      this.http.put<UserProfile>(
        `${API_BASE_URL}/auth/profile`,
        { displayName },
        { headers: this.authHeaders() },
      ),
    );
    this.displayName.set(profile.displayName);
    this.persistDisplayName(profile.displayName);
  }

  logout(): void {
    this.token.set(null);
    this.email.set(null);
    this.displayName.set(null);
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

  private authHeaders(): { Authorization: string } {
    return { Authorization: `Bearer ${this.token() ?? ''}` };
  }

  private persistDisplayName(displayName: string): void {
    if (typeof sessionStorage === 'undefined') return;
    const current = this.readSession();
    if (!current) return;
    sessionStorage.setItem(
      this.storageKey,
      JSON.stringify({ ...current, displayName }),
    );
  }
}