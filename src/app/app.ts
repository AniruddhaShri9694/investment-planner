import { Component, effect, inject } from '@angular/core';
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
  private readonly router = inject(Router);
  protected profileOpen = false;
  protected userName = this.loadUserName();

  constructor() {
    effect(() => {
      if (this.auth.authenticated()) void this.loadPlanner();
    });
  }

  protected toggleProfile(): void {
    this.profileOpen = !this.profileOpen;
  }
  protected saveUserName(): void {
    this.userName = this.userName.trim() || 'Your name';
    if (typeof localStorage !== 'undefined')
      localStorage.setItem('folio-user-name', this.userName);
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
}
