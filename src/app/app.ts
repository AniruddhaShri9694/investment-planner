import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [FormsModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  protected profileOpen = false;
  protected userName = this.loadUserName();

  protected toggleProfile(): void {
    this.profileOpen = !this.profileOpen;
  }
  protected saveUserName(): void {
    this.userName = this.userName.trim() || 'Your name';
    if (typeof localStorage !== 'undefined')
      localStorage.setItem('folio-user-name', this.userName);
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
    return typeof localStorage !== 'undefined'
      ? (localStorage.getItem('folio-user-name') ?? 'Your name')
      : 'Your name';
  }
}
