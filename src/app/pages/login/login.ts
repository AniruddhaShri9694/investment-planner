import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected email = '';
  protected password = '';
  protected busy = false;
  protected error = '';

  protected async submit(): Promise<void> {
    this.busy = true;
    this.error = '';
    try {
      await this.auth.authenticate('login', this.email, this.password);
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.error = this.errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string; detail?: string } | null;
      return body?.message ?? body?.detail ?? `Sign in failed (${error.status || 'network error'}).`;
    }
    return 'Unable to connect to the planner backend.';
  }
}