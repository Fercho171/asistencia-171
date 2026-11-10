import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AttendanceStatus } from '../../interfaces/attendance.interface';
import { Student } from '../../interfaces/student.interface';
import { STATUS_LABEL, statusClass } from '../../services/attendance-rules';
import { StudentAvatarComponent } from '../student-avatar/student-avatar.component';

@Component({
  selector: 'app-student-attendance-card',
  standalone: true,
  imports: [DatePipe, StudentAvatarComponent],
  templateUrl: './student-attendance-card.component.html',
  styleUrl: './student-attendance-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentAttendanceCardComponent {
  readonly student = input.required<Student>();
  readonly status = input<AttendanceStatus | null>(null);
  readonly checkInTime = input<string | null>(null);
  readonly message = input('');
  readonly tone = input<'success' | 'warning' | 'error' | 'neutral'>('neutral');
  readonly statusLabel = STATUS_LABEL;
  readonly statusClass = statusClass;
}
