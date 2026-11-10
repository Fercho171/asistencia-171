import {
  AttendanceFilters,
  AttendanceRecord,
  AttendanceReportQuery,
  AttendanceRow,
  AttendanceSettings,
  AttendanceStatsSummary,
  AttendanceStatus,
  DailyAttendanceEntry,
  StudentHistoryDay,
} from '../interfaces/attendance.interface';
import { SchoolCatalog, Student } from '../interfaces/student.interface';

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  entryTime: '08:00',
  lateToleranceMinutes: 15,
  attendanceCloseTime: '09:30',
};

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENTE: 'Presente',
  RETARDO: 'Retardo',
  AUSENTE: 'Ausente',
  PENDIENTE: 'Pendiente',
};

const STATUS_ORDER: Record<AttendanceStatus, number> = {
  PRESENTE: 0,
  RETARDO: 1,
  PENDIENTE: 2,
  AUSENTE: 3,
};

export function statusClass(status: AttendanceStatus): string {
  switch (status) {
    case 'PRESENTE':
      return 'status-present';
    case 'RETARDO':
      return 'status-late';
    case 'AUSENTE':
      return 'status-absent';
    case 'PENDIENTE':
      return 'status-pending';
  }
}

export function todayIso(now = new Date()): string {
  return toIsoDate(now);
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function isWeekend(date: string): boolean {
  const day = parseIsoDate(date).getDay();
  return day === 0 || day === 6;
}

export function recentSchoolDays(from: string, count: number): string[] {
  const days = [from];
  const cursor = parseIsoDate(from);
  while (days.length < count) {
    cursor.setDate(cursor.getDate() - 1);
    const weekday = cursor.getDay();
    if (weekday !== 0 && weekday !== 6) {
      days.push(toIsoDate(cursor));
    }
  }
  return days;
}

export function previousSchoolDays(from: string, count: number): string[] {
  return recentSchoolDays(from, count + 1).slice(1);
}

export function minutesOfDay(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function formatClock(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function lateDeadline(settings: AttendanceSettings): string {
  return formatClock(minutesOfDay(settings.entryTime) + settings.lateToleranceMinutes);
}

export function dateTimeOn(date: string, time: string): Date {
  const value = parseIsoDate(date);
  const [hours, minutes] = time.split(':').map(Number);
  value.setHours(hours || 0, minutes || 0, 0, 0);
  return value;
}

export function statusFromCheckIn(checkIn: Date, settings: AttendanceSettings): 'PRESENTE' | 'RETARDO' {
  const minutes = checkIn.getHours() * 60 + checkIn.getMinutes();
  const limit = minutesOfDay(settings.entryTime) + settings.lateToleranceMinutes;
  return minutes <= limit ? 'PRESENTE' : 'RETARDO';
}

export function missingStatus(date: string, settings: AttendanceSettings, now: Date): 'AUSENTE' | 'PENDIENTE' {
  const day = parseIsoDate(date).getTime();
  const today = parseIsoDate(todayIso(now)).getTime();
  if (day < today) {
    return 'AUSENTE';
  }
  if (day > today) {
    return 'PENDIENTE';
  }
  const close = dateTimeOn(date, settings.attendanceCloseTime);
  return now.getTime() >= close.getTime() ? 'AUSENTE' : 'PENDIENTE';
}

export function resolveStatus(
  record: AttendanceRecord | null,
  date: string,
  settings: AttendanceSettings,
  now: Date,
): AttendanceStatus {
  if (record?.status) {
    return record.status;
  }
  if (record) {
    return statusFromCheckIn(new Date(record.checkInTime), settings);
  }
  return missingStatus(date, settings, now);
}

export function toAttendanceRow(
  entry: DailyAttendanceEntry,
  date: string,
  settings: AttendanceSettings,
  now: Date,
): AttendanceRow {
  return {
    student: entry.student,
    date,
    checkInTime: entry.record?.checkInTime ?? null,
    method: entry.record?.method ?? null,
    status: resolveStatus(entry.record, date, settings, now),
  };
}

export function buildHistoryDays(
  records: AttendanceRecord[],
  settings: AttendanceSettings,
  now: Date,
): StudentHistoryDay[] {
  const dates = new Set(recentSchoolDays(todayIso(now), 15));
  for (const record of records) {
    dates.add(record.date);
  }
  return [...dates]
    .filter((date) => parseIsoDate(date).getTime() <= parseIsoDate(todayIso(now)).getTime())
    .sort((left, right) => right.localeCompare(left))
    .map((date) => {
      const record = records.find((item) => item.date === date) ?? null;
      return {
        date,
        checkInTime: record?.checkInTime ?? null,
        method: record?.method ?? null,
        status: resolveStatus(record, date, settings, now),
      };
    });
}

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function matchesPopulation(row: AttendanceRow, filters: AttendanceFilters): boolean {
  if (filters.levelId && row.student.levelId !== filters.levelId) {
    return false;
  }
  if (filters.gradeId && row.student.gradeId !== filters.gradeId) {
    return false;
  }
  if (filters.groupId && row.student.groupId !== filters.groupId) {
    return false;
  }
  return true;
}

export function matchesTable(row: AttendanceRow, filters: AttendanceFilters): boolean {
  if (!matchesPopulation(row, filters)) {
    return false;
  }
  if (filters.status && row.status !== filters.status) {
    return false;
  }
  const query = normalizeText(filters.studentName.trim());
  if (!query) {
    return true;
  }
  const haystack = normalizeText(`${row.student.fullName} ${row.student.enrollment}`);
  return haystack.includes(query);
}

export function summarize(rows: AttendanceRow[]): AttendanceStatsSummary {
  const enrolled = rows.length;
  let present = 0;
  let late = 0;
  let absent = 0;
  let pending = 0;
  for (const row of rows) {
    switch (row.status) {
      case 'PRESENTE':
        present += 1;
        break;
      case 'RETARDO':
        late += 1;
        break;
      case 'AUSENTE':
        absent += 1;
        break;
      case 'PENDIENTE':
        pending += 1;
        break;
    }
  }
  const attendanceRate = enrolled === 0 ? 0 : Math.round(((present + late) / enrolled) * 1000) / 10;
  return { enrolled, present, late, absent, pending, attendanceRate };
}

export function emptyFilters(date = todayIso()): AttendanceFilters {
  return {
    date,
    levelId: '',
    gradeId: '',
    groupId: '',
    studentName: '',
    status: '',
  };
}

export function serializeFilters(filters: AttendanceFilters): string {
  return [
    filters.date,
    filters.levelId,
    filters.gradeId,
    filters.groupId,
    filters.studentName,
    filters.status,
  ].join('|');
}

export function toReportQuery(filters: AttendanceFilters): AttendanceReportQuery {
  return {
    date: filters.date,
    levelId: filters.levelId || undefined,
    gradeId: filters.gradeId || undefined,
    groupId: filters.groupId || undefined,
    studentName: filters.studentName.trim() || undefined,
    status: filters.status || undefined,
  };
}

export function formatLongDate(date: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseIsoDate(date));
}

export function formatTime(iso: string, withSeconds = false): string {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
    hour12: false,
  }).format(new Date(iso));
}

