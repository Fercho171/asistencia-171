import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AttendanceSettings } from '../../interfaces/attendance.interface';
import { AttendanceService } from '../../services/attendance.service';
import { lateDeadline, settingsAreValid } from '../../services/attendance-rules';

@Component({
  selector: 'app-attendance-settings-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './attendance-settings-dialog.component.html',
  styleUrl: './attendance-settings-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceSettingsDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AttendanceSettingsDialogComponent, AttendanceSettings>);
  private readonly data = inject<AttendanceSettings>(MAT_DIALOG_DATA);
  private readonly formBuilder = inject(FormBuilder);
  private readonly attendance = inject(AttendanceService);

  readonly demoMode = this.attendance.demoMode;
  readonly error = signal<string | null>(null);
  readonly form = this.formBuilder.nonNullable.group({
    entryTime: [this.data.entryTime, Validators.required],
    lateToleranceMinutes: [this.data.lateToleranceMinutes, [Validators.required, Validators.min(0), Validators.max(180)]],
    attendanceCloseTime: [this.data.attendanceCloseTime, Validators.required],
  });

  deadline(): string {
    const value = this.form.getRawValue();
    return lateDeadline({
      entryTime: value.entryTime,
      lateToleranceMinutes: Number(value.lateToleranceMinutes),
      attendanceCloseTime: value.attendanceCloseTime,
    });
  }

  save(): void {
    const settings: AttendanceSettings = {
      entryTime: this.form.controls.entryTime.value,
      lateToleranceMinutes: Number(this.form.controls.lateToleranceMinutes.value),
      attendanceCloseTime: this.form.controls.attendanceCloseTime.value,
    };
    const validation = settingsAreValid(settings);
    if (validation) {
      this.error.set(validation);
      return;
    }
    this.dialogRef.close(settings);
  }

  resetDemo(): void {
    const accepted = window.confirm('Se borrarán los escaneos de esta sesión y volverán los datos de demostración.');
    if (!accepted) {
      return;
    }
    this.attendance.resetDemo().subscribe({
      next: () => this.dialogRef.close(),
      error: () => this.error.set('No fue posible restaurar la demostración.'),
    });
  }
}
