import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AttendanceFilters } from '../../interfaces/attendance.interface';
import { AttendanceExportService } from '../../services/attendance-export.service';
import { AttendanceService } from '../../services/attendance.service';

@Component({
  selector: 'app-attendance-export-menu',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './attendance-export-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceExportMenuComponent {
  readonly filters = input.required<AttendanceFilters>();
  private readonly attendance = inject(AttendanceService);
  private readonly exporter = inject(AttendanceExportService);
  readonly exporting = signal(false);
  readonly error = signal<string | null>(null);

  exportExcel(): void {
    this.export('excel');
  }

  exportPdf(): void {
    this.export('pdf');
  }

  private export(kind: 'excel' | 'pdf'): void {
    this.exporting.set(true);
    this.error.set(null);
    this.attendance.fetchReport(this.filters()).subscribe({
      next: async (report) => {
        try {
          if (kind === 'excel') {
            await this.exporter.toExcel(report);
          } else {
            await this.exporter.toPdf(report);
          }
        } catch {
          this.error.set('No fue posible generar el archivo.');
        } finally {
          this.exporting.set(false);
        }
      },
      error: () => {
        this.exporting.set(false);
        this.error.set('No fue posible consultar el reporte.');
      },
    });
  }
}
