import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { EducationLevel, Grade, SchoolGroup } from '../../interfaces/student.interface';

interface GroupChoice {
  grade: Grade;
  group: SchoolGroup;
  label: string;
}

@Component({
  selector: 'app-grade-group-selector',
  standalone: true,
  templateUrl: './grade-group-selector.component.html',
  styleUrl: './grade-group-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradeGroupSelectorComponent {
  readonly levels = input<EducationLevel[]>([]);
  readonly grades = input<Grade[]>([]);
  readonly groups = input<SchoolGroup[]>([]);
  readonly levelId = input('');
  readonly selectedGroupId = input('');
  readonly groupSelected = output<{ gradeId: string; groupId: string } | null>();

  readonly sections = computed(() => {
    const levelFilter = this.levelId();
    return this.levels()
      .filter((level) => !levelFilter || level.id === levelFilter)
      .map((level) => ({
        level,
        items: this.grades()
          .filter((grade) => grade.levelId === level.id)
          .flatMap((grade) =>
            this.groups()
              .filter((group) => group.gradeId === grade.id)
              .map((group): GroupChoice => ({
                grade,
                group,
                label: `${grade.name} – Grupo ${group.name}`,
              })),
          ),
      }))
      .filter((section) => section.items.length > 0);
  });

  choose(choice: GroupChoice): void {
    if (this.selectedGroupId() === choice.group.id) {
      this.groupSelected.emit(null);
      return;
    }
    this.groupSelected.emit({ gradeId: choice.grade.id, groupId: choice.group.id });
  }

  clear(): void {
    this.groupSelected.emit(null);
  }
}
