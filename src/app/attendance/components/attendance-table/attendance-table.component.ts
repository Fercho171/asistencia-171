import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AttendanceRow, AttendanceStatus } from '../../interfaces/attendance.interface';
import {
  AttendanceSortKey,
  STATUS_LABEL,
  compareAttendanceRows,
  statusClass,
} from '../../services/attendance-rules';
import { StudentAvatarComponent } from '../student-avatar/student-avatar.component';

@Component({
  selector: 'app-attendance-table',
  standalone: true,
  imports: [
    DatePipe,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    StudentAvatarComponent,
  ],
  templateUrl: './attendance-table.component.html',
  styleUrl: './attendance-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceTableComponent {
  readonly rows = input.required<AttendanceRow[]>();
  readonly resetToken = input('');
  readonly consult = output<AttendanceRow>();

  readonly columns = ['photo', 'enrollment', 'name', 'grade', 'group', 'time', 'status', 'method', 'actions'];
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortActive = signal<AttendanceSortKey>('name');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly statusLabel = STATUS_LABEL;
  readonly statusClass = statusClass;

  label(status: AttendanceStatus): string {
    return this.statusLabel[status];
  }

  readonly sortedRows = computed(() => {
    const rows = this.rows().slice();
    rows.sort((left, right) =>
      compareAttendanceRows(left, right, this.sortActive(), this.sortDirection()),
    );
    return rows;
  });

  readonly pagedRows = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.sortedRows().slice(start, start + this.pageSize());
  });

  constructor() {
    effect(() => {
      this.resetToken();
      this.pageIndex.set(0);
    }, { allowSignalWrites: true });
  }

  onSort(event: Sort): void {
    const allowed: AttendanceSortKey[] = ['enrollment', 'name', 'grade', 'group', 'time', 'status'];
    this.sortActive.set(allowed.includes(event.active as AttendanceSortKey) ? event.active as AttendanceSortKey : 'name');
    this.sortDirection.set(event.direction === 'desc' ? 'desc' : 'asc');
    this.pageIndex.set(0);
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }
}
