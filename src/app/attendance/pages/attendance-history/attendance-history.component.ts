import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { AttendanceExportMenuComponent } from '../../components/attendance-export-menu/attendance-export-menu.component';
import { AttendanceFiltersComponent } from '../../components/attendance-filters/attendance-filters.component';
import { AttendanceStatsComponent } from '../../components/attendance-stats/attendance-stats.component';
import { AttendanceTableComponent } from '../../components/attendance-table/attendance-table.component';
import { GradeGroupSelectorComponent } from '../../components/grade-group-selector/grade-group-selector.component';
import { StudentDetailDialogComponent } from '../../components/student-detail-dialog/student-detail-dialog.component';
import { AttendanceFilters, AttendanceRow, AttendanceStatsSummary, AttendanceStatus } from '../../interfaces/attendance.interface';
import { AttendanceService } from '../../services/attendance.service';
import { emptyFilters, matchesTable, serializeFilters, summarize } from '../../services/attendance-rules';

interface GroupBreakdown {
  id: string;
  gradeId: string;
  label: string;
  stats: AttendanceStatsSummary;
}

@Component({
  selector: 'app-attendance-history',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    AttendanceFiltersComponent,
    AttendanceStatsComponent,
    GradeGroupSelectorComponent,
    AttendanceTableComponent,
    AttendanceExportMenuComponent,
  ],
  templateUrl: './attendance-history.component.html',
  styleUrl: './attendance-history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceHistoryComponent implements OnInit {
  private readonly attendance = inject(AttendanceService);
  private readonly dialog = inject(MatDialog);
  private readonly requests = new Subject<AttendanceFilters>();

  readonly filters = signal<AttendanceFilters>(emptyFilters());
  readonly population = signal<AttendanceRow[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly catalog = this.attendance.catalog;
  readonly lastUpdated = signal<Date | null>(null);
  private readonly fetchedScope = signal('');

  readonly visibleRows = computed(() => this.population().filter((row) => matchesTable(row, this.filters())));
  readonly stats = computed(() => summarize(this.population()));
  readonly filterKey = computed(() => serializeFilters(this.filters()));
  readonly breakdown = computed<GroupBreakdown[]>(() => {
    const groups = new Map<string, AttendanceRow[]>();
    for (const row of this.population()) {
      const current = groups.get(row.student.groupId) ?? [];
      current.push(row);
      groups.set(row.student.groupId, current);
    }
    return [...groups.entries()].map(([id, rows]) => ({
      id,
      gradeId: rows[0].student.gradeId,
      label: `${rows[0].student.levelName} · ${rows[0].student.gradeName} · Grupo ${rows[0].student.groupName}`,
      stats: summarize(rows),
    }));
  });

  constructor() {
    this.requests.pipe(
      switchMap((filters) => {
        this.loading.set(true);
        this.error.set(null);
        return this.attendance.query(filters).pipe(
          catchError(() => {
            this.error.set('No fue posible consultar el historial.');
            return of(null);
          }),
          finalize(() => this.loading.set(false)),
        );
      }),
      takeUntilDestroyed(),
    ).subscribe((result) => {
      this.population.set(result?.population ?? []);
      this.fetchedScope.set(this.scopeKey(this.filters()));
      if (result) {
        this.lastUpdated.set(new Date());
      }
    });
  }

  ngOnInit(): void {
    this.applyFilters(this.filters());
  }

  onFiltersChange(filters: AttendanceFilters): void {
    if (serializeFilters(filters) === serializeFilters(this.filters())) {
      return;
    }
    this.applyFilters(filters);
  }

  onGroupSelected(selection: { gradeId: string; groupId: string } | null): void {
    if (!selection) {
      this.applyFilters({ ...this.filters(), levelId: '', gradeId: '', groupId: '' });
      return;
    }
    const grade = this.catalog().grades.find((item) => item.id === selection.gradeId);
    this.applyFilters({
      ...this.filters(),
      levelId: grade?.levelId ?? '',
      gradeId: selection.gradeId,
      groupId: selection.groupId,
    });
  }

  onStat(status: AttendanceStatus | ''): void {
    const current = this.filters();
    this.applyFilters({
      ...current,
      status: status !== '' && current.status === status ? '' : status,
    });
  }

  consult(row: AttendanceRow): void {
    this.dialog.open(StudentDetailDialogComponent, {
      data: { studentId: row.student.id, focusDate: row.date },
      width: '820px',
      maxWidth: '95vw',
      autoFocus: 'first-tabbable',
      panelClass: 'student-dialog',
    });
  }

  private applyFilters(filters: AttendanceFilters): void {
    this.filters.set(filters);
    const scope = this.scopeKey(filters);
    if (scope === this.fetchedScope()) {
      return;
    }
    this.requests.next(filters);
  }

  private scopeKey(filters: AttendanceFilters): string {
    return [filters.date, filters.levelId, filters.gradeId, filters.groupId].join('|');
  }
}
