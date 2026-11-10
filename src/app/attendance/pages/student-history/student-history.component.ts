import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { StudentAttendanceCardComponent } from '../../components/student-attendance-card/student-attendance-card.component';
import { StudentAttendanceHistory, StudentHistoryDay } from '../../interfaces/attendance.interface';
import { AttendanceService } from '../../services/attendance.service';
import { STATUS_LABEL, formatLongDate, statusClass } from '../../services/attendance-rules';

type HistoryState =
  | { status: 'loading'; history: null }
  | { status: 'ready'; history: StudentAttendanceHistory }
  | { status: 'error'; history: null };

@Component({
  selector: 'app-student-history',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    StudentAttendanceCardComponent,
  ],
  templateUrl: './student-history.component.html',
  styleUrl: './student-history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentHistoryComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly attendance = inject(AttendanceService);

  readonly state = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('studentId') ?? ''),
      switchMap((studentId) => {
        if (!studentId) {
          return of<HistoryState>({ status: 'error', history: null });
        }
        return this.attendance.getStudentHistory(studentId).pipe(
          map((history): HistoryState => ({ status: 'ready', history })),
          catchError(() => of<HistoryState>({ status: 'error', history: null })),
        );
      }),
    ),
    { initialValue: { status: 'loading', history: null } as HistoryState },
  );

  readonly qrUrl = signal<string | null>(null);
  readonly statusLabel = STATUS_LABEL;
  readonly statusClass = statusClass;
  readonly formatLongDate = formatLongDate;

  latestDay(record: StudentAttendanceHistory): StudentHistoryDay | null {
    return record.days[0] ?? null;
  }

  constructor() {
    effect(() => {
      const code = this.state().history?.student.qrCode;
      if (!code) {
        this.qrUrl.set(null);
        return;
      }
      void this.buildQr(code);
    }, { allowSignalWrites: true });
  }

  private async buildQr(value: string): Promise<void> {
    const qrcode = await import('qrcode');
    const url = await qrcode.toDataURL(value, {
      margin: 1,
      width: 180,
      color: { dark: '#143d5c', light: '#ffffff' },
    });
    this.qrUrl.set(url);
  }
}
