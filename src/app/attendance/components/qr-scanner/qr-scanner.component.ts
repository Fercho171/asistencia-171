import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ScanOutcome } from '../../interfaces/attendance.interface';
import { AttendanceService } from '../../services/attendance.service';
import { lateDeadline, statusFromCheckIn } from '../../services/attendance-rules';
import { QrScannerError, QrScannerService } from '../../services/qr-scanner.service';
import { StudentAttendanceCardComponent } from '../student-attendance-card/student-attendance-card.component';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    StudentAttendanceCardComponent,
  ],
  templateUrl: './qr-scanner.component.html',
  styleUrl: './qr-scanner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrScannerComponent implements OnDestroy {
  readonly embedded = input(false);
  readonly closed = output<void>();
  readonly registered = output<ScanOutcome>();

  private readonly attendance = inject(AttendanceService);
  private readonly scanner = inject(QrScannerService);
  private readonly formBuilder = inject(FormBuilder);
  private alive = true;
  private processing = false;
  private pendingCode: string | null = null;
  private lastCode = '';
  private lastAt = 0;

  readonly externalForm = this.formBuilder.nonNullable.group({ code: '' });
  readonly cameraOn = signal(false);
  readonly starting = signal(false);
  readonly cameraError = signal<string | null>(null);
  readonly requestError = signal<string | null>(null);
  readonly outcome = signal<ScanOutcome | null>(null);
  readonly recent = signal<ScanOutcome[]>([]);
  readonly samples = this.attendance.sampleCodes;

  readonly scheduleLabel = computed(() => {
    const settings = this.attendance.settings();
    return `Entrada ${settings.entryTime} · tolerancia ${settings.lateToleranceMinutes} min · presente hasta ${lateDeadline(settings)} · cierre ${settings.attendanceCloseTime}`;
  });

  readonly arrivalHint = computed(() => {
    const status = statusFromCheckIn(this.attendance.now(), this.attendance.settings());
    return status === 'PRESENTE'
      ? 'Un registro nuevo en este momento se marcará como presente.'
      : 'Un registro nuevo en este momento se marcará como retardo: ya pasó la hora límite.';
  });

  readonly tone = computed(() => {
    switch (this.outcome()?.result) {
      case 'REGISTERED':
        return 'success' as const;
      case 'ALREADY_REGISTERED':
        return 'warning' as const;
      case 'INVALID_QR':
      case 'NOT_ENROLLED':
        return 'error' as const;
      default:
        return 'neutral' as const;
    }
  });

  ngOnDestroy(): void {
    this.alive = false;
    void this.scanner.stop();
  }

  async startCamera(): Promise<void> {
    this.starting.set(true);
    this.cameraError.set(null);
    try {
      await this.scanner.start('qr-reader', (code) => this.process(code));
      if (!this.alive) {
        await this.scanner.stop();
        return;
      }
      this.cameraOn.set(true);
    } catch (error) {
      this.cameraOn.set(false);
      const message = error instanceof QrScannerError
        ? error.message
        : 'No fue posible activar la cámara.';
      this.cameraError.set(`${message} Puede registrar la entrada con un lector QR externo.`);
    } finally {
      this.starting.set(false);
    }
  }

  async stopCamera(): Promise<void> {
    await this.scanner.stop();
    this.cameraOn.set(false);
  }

  submitExternal(): void {
    const code = this.externalForm.controls.code.value.trim();
    if (!code) {
      return;
    }
    this.process(code);
    this.externalForm.controls.code.setValue('');
  }

  process(code: string): void {
    const normalized = code.trim();
    if (!normalized) {
      return;
    }
    const nowMs = Date.now();
    if (normalized === this.lastCode && nowMs - this.lastAt < 3000) {
      return;
    }
    if (this.processing) {
      this.pendingCode = normalized;
      return;
    }
    this.lastCode = normalized;
    this.lastAt = nowMs;
    this.processing = true;
    this.requestError.set(null);
    this.attendance.checkIn(normalized).subscribe({
      next: (result) => this.show(result),
      error: () => {
        this.lastCode = '';
        this.requestError.set('No fue posible registrar la asistencia. Intente de nuevo.');
      },
      complete: () => {
        this.processing = false;
        const next = this.pendingCode;
        this.pendingCode = null;
        if (next && next !== normalized) {
          this.process(next);
        }
      },
    });
  }

  private show(result: ScanOutcome): void {
    this.outcome.set(result);
    if (result.student) {
      this.recent.update((items) => [result, ...items.filter((item) => item.student?.id !== result.student?.id)].slice(0, 5));
    }
    this.registered.emit(result);
  }
}
