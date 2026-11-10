import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { QrScannerComponent } from '../../components/qr-scanner/qr-scanner.component';
import { AttendanceService } from '../../services/attendance.service';
import { summarize, todayIso } from '../../services/attendance-rules';

@Component({
  selector: 'app-attendance-scanner',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, MatButtonModule, MatIconModule, QrScannerComponent],
  templateUrl: './attendance-scanner.component.html',
  styleUrl: './attendance-scanner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceScannerComponent {
  private readonly attendance = inject(AttendanceService);

  readonly stats = computed(() => summarize(this.attendance.rows()));
  readonly lastUpdated = this.attendance.lastUpdated;

  constructor() {
    this.attendance.loadDashboard(todayIso(), true);
  }
}
