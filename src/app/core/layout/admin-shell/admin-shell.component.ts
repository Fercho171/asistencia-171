import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs/operators';
import { SCHOOL_AREA, SCHOOL_NAME } from '../../school';
import { AttendanceService } from '../../../attendance/services/attendance.service';

interface NavLink {
  path: string;
  label: string;
  icon: string;
  exact: boolean;
}

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatIconModule, MatButtonModule],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShellComponent {
  private readonly breakpoints = inject(BreakpointObserver);
  readonly attendance = inject(AttendanceService);
  readonly schoolName = SCHOOL_NAME;
  readonly schoolArea = SCHOOL_AREA;
  private readonly menuOpen = signal(false);

  readonly links: NavLink[] = [
    { path: '/asistencia', label: 'Control de asistencia', icon: 'fact_check', exact: true },
    { path: '/asistencia/escaner', label: 'Escanear QR', icon: 'qr_code_scanner', exact: true },
    { path: '/asistencia/historial', label: 'Historial', icon: 'history', exact: false },
  ];

  readonly mobile = toSignal(
    this.breakpoints.observe('(max-width: 960px)').pipe(map((result) => result.matches)),
    { initialValue: typeof matchMedia !== 'undefined' && matchMedia('(max-width: 960px)').matches },
  );

  readonly sidenavOpened = computed(() => (this.mobile() ? this.menuOpen() : true));

  openMenu(): void {
    this.menuOpen.set(true);
  }

  closeIfMobile(): void {
    if (this.mobile()) {
      this.menuOpen.set(false);
    }
  }
}
