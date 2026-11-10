import { Routes } from '@angular/router';

export const ATTENDANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/attendance-dashboard/attendance-dashboard.component').then(
        (module) => module.AttendanceDashboardComponent,
      ),
    title: 'Control de asistencia',
  },
  {
    path: 'escaner',
    loadComponent: () =>
      import('./pages/attendance-scanner/attendance-scanner.component').then(
        (module) => module.AttendanceScannerComponent,
      ),
    title: 'Escanear código QR',
  },
  {
    path: 'historial/:studentId',
    loadComponent: () =>
      import('./pages/student-history/student-history.component').then(
        (module) => module.StudentHistoryComponent,
      ),
    title: 'Historial del alumno',
  },
  {
    path: 'historial',
    loadComponent: () =>
      import('./pages/attendance-history/attendance-history.component').then(
        (module) => module.AttendanceHistoryComponent,
      ),
    title: 'Historial de asistencia',
  },
];
