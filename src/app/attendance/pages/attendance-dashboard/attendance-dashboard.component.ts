import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { AttendanceExportMenuComponent } from '../../components/attendance-export-menu/attendance-export-menu.component';
import { AttendanceFiltersComponent } from '../../components/attendance-filters/attendance-filters.component';
import { AttendanceSettingsDialogComponent } from '../../components/attendance-settings-dialog/attendance-settings-dialog.component';
import { AttendanceStatsComponent } from '../../components/attendance-stats/attendance-stats.component';
import { AttendanceTableComponent } from '../../components/attendance-table/attendance-table.component';
import { GradeGroupSelectorComponent } from '../../components/grade-group-selector/grade-group-selector.component';
import { QrScannerComponent } from '../../components/qr-scanner/qr-scanner.component';
import { StudentDetailDialogComponent } from '../../components/student-detail-dialog/student-detail-dialog.component';
import { SCHOOL_NAME } from '../../../core/school';
import { AttendanceFilters, AttendanceRow, AttendanceStatus } from '../../interfaces/attendance.interface';
import { AttendanceService } from '../../services/attendance.service';
import { emptyFilters, matchesPopulation, matchesTable, serializeFilters, summarize, todayIso } from '../../services/attendance-rules';
import { QrScannerService } from '../../services/qr-scanner.service';

@Component({
  selector: 'app-attendance-dashboard',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    AttendanceStatsComponent,
    AttendanceFiltersComponent,
    GradeGroupSelectorComponent,
    AttendanceTableComponent,
    QrScannerComponent,
    AttendanceExportMenuComponent,
  ],
  templateUrl: './attendance-dashboard.component.html',
  styleUrl: './attendance-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceDashboardComponent implements OnInit {
  private readonly attendance = inject(AttendanceService);
  private readonly dialog = inject(MatDialog);
  private readonly scanner = inject(QrScannerService);

  readonly schoolName = SCHOOL_NAME;
  readonly filters = signal<AttendanceFilters>(emptyFilters());
  readonly scannerOpen = signal(false);
  readonly catalog = this.attendance.catalog;
  readonly loading = this.attendance.loading;
  readonly error = this.attendance.error;
  readonly lastUpdated = this.attendance.lastUpdated;
  readonly now = this.attendance.now;
  readonly cameraActive = this.scanner.active;

  readonly population = computed(() =>
    this.attendance.rows().filter((row) => matchesPopulation(row, this.filters())),
  );
  readonly stats = computed(() => summarize(this.population()));
  readonly gradeAttendance = computed(() => {
    const rows = this.attendance.rows();
    return this.catalog().grades
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((grade) => {
        const gradeRows = rows.filter((row) => row.student.gradeId === grade.id);
        const groups = this.catalog().groups
          .filter((group) => group.gradeId === grade.id)
          .map((group) => ({
            id: group.id,
            name: group.name,
            stats: summarize(gradeRows.filter((row) => row.student.groupId === group.id)),
          }));
        return {
          id: grade.id,
          name: grade.name,
          stats: summarize(gradeRows),
          groups,
        };
      });
  });
  readonly studentTotal = computed(() =>
    this.gradeAttendance().reduce((total, grade) => total + grade.stats.enrolled, 0),
  );
  readonly attendedByGrade = computed(() =>
    this.gradeAttendance().map((grade) => ({
      name: grade.name,
      attended: grade.stats.present + grade.stats.late,
    })),
  );
  readonly attendedTotal = computed(() =>
    this.attendedByGrade().reduce((total, grade) => total + grade.attended, 0),
  );
  readonly visibleRows = computed(() =>
    this.attendance.rows().filter((row) => matchesTable(row, this.filters())),
  );
  readonly filterKey = computed(() => serializeFilters(this.filters()));
  readonly viewingToday = computed(() => this.filters().date === todayIso(this.now()));

  ngOnInit(): void {
    this.attendance.loadDashboard(this.filters().date);
  }

  onFiltersChange(filters: AttendanceFilters): void {
    const dateChanged = filters.date !== this.filters().date;
    this.filters.set(filters);
    if (dateChanged && filters.date) {
      this.attendance.loadDashboard(filters.date);
    }
  }

  onGradeSelected(gradeId: string): void {
    const current = this.filters();
    if (current.gradeId === gradeId && !current.groupId) {
      this.filters.update((value) => ({ ...value, levelId: '', gradeId: '', groupId: '' }));
      return;
    }
    const grade = this.catalog().grades.find((item) => item.id === gradeId);
    this.filters.update((value) => ({
      ...value,
      levelId: grade?.levelId ?? '',
      gradeId,
      groupId: '',
    }));
  }

  onGroupSelected(selection: { gradeId: string; groupId: string } | null): void {
    if (!selection) {
      this.filters.update((current) => ({ ...current, levelId: '', gradeId: '', groupId: '' }));
      return;
    }
    const grade = this.catalog().grades.find((item) => item.id === selection.gradeId);
    this.filters.update((current) => ({
      ...current,
      levelId: grade?.levelId ?? '',
      gradeId: selection.gradeId,
      groupId: selection.groupId,
    }));
  }

  onStat(status: AttendanceStatus | ''): void {
    this.filters.update((current) => ({
      ...current,
      status: status !== '' && current.status === status ? '' : status,
    }));
  }

  showMissing(): void {
    this.onStat(this.stats().pending > 0 ? 'PENDIENTE' : 'AUSENTE');
  }

  refresh(): void {
    this.attendance.refreshDashboard();
  }

  openSettings(): void {
    this.dialog.open(AttendanceSettingsDialogComponent, {
      data: this.attendance.settings(),
      width: '520px',
      maxWidth: '95vw',
      autoFocus: 'first-tabbable',
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.attendance.updateSettings(result);
      }
    });
  }

  consult(row: AttendanceRow): void {
    this.dialog.open(StudentDetailDialogComponent, {
      data: { studentId: row.student.id, focusDate: this.filters().date },
      width: '820px',
      maxWidth: '95vw',
      autoFocus: 'first-tabbable',
      panelClass: 'student-dialog',
    });
  }
}
