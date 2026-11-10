import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime } from 'rxjs/operators';
import { AttendanceFilters, AttendanceStatus } from '../../interfaces/attendance.interface';
import { EducationLevel, Grade, SchoolGroup } from '../../interfaces/student.interface';
import { isWeekend, serializeFilters, todayIso } from '../../services/attendance-rules';

@Component({
  selector: 'app-attendance-filters',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule],
  templateUrl: './attendance-filters.component.html',
  styleUrl: './attendance-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceFiltersComponent {
  readonly value = input<AttendanceFilters | null>(null);
  readonly levels = input<EducationLevel[]>([]);
  readonly grades = input<Grade[]>([]);
  readonly groups = input<SchoolGroup[]>([]);
  readonly filtersChange = output<AttendanceFilters>();

  private readonly formBuilder = inject(FormBuilder);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private lastSerialized = '';
  private applyingExternal = false;
  private applyToken = 0;

  readonly form = this.formBuilder.nonNullable.group({
    date: todayIso(),
    levelId: '',
    gradeId: '',
    groupId: '',
    studentName: '',
    status: '' as AttendanceStatus | '',
  });

  readonly levelId = signal('');
  readonly gradeId = signal('');
  readonly dateValue = signal('');

  readonly gradeOptions = computed(() => {
    const levelId = this.levelId();
    return this.grades()
      .filter((grade) => !levelId || grade.levelId === levelId)
      .map((grade) => ({
        ...grade,
        label: levelId ? grade.name : `${this.levelName(grade.levelId)} · ${grade.name}`,
      }));
  });

  readonly groupOptions = computed(() => {
    const levelId = this.levelId();
    const gradeId = this.gradeId();
    return this.groups()
      .filter((group) => {
        const grade = this.grades().find((item) => item.id === group.gradeId);
        if (!grade) {
          return false;
        }
        if (gradeId) {
          return group.gradeId === gradeId;
        }
        return !levelId || grade.levelId === levelId;
      })
      .map((group) => {
        const grade = this.grades().find((item) => item.id === group.gradeId);
        const prefix = gradeId ? '' : `${this.levelName(grade?.levelId ?? '')} · ${grade?.name ?? ''} · `;
        return { ...group, label: `${prefix}Grupo ${group.name}` };
      });
  });

  readonly weekend = computed(() => {
    const date = this.dateValue();
    return Boolean(date) && isWeekend(date);
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (!this.applyingExternal) {
        this.syncSelectors();
      }
    });
    this.form.valueChanges.pipe(debounceTime(80), takeUntilDestroyed()).subscribe(() => {
      if (this.applyingExternal) {
        return;
      }
      const filters = this.readFilters();
      const serialized = serializeFilters(filters);
      if (serialized === this.lastSerialized) {
        return;
      }
      this.lastSerialized = serialized;
      this.filtersChange.emit(filters);
    });

    effect(() => {
      const incoming = this.value();
      if (!incoming) {
        return;
      }
      this.scheduleExternalApply(incoming);
    });
  }

  onLevelSelected(levelId: string): void {
    if (this.applyingExternal) {
      return;
    }
    const grade = this.grades().find((item) => item.id === this.form.controls.gradeId.value);
    if (!levelId || (grade && grade.levelId !== levelId)) {
      this.form.patchValue({ gradeId: '', groupId: '' });
    }
  }

  onGradeSelected(gradeId: string): void {
    if (this.applyingExternal) {
      return;
    }
    const group = this.groups().find((item) => item.id === this.form.controls.groupId.value);
    if (!gradeId || (group && group.gradeId !== gradeId)) {
      this.form.controls.groupId.setValue('');
    }
  }

  clear(): void {
    this.form.patchValue({
      levelId: '',
      gradeId: '',
      groupId: '',
      studentName: '',
      status: '',
    });
  }

  private scheduleExternalApply(incoming: AttendanceFilters): void {
    const serialized = serializeFilters(incoming);
    const token = ++this.applyToken;
    setTimeout(() => {
      if (token !== this.applyToken) {
        return;
      }
      const current = this.value();
      if (!current || serializeFilters(current) !== serialized) {
        this.applyingExternal = false;
        return;
      }
      this.applyingExternal = true;
      this.levelId.set(current.levelId);
      this.gradeId.set(current.gradeId);
      this.dateValue.set(current.date);
      this.changeDetector.detectChanges();
      if (serializeFilters(this.readFilters()) !== serialized) {
        this.form.patchValue(current, { emitEvent: false });
      }
      this.lastSerialized = serialized;
      this.changeDetector.markForCheck();
      setTimeout(() => {
        if (token === this.applyToken) {
          this.applyingExternal = false;
        }
      });
    });
  }

  private syncSelectors(): void {
    const value = this.form.getRawValue();
    this.levelId.set(value.levelId);
    this.gradeId.set(value.gradeId);
    this.dateValue.set(value.date);
  }

  private readFilters(): AttendanceFilters {
    const value = this.form.getRawValue();
    return {
      date: value.date,
      levelId: value.levelId,
      gradeId: value.gradeId,
      groupId: value.groupId,
      studentName: value.studentName,
      status: value.status,
    };
  }

  private levelName(levelId: string): string {
    return this.levels().find((level) => level.id === levelId)?.name ?? '';
  }
}