export function describeFilters(filters: AttendanceFilters, catalog: SchoolCatalog): string {
  const level = catalog.levels.find((item) => item.id === filters.levelId);
  const grade = catalog.grades.find((item) => item.id === filters.gradeId);
  const group = catalog.groups.find((item) => item.id === filters.groupId);
  const parts = [
    formatLongDate(filters.date),
    level?.name ?? 'Todos los niveles',
  ];
  if (grade) {
    parts.push(grade.name);
  }
  if (group) {
    parts.push(`Grupo ${group.name}`);
  }
  if (filters.status) {
    parts.push(STATUS_LABEL[filters.status]);
  }
  if (filters.studentName.trim()) {
    parts.push(`Búsqueda: ${filters.studentName.trim()}`);
  }
  return parts.join(' · ');
}

export function catalogFromEntries(entries: DailyAttendanceEntry[]): SchoolCatalog {
  const levels = new Map<string, SchoolCatalog['levels'][number]>();
  const grades = new Map<string, SchoolCatalog['grades'][number]>();
  const groups = new Map<string, SchoolCatalog['groups'][number]>();
  for (const entry of entries) {
    const student = entry.student;
    levels.set(student.levelId, { id: student.levelId, name: student.levelName });
    grades.set(student.gradeId, {
      id: student.gradeId,
      levelId: student.levelId,
      name: student.gradeName,
      order: Number.parseInt(student.gradeName, 10) || 0,
    });
    groups.set(student.groupId, {
      id: student.groupId,
      gradeId: student.gradeId,
      name: student.groupName,
    });
  }
  return {
    levels: [...levels.values()],
    grades: [...grades.values()].sort((left, right) => left.order - right.order || left.name.localeCompare(right.name, 'es')),
    groups: [...groups.values()].sort((left, right) => left.name.localeCompare(right.name, 'es')),
  };
}

