import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import localeEsMx from '@angular/common/locales/es-MX';
import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideAttendance } from './attendance/attendance.providers';
import { routes } from './app.routes';
import { createSpanishPaginator } from './core/spanish-paginator';

registerLocaleData(localeEsMx);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    provideAttendance(),
    { provide: LOCALE_ID, useValue: 'es-MX' },
    { provide: MatPaginatorIntl, useFactory: createSpanishPaginator },
  ],
};
