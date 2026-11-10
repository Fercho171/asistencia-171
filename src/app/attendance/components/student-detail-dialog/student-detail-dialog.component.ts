import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { StudentAttendanceHistory } from '../../interfaces/attendance.interface';
import { AttendanceService } from '../../services/attendance.service';
import { STATUS_LABEL, formatLongDate, statusClass } from '../../services/attendance-rules';
import { StudentAttendanceCardComponent } from '../student-attendance-card/student-attendance-card.component';

export interface StudentDetailData {
  studentId: string;
  focusDate: string;
}

@Component({
  selector: 'app-student-detail-dialog',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    RouterLink,
    StudentAttendanceCardComponent,
  ],
  templateUrl: './student-detail-dialog.component.html',
  styleUrl: './student-detail-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDetailDialogComponent {
  readonly data = inject<StudentDetailData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<StudentDetailDialogComponent>);
  private readonly attendance = inject(AttendanceService);

  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  readonly history = signal<StudentAttendanceHistory | null>(null);
  readonly qrUrl = signal<string | null>(null);
  readonly statusLabel = STATUS_LABEL;
  readonly statusClass = statusClass;
  readonly formatLongDate = formatLongDate;

  constructor() {
    this.attendance.getStudentHistory(this.data.studentId).pipe(takeUntilDestroyed()).subscribe({
      next: (history) => {
        this.history.set(history);
        this.state.set('ready');
        void this.buildQr(history.student.qrCode);
      },
      error: () => this.state.set('error'),
    });
  }

  todayRow() {
    return this.history()?.days.find((day) => day.date === this.data.focusDate) ?? null;
  }

  close(): void {
    this.dialogRef.close();
  }

  private async buildQr(value: string): Promise<void> {
    const qrcode = await import('qrcode');
    const url = await qrcode.toDataURL(value, {
      margin: 1,
      width: 168,
      color: { dark: '#143d5c', light: '#ffffff' },
    });
    this.qrUrl.set(url);
  }
}
