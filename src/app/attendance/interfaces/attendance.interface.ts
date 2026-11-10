import { SchoolCatalog, Student } from './student.interface';

export type AttendanceStatus = 'PRESENTE' | 'RETARDO' | 'AUSENTE' | 'PENDIENTE';

export type AttendanceMethod = 'QR';

export type CheckInResultCode =
  | 'REGISTERED'
  | 'ALREADY_REGISTERED'
  | 'INVALID_QR'
  | 'NOT_ENROLLED';

export interface AttendanceSettings {
  entryTime: string;
  lateToleranceMinutes: number;
  attendanceCloseTime: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  checkInTime: string;
  method: AttendanceMethod;
  /** Si el backend ya resolvió el estado, la pantalla lo respeta. */
  status?: AttendanceStatus;
}

export interface DailyAttendanceEntry {
  student: Student;
  record: AttendanceRecord | null;
}

/**
 * Forma provisional que la pantalla necesita.
 * El adaptador HTTP es el único lugar que debe cambiar cuando el contrato real exista.
 */
export interface DailyAttendanceResponse {
  date: string;
  catalog?: SchoolCatalog;
  entries: DailyAttendanceEntry[];
}

export interface QrCheckInRequest {
  qrCode: string;
  scannedAt: string;
}

export interface QrCheckInResponse {
  result: CheckInResultCode;
  student: Student | null;
  record: AttendanceRecord | null;
}

export interface StudentHistoryResponse {
  student: Student;
  records: AttendanceRecord[];
}

export interface AttendanceFilters {
  date: string;
  levelId: string;
  gradeId: string;
  groupId: string;
  studentName: string;
  status: AttendanceStatus | '';
}

export interface AttendanceRow {
  student: Student;
  date: string;
  checkInTime: string | null;
  method: AttendanceMethod | null;
  status: AttendanceStatus;
}

export interface AttendanceStatsSummary {
  enrolled: number;
  present: number;
  late: number;
  absent: number;
  pending: number;
  attendanceRate: number;
}

export interface StudentHistoryDay {
  date: string;
  checkInTime: string | null;
  method: AttendanceMethod | null;
  status: AttendanceStatus;
}

export interface StudentAttendanceHistory {
  student: Student;
  days: StudentHistoryDay[];
  attendedDays: number;
  recordedDays: number;
  attendanceRate: number;
}

export interface AttendanceReportQuery {
  date: string;
  levelId?: string;
  gradeId?: string;
  groupId?: string;
  studentName?: string;
  status?: AttendanceStatus | '';
}

export interface AttendanceReport {
  date: string;
  generatedAt: string;
  description: string;
  rows: AttendanceRow[];
  stats: AttendanceStatsSummary;
}

export interface AttendanceQueryResult {
  rows: AttendanceRow[];
  population: AttendanceRow[];
  stats: AttendanceStatsSummary;
}

export interface ScanOutcome {
  result: CheckInResultCode;
  message: string;
  student: Student | null;
  checkInTime: string | null;
  status: AttendanceStatus | null;
}

export interface SampleQrCode {
  code: string;
  label: string;
  kind: 'valid' | 'inactive' | 'invalid';
}
