import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then((module) => module.Dashboard),
  },
  {
    path: 'yearly-plan',
    loadComponent: () =>
      import('./pages/yearly-plan/yearly-plan').then(
        (module) => module.YearlyPlan,
      ),
  },
  {
    path: 'month/:month',
    loadComponent: () =>
      import('./pages/month-plan/month-plan').then(
        (module) => module.MonthPlan,
      ),
  },
  { path: '**', redirectTo: 'dashboard' },
];
