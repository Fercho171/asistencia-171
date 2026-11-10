import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./core/layout/admin-shell/admin-shell.component').then((module) => module.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'asistencia' },
      {
        path: 'asistencia',
        loadChildren: () => import('./attendance/attendance.routes').then((module) => module.ATTENDANCE_ROUTES),
      },
      { path: '**', redirectTo: 'asistencia' },
    ],
  },
];
