import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AuthService } from './auth.service';
import { PlannerStore } from './planner-store.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly plannerStore = inject(PlannerStore);
  protected readonly profileSaveStatus = signal<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  private readonly router = inject(Router);
  protected profileOpen = false;
  protected userName = this.loadUserName();

  constructor() {
    effect(() => {
      if (this.auth.authenticated()) {
        void this.loadPlanner();
        void this.loadDisplayName();
      }
    });
  }

  protected toggleProfile(): void {
    this.profileOpen = !this.profileOpen;
  }
  protected async saveUserName(): Promise<void> {
    this.userName = this.userName.trim() || 'Your name';
    if (typeof localStorage !== 'undefined')
      localStorage.setItem('folio-user-name', this.userName);
    if (this.auth.authenticated()) {
      this.profileSaveStatus.set('saving');
      try {
        await this.auth.saveDisplayName(this.userName);
        this.profileSaveStatus.set('saved');
      } catch (error) {
        this.profileSaveStatus.set('error');
        console.error('Unable to save display name to the account.', error);
      }
    }
  }
  protected async saveAndCloseProfile(): Promise<void> {
    await this.saveUserName();
    if (this.profileSaveStatus() !== 'error') this.profileOpen = false;
  }
  protected signOut(): void {
    this.plannerStore.stopBackendSync();
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
  protected initials(): string {
    return this.userName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  private loadUserName(): string {
    return typeof localStorage === 'undefined'
      ? 'Your name'
      : (localStorage.getItem('folio-user-name') ?? 'Your name');
  }
  private async loadPlanner(): Promise<void> {
    try {
      await this.plannerStore.loadFromBackend();
    } catch (error) {
      console.error(error);
    }
  }

  private async loadDisplayName(): Promise<void> {
    try {
      const displayName = await this.auth.loadDisplayName();
      if (displayName) {
        this.userName = displayName;
        if (typeof localStorage !== 'undefined')
          localStorage.setItem('folio-user-name', displayName);
      }
    } catch (error) {
      console.error('Unable to load account display name.', error);
    }
  }
}