export function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (Math.imul(hash, 31) + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function studentMatchesQuery(student: Student, query: string): boolean {
  const normalized = normalizeText(query.trim());
  if (!normalized) {
    return true;
  }
  return normalizeText(`${student.fullName} ${student.enrollment}`).includes(normalized);
}

export type AttendanceSortKey = 'enrollment' | 'name' | 'grade' | 'group' | 'time' | 'status';

export function compareAttendanceRows(
  left: AttendanceRow,
  right: AttendanceRow,
  key: AttendanceSortKey,
  direction: 'asc' | 'desc',
): number {
  let result = 0;
  switch (key) {
    case 'enrollment':
      result = left.student.enrollment.localeCompare(right.student.enrollment, 'es');
      break;
    case 'name':
      result = left.student.fullName.localeCompare(right.student.fullName, 'es');
      break;
    case 'grade':
      result = left.student.levelName.localeCompare(right.student.levelName, 'es')
        || left.student.gradeName.localeCompare(right.student.gradeName, 'es')
        || left.student.groupName.localeCompare(right.student.groupName, 'es');
      break;
    case 'group':
      result = left.student.groupName.localeCompare(right.student.groupName, 'es')
        || left.student.fullName.localeCompare(right.student.fullName, 'es');
      break;
    case 'time':
      result = (left.checkInTime ?? '99').localeCompare(right.checkInTime ?? '99');
      break;
    case 'status':
      result = STATUS_ORDER[left.status] - STATUS_ORDER[right.status]
        || left.student.fullName.localeCompare(right.student.fullName, 'es');
      break;
  }
  return direction === 'desc' ? result * -1 : result;
}

export function settingsAreValid(settings: AttendanceSettings): string | null {
  if (!/^\d{2}:\d{2}$/.test(settings.entryTime) || !/^\d{2}:\d{2}$/.test(settings.attendanceCloseTime)) {
    return 'Indique las horas en formato de 24 horas.';
  }
  if (!Number.isFinite(settings.lateToleranceMinutes) || settings.lateToleranceMinutes < 0 || settings.lateToleranceMinutes > 180) {
    return 'La tolerancia debe estar entre 0 y 180 minutos.';
  }
  const deadline = minutesOfDay(settings.entryTime) + settings.lateToleranceMinutes;
  if (minutesOfDay(settings.attendanceCloseTime) <= deadline) {
    return 'El cierre de asistencia debe ser posterior a la hora límite de retardo.';
  }
  return null;
}

const SETTINGS_KEY = 'asistencia-qr-settings-v1';

export function readStoredSettings(): AttendanceSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return { ...DEFAULT_ATTENDANCE_SETTINGS };
    }
    const parsed = JSON.parse(raw) as Partial<AttendanceSettings>;
    const settings: AttendanceSettings = {
      entryTime: parsed.entryTime || DEFAULT_ATTENDANCE_SETTINGS.entryTime,
      lateToleranceMinutes: Number(parsed.lateToleranceMinutes ?? DEFAULT_ATTENDANCE_SETTINGS.lateToleranceMinutes),
      attendanceCloseTime: parsed.attendanceCloseTime || DEFAULT_ATTENDANCE_SETTINGS.attendanceCloseTime,
    };
    return settingsAreValid(settings) ? { ...DEFAULT_ATTENDANCE_SETTINGS } : settings;
  } catch {
    return { ...DEFAULT_ATTENDANCE_SETTINGS };
  }
}

export function storeSettings(settings: AttendanceSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
