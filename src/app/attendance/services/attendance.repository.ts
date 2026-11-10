import { Observable } from 'rxjs';
import {
  AttendanceReportQuery,
  DailyAttendanceResponse,
  QrCheckInRequest,
  QrCheckInResponse,
  SampleQrCode,
  StudentHistoryResponse,
} from '../interfaces/attendance.interface';

/**
 * Contrato interno de la pantalla.
 * La implementación HTTP traduce estos métodos a los endpoints previstos.
 * La implementación local solo se usa mientras no haya backend.
 */
export abstract class AttendanceRepository {
  abstract getDaily(date: string): Observable<DailyAttendanceResponse>;
  abstract getByGrade(gradeId: string, date: string): Observable<DailyAttendanceResponse>;
  abstract getByGroup(groupId: string, date: string): Observable<DailyAttendanceResponse>;
  abstract checkIn(request: QrCheckInRequest): Observable<QrCheckInResponse>;
  abstract getStudentHistory(studentId: string): Observable<StudentHistoryResponse>;
  abstract getReport(query: AttendanceReportQuery): Observable<DailyAttendanceResponse>;
  abstract getSampleCodes(): Observable<SampleQrCode[]>;
  abstract resetDemo(): Observable<void>;
}
