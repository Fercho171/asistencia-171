import { Injectable, computed, signal } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AttendanceFilters,
  AttendanceQueryResult,
  AttendanceRecord,
  AttendanceReport,
  AttendanceRow,
  AttendanceSettings,
  DailyAttendanceResponse,
  QrCheckInResponse,
  SampleQrCode,
  ScanOutcome,
  StudentAttendanceHistory,
} from '../interfaces/attendance.interface';
import { SchoolCatalog } from '../interfaces/student.interface';
import { AttendanceRepository } from './attendance.repository';
import {
  buildHistoryDays,
  catalogFromEntries,
  describeFilters,
  emptyFilters,
  formatTime,
  matchesPopulation,
  matchesTable,
  readStoredSettings,
  resolveStatus,
  storeSettings,
  summarize,
  toAttendanceRow,
  toReportQuery,
  todayIso,
} from './attendance-rules';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  readonly demoMode = environment.useMockApi;
  readonly settings = signal<AttendanceSettings>(readStoredSettings());
  readonly catalog = signal<SchoolCatalog>({ levels: [], grades: [], groups: [] });
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly lastUpdated = signal<Date | null>(null);
  readonly loadedDate = signal(todayIso());
  readonly sampleCodes = signal<SampleQrCode[]>([]);
  readonly now = signal(new Date());

  private readonly entries = signal<DailyAttendanceResponse['entries']>([]);
  private requestId = 0;

  readonly rows = computed(() =>
    this.entries().map((entry) => toAttendanceRow(entry, this.loadedDate(), this.settings(), this.now())),
  );

  constructor(private readonly repository: AttendanceRepository) {
    this.refreshSamples();
    setInterval(() => this.now.set(new Date()), 30_000);
  }

  loadDashboard(date: string, force = false): void {
    if (!force && date === this.loadedDate() && this.entries().length > 0 && !this.loading()) {
      return;
    }
    const requestId = ++this.requestId;
    this.loading.set(true);
    this.error.set(null);
    this.repository.getDaily(date).subscribe({
      next: (response) => {
        if (requestId !== this.requestId) {
          return;
        }
        this.applyDaily(response);
        this.loading.set(false);
      },
      error: () => {
        if (requestId !== this.requestId) {
          return;
        }
        this.loading.set(false);
        this.error.set('No fue posible consultar la asistencia de ese día.');
      },
    });
  }

  refreshDashboard(): void {
    this.loadDashboard(this.loadedDate(), true);
  }

  query(filters: AttendanceFilters): Observable<AttendanceQueryResult> {
    const source = filters.groupId
      ? this.repository.getByGroup(filters.groupId, filters.date)
      : filters.gradeId
        ? this.repository.getByGrade(filters.gradeId, filters.date)
        : this.repository.getDaily(filters.date);

    return source.pipe(
      map((response) => {
        this.rememberCatalog(response);
        const mapped = response.entries.map((entry) =>
          toAttendanceRow(entry, response.date, this.settings(), this.now()),
        );
        const population = mapped.filter((row) => matchesPopulation(row, filters));
        const rows = population.filter((row) => matchesTable(row, filters));
        return {
          rows,
          population,
          stats: summarize(population),
        };
      }),
    );
  }

  fetchReport(filters: AttendanceFilters): Observable<AttendanceReport> {
    return this.repository.getReport(toReportQuery(filters)).pipe(
      map((response) => {
        const filtersForRows: AttendanceFilters = { ...emptyFilters(response.date), ...filters, date: response.date };
        const rows = response.entries
          .map((entry) => toAttendanceRow(entry, response.date, this.settings(), this.now()))
          .filter((row) => matchesTable(row, filtersForRows));
        return {
          date: response.date,
          generatedAt: new Date().toISOString(),
          description: describeFilters(filtersForRows, this.catalog()),
          rows,
          stats: summarize(rows),
        };
      }),
    );
  }

  getStudentHistory(studentId: string): Observable<StudentAttendanceHistory> {
    return this.repository.getStudentHistory(studentId).pipe(
      map((response) => {
        const days = buildHistoryDays(response.records, this.settings(), this.now());
        const recordedDays = days.length;
        const attendedDays = days.filter((day) => day.status === 'PRESENTE' || day.status === 'RETARDO').length;
        return {
          student: response.student,
          days,
          attendedDays,
          recordedDays,
          attendanceRate: recordedDays === 0 ? 0 : Math.round((attendedDays / recordedDays) * 1000) / 10,
        };
      }),
    );
  }

  checkIn(qrCode: string): Observable<ScanOutcome> {
    const scannedAt = new Date().toISOString();
    return this.repository.checkIn({ qrCode: qrCode.trim(), scannedAt }).pipe(
      map((response) => this.toOutcome(response)),
      tap((outcome) => {
        if (outcome.result === 'REGISTERED') {
          this.patchRegistered(outcome);
          this.refreshSamples();
        }
      }),
    );
  }

  updateSettings(settings: AttendanceSettings): void {
    this.settings.set(settings);
    storeSettings(settings);
    this.now.set(new Date());
  }

  resetDemo(): Observable<void> {
    if (!this.demoMode) {
      return throwError(() => new Error('El reinicio solo está disponible con datos de demostración.'));
    }
    return this.repository.resetDemo().pipe(
      tap(() => {
        this.refreshSamples();
        this.loadDashboard(this.loadedDate(), true);
      }),
    );
  }

  private applyDaily(response: DailyAttendanceResponse): void {
    this.loadedDate.set(response.date);
    this.entries.set(response.entries);
    this.rememberCatalog(response);
    this.lastUpdated.set(new Date());
  }

  private rememberCatalog(response: DailyAttendanceResponse): void {
    if (response.catalog && response.catalog.levels.length > 0) {
      this.catalog.set(response.catalog);
      return;
    }
    if (this.catalog().levels.length === 0) {
      const derived = catalogFromEntries(response.entries);
      if (derived.levels.length > 0) {
        this.catalog.set(derived);
      }
    }
  }

  private patchRegistered(outcome: ScanOutcome): void {
    if (!outcome.student || !outcome.checkInTime || this.loadedDate() !== todayIso()) {
      return;
    }
    const record: AttendanceRecord = {
      id: `live-${outcome.student.id}-${this.loadedDate()}`,
      studentId: outcome.student.id,
      date: this.loadedDate(),
      checkInTime: outcome.checkInTime,
      method: 'QR',
    };
    this.entries.update((entries) => {
      const index = entries.findIndex((entry) => entry.student.id === outcome.student?.id);
      if (index < 0) {
        return entries;
      }
      const next = entries.slice();
      next[index] = { ...entries[index], record };
      return next;
    });
    this.lastUpdated.set(new Date());
    this.now.set(new Date());
  }

  private toOutcome(response: QrCheckInResponse): ScanOutcome {
    const student = response.student;
    const checkInTime = response.record?.checkInTime ?? null;
    const status = response.record
      ? resolveStatus(response.record, response.record.date, this.settings(), this.now())
      : null;
    const name = student?.fullName;
    let message = 'No fue posible registrar la asistencia.';
    switch (response.result) {
      case 'REGISTERED':
        message = name && checkInTime
          ? `Asistencia registrada para ${name} a las ${formatTime(checkInTime, true)}.`
          : 'Asistencia registrada.';
        break;
      case 'ALREADY_REGISTERED':
        message = name
          ? `${name} ya tiene una asistencia registrada hoy${checkInTime ? ` a las ${formatTime(checkInTime, true)}` : ''}.`
          : 'Este alumno ya tiene una asistencia registrada hoy.';
        break;
      case 'INVALID_QR':
        message = 'El código QR no es válido.';
        break;
      case 'NOT_ENROLLED':
        message = name
          ? `${name} no está inscrito o su registro está inactivo. No se registró la asistencia.`
          : 'El alumno no está inscrito. No se registró la asistencia.';
        break;
    }
    return {
      result: response.result,
      message,
      student,
      checkInTime,
      status,
    };
  }

  private refreshSamples(): void {
    this.repository.getSampleCodes().subscribe((codes) => this.sampleCodes.set(codes));
  }
}
