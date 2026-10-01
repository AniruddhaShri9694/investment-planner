import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthService } from './auth.service';

const requireAuthentication: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.authenticated() ? true : router.createUrlTree(['/login']);
};

const redirectAuthenticatedUser: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.authenticated() ? router.createUrlTree(['/dashboard']) : true;
};

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    canActivate: [redirectAuthenticatedUser],
    loadComponent: () =>
      import('./pages/login/login').then((module) => module.LoginPage),
  },
  {
    path: 'register',
    canActivate: [redirectAuthenticatedUser],
    loadComponent: () =>
      import('./pages/register/register').then((module) => module.RegisterPage),
  },
  {
    path: 'dashboard',
    canActivate: [requireAuthentication],
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then((module) => module.Dashboard),
  },
  {
    path: 'yearly-plan',
    canActivate: [requireAuthentication],
    loadComponent: () =>
      import('./pages/yearly-plan/yearly-plan').then(
        (module) => module.YearlyPlan,
      ),
  },
  {
    path: 'month/:month',
    canActivate: [requireAuthentication],
    loadComponent: () =>
      import('./pages/month-plan/month-plan').then(
        (module) => module.MonthPlan,
      ),
  },
  { path: '**', redirectTo: 'dashboard' },
];
