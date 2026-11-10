import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AttendanceStatsSummary, AttendanceStatus } from '../../interfaces/attendance.interface';

@Component({
  selector: 'app-attendance-stats',
  standalone: true,
  imports: [DecimalPipe, MatIconModule],
  templateUrl: './attendance-stats.component.html',
  styleUrl: './attendance-stats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceStatsComponent {
  readonly stats = input.required<AttendanceStatsSummary>();
  readonly activeStatus = input<AttendanceStatus | ''>('');
  readonly statusSelected = output<AttendanceStatus | ''>();

  select(status: AttendanceStatus | ''): void {
    this.statusSelected.emit(status);
  }
}
