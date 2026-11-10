import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { hashString } from '../../services/attendance-rules';

const PALETTE = ['#1f4e79', '#1f6f8b', '#3d5a4c', '#6b4f3a', '#3f4c6b', '#245c54'];

@Component({
  selector: 'app-student-avatar',
  standalone: true,
  templateUrl: './student-avatar.component.html',
  styleUrl: './student-avatar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentAvatarComponent {
  readonly name = input.required<string>();
  readonly photoUrl = input<string | null>(null);
  readonly size = input<'sm' | 'md'>('sm');

  readonly initials = computed(() => {
    const parts = this.name().split(/\s+/).filter(Boolean);
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  });

  readonly color = computed(() => PALETTE[hashString(this.name()) % PALETTE.length]);
}
