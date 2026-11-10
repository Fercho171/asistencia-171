import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  AttendanceRecord,
  AttendanceReportQuery,
  DailyAttendanceEntry,
  DailyAttendanceResponse,
  QrCheckInRequest,
  QrCheckInResponse,
  SampleQrCode,
  StudentHistoryResponse,
} from '../interfaces/attendance.interface';
import { SchoolCatalog, Student } from '../interfaces/student.interface';
import { AttendanceRepository } from './attendance.repository';
import { studentMatchesQuery, todayIso } from './attendance-rules';
import { buildCatalog, buildRecords, buildStudents } from './school-seed';

const SESSION_KEY = 'asistencia-qr-session-checkins-v2';

/**
 * Fuente de datos de demostración.
 * No la usa ningún componente: la pantalla habla solo con AttendanceService.
 */
@Injectable()
export class AttendanceMockRepository extends AttendanceRepository {
  private readonly catalog: SchoolCatalog;
  private readonly students: Student[];
  private records: AttendanceRecord[];
  private extras: AttendanceRecord[];

  constructor() {
    super();
    const today = todayIso();
    this.catalog = buildCatalog();
    this.students = buildStudents(this.catalog, today);
    this.records = buildRecords(this.students, today);
    this.extras = readSessionRecords();
    this.applyExtras(this.extras);
  }

  getDaily(date: string): Observable<DailyAttendanceResponse> {
    return of(this.response(date, this.entriesFor(date))).pipe(delay(180));
  }

  getByGrade(gradeId: string, date: string): Observable<DailyAttendanceResponse> {
    return of(this.response(date, this.entriesFor(date, (student) => student.gradeId === gradeId))).pipe(delay(180));
  }

  getByGroup(groupId: string, date: string): Observable<DailyAttendanceResponse> {
    return of(this.response(date, this.entriesFor(date, (student) => student.groupId === groupId))).pipe(delay(180));
  }

  checkIn(request: QrCheckInRequest): Observable<QrCheckInResponse> {
    const code = request.qrCode.trim();
    const student = this.students.find((item) =>
      item.qrCode === code || item.enrollment === code || item.id === code,
    );
    if (!student) {
      return of<QrCheckInResponse>({ result: 'INVALID_QR', student: null, record: null }).pipe(delay(120));
    }
    if (!student.active) {
      return of<QrCheckInResponse>({ result: 'NOT_ENROLLED', student, record: null }).pipe(delay(120));
    }

    const scannedAt = new Date(request.scannedAt);
    const date = Number.isNaN(scannedAt.getTime()) ? todayIso() : todayIso(scannedAt);
    const existing = this.records.find((record) => record.studentId === student.id && record.date === date);
    if (existing) {
      return of<QrCheckInResponse>({ result: 'ALREADY_REGISTERED', student, record: existing }).pipe(delay(120));
    }

    const record: AttendanceRecord = {
      id: `live-${student.id}-${date}`,
      studentId: student.id,
      date,
      checkInTime: request.scannedAt,
      method: 'QR',
    };
    this.records.push(record);
    this.persistExtra(record);
    return of<QrCheckInResponse>({ result: 'REGISTERED', student, record }).pipe(delay(120));
  }

  getStudentHistory(studentId: string): Observable<StudentHistoryResponse> {
    const student = this.students.find((item) => item.id === studentId);
    if (!student) {
      return throwError(() => new Error('NOT_FOUND'));
    }
    const records = this.records.filter((record) => record.studentId === studentId);
    return of({ student, records }).pipe(delay(150));
  }

  getReport(query: AttendanceReportQuery): Observable<DailyAttendanceResponse> {
    const entries = this.entriesFor(query.date, (student) => {
      if (query.levelId && student.levelId !== query.levelId) {
        return false;
      }
      if (query.gradeId && student.gradeId !== query.gradeId) {
        return false;
      }
      if (query.groupId && student.groupId !== query.groupId) {
        return false;
      }
      return studentMatchesQuery(student, query.studentName ?? '');
    });
    return of(this.response(query.date, entries)).pipe(delay(160));
  }

  getSampleCodes(): Observable<SampleQrCode[]> {
    return of(this.buildSamples(todayIso()));
  }

  resetDemo(): Observable<void> {
    clearSessionRecords();
    this.extras = [];
    this.records = buildRecords(this.students, todayIso());
    return of(undefined).pipe(delay(80));
  }

  private response(date: string, entries: DailyAttendanceEntry[]): DailyAttendanceResponse {
    return {
      date,
      catalog: this.catalog,
      entries,
    };
  }

  private entriesFor(date: string, predicate: (student: Student) => boolean = () => true): DailyAttendanceEntry[] {
    return this.students
      .filter((student) => student.active && predicate(student))
      .map((student) => ({
        student,
        record: this.records.find((record) => record.studentId === student.id && record.date === date) ?? null,
      }));
  }

  private buildSamples(today: string): SampleQrCode[] {
    const active = this.students.filter((student) => student.active);
    const withoutRecord = active
      .filter((student) => !this.records.some((record) => record.studentId === student.id && record.date === today))
      .slice(0, 3);
    const withRecord = active.find((student) =>
      this.records.some((record) => record.studentId === student.id && record.date === today),
    );
    const inactive = this.students.find((student) => !student.active);
    const samples: SampleQrCode[] = withoutRecord.map((student) => ({
      code: student.qrCode,
      label: `${student.fullName} · sin entrada hoy`,
      kind: 'valid',
    }));
    if (withRecord) {
      samples.push({
        code: withRecord.qrCode,
        label: `${withRecord.fullName} · ya registró hoy`,
        kind: 'valid',
      });
    }
    if (inactive) {
      samples.push({
        code: inactive.qrCode,
        label: `${inactive.fullName} · registro inactivo`,
        kind: 'inactive',
      });
    }
    samples.push({
      code: 'QR-NO-EXISTE',
      label: 'Código que no existe',
      kind: 'invalid',
    });
    return samples;
  }

  private applyExtras(extras: AttendanceRecord[]): void {
    for (const extra of extras) {
      const index = this.records.findIndex((record) =>
        record.studentId === extra.studentId && record.date === extra.date,
      );
      if (index >= 0) {
        this.records[index] = extra;
      } else {
        this.records.push(extra);
      }
    }
  }

  private persistExtra(record: AttendanceRecord): void {
    this.extras = [
      ...this.extras.filter((item) => !(item.studentId === record.studentId && item.date === record.date)),
      record,
    ];
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.extras));
    } catch {
      // La sesión privada puede impedir guardar. El registro sigue en memoria.
    }
  }
}

function readSessionRecords(): AttendanceRecord[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as AttendanceRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function clearSessionRecords(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Sin almacenamiento de sesión no hay nada que limpiar.
  }
}
