import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AttendanceReportQuery,
  DailyAttendanceResponse,
  QrCheckInRequest,
  QrCheckInResponse,
  SampleQrCode,
  StudentHistoryResponse,
} from '../interfaces/attendance.interface';
import { AttendanceRepository } from './attendance.repository';

/**
 * Adaptador HTTP provisional.
 * El proyecto no publica un contrato de backend: estos tipos describen lo que la pantalla necesita.
 * Cuando el contrato real esté disponible, el mapeo se concentra en esta clase.
 *
 * Endpoints previstos:
 * - GET  /attendance/daily?date=YYYY-MM-DD
 * - GET  /attendance/grade/{gradeId}?date=YYYY-MM-DD
 * - GET  /attendance/group/{groupId}?date=YYYY-MM-DD
 * - POST /attendance/qr/check-in   { qrCode, scannedAt }
 * - GET  /attendance/student/{studentId}
 * - GET  /attendance/report
 */
@Injectable()
export class AttendanceHttpRepository extends AttendanceRepository {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {
    super();
  }

  getDaily(date: string): Observable<DailyAttendanceResponse> {
    return this.http.get<DailyAttendanceResponse>(`${this.baseUrl}/attendance/daily`, {
      params: { date },
    });
  }

  getByGrade(gradeId: string, date: string): Observable<DailyAttendanceResponse> {
    return this.http.get<DailyAttendanceResponse>(
      `${this.baseUrl}/attendance/grade/${encodeURIComponent(gradeId)}`,
      { params: { date } },
    );
  }

  getByGroup(groupId: string, date: string): Observable<DailyAttendanceResponse> {
    return this.http.get<DailyAttendanceResponse>(
      `${this.baseUrl}/attendance/group/${encodeURIComponent(groupId)}`,
      { params: { date } },
    );
  }

  checkIn(request: QrCheckInRequest): Observable<QrCheckInResponse> {
    return this.http.post<QrCheckInResponse>(`${this.baseUrl}/attendance/qr/check-in`, request);
  }

  getStudentHistory(studentId: string): Observable<StudentHistoryResponse> {
    return this.http.get<StudentHistoryResponse>(
      `${this.baseUrl}/attendance/student/${encodeURIComponent(studentId)}`,
    );
  }

  getReport(query: AttendanceReportQuery): Observable<DailyAttendanceResponse> {
    let params = new HttpParams().set('date', query.date);
    const optional: Array<[keyof AttendanceReportQuery, string | undefined]> = [
      ['levelId', query.levelId],
      ['gradeId', query.gradeId],
      ['groupId', query.groupId],
      ['studentName', query.studentName],
      ['status', query.status],
    ];
    for (const [key, value] of optional) {
      if (value) {
        params = params.set(key, value);
      }
    }
    return this.http.get<DailyAttendanceResponse>(`${this.baseUrl}/attendance/report`, { params });
  }

  getSampleCodes(): Observable<SampleQrCode[]> {
    return of([]);
  }

  resetDemo(): Observable<void> {
    return throwError(() => new Error('El reinicio solo está disponible con datos de demostración.'));
  }
}
