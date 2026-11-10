import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SCHOOL_NAME } from '../../core/school';
import { AttendanceReport, AttendanceStatus } from '../interfaces/attendance.interface';
import { STATUS_LABEL, formatLongDate, formatTime } from './attendance-rules';

@Injectable({ providedIn: 'root' })
export class AttendanceExportService {
  private regularFont: string | null = null;
  private boldFont: string | null = null;

  async toExcel(report: AttendanceReport): Promise<void> {
    const xlsx = await import('xlsx');
    const rows = [
      [SCHOOL_NAME],
      ['Control de asistencia'],
      [report.description],
      [`Generado: ${formatTime(report.generatedAt, true)} · ${formatLongDate(report.date)}`],
      [],
      ['Matrícula', 'Nombre', 'Nivel', 'Grado', 'Grupo', 'Hora de entrada', 'Estado', 'Método'],
      ...report.rows.map((row) => [
        row.student.enrollment,
        row.student.fullName,
        row.student.levelName,
        row.student.gradeName,
        row.student.groupName,
        row.checkInTime ? formatTime(row.checkInTime, true) : '',
        STATUS_LABEL[row.status],
        row.method ?? '',
      ]),
    ];
    const sheet = xlsx.utils.aoa_to_sheet(rows);
    sheet['!cols'] = [
      { wch: 14 },
      { wch: 36 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 18 },
      { wch: 14 },
      { wch: 10 },
    ];
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book, sheet, 'Asistencia');
    xlsx.writeFile(book, `asistencia-${report.date}.xlsx`);
  }

  async toPdf(report: AttendanceReport): Promise<void> {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const fontReady = await this.registerFonts(doc);
    const font = fontReady ? 'IBMPlexSans' : 'helvetica';
    doc.setFont(font, 'normal');

    const text = (value: string): string => (fontReady ? value : stripDiacritics(value));
    doc.setFontSize(16);
    doc.text(text(SCHOOL_NAME), 14, 14);
    doc.setFontSize(12);
    doc.text(text('Control de asistencia'), 14, 21);
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(text(report.description), 14, 27);
    doc.text(text(`Presentes: ${report.stats.present}   Retardos: ${report.stats.late}   Ausentes: ${report.stats.absent}   Pendientes: ${report.stats.pending}   Asistencia: ${report.stats.attendanceRate}%`), 14, 33);
    doc.setTextColor(20);

    autoTable(doc, {
      startY: 38,
      head: [['Matrícula', 'Nombre', 'Nivel', 'Grado', 'Grupo', 'Entrada', 'Estado', 'Método']],
      body: report.rows.map((row) => [
        text(row.student.enrollment),
        text(row.student.fullName),
        text(row.student.levelName),
        text(row.student.gradeName),
        text(row.student.groupName),
        row.checkInTime ? text(formatTime(row.checkInTime)) : '—',
        text(STATUS_LABEL[row.status]),
        row.method ?? '—',
      ]),
      styles: { font, fontSize: 9, cellPadding: 2.2, textColor: [28, 43, 57] },
      headStyles: { fillColor: [20, 61, 92], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [244, 247, 251] },
      columnStyles: {
        5: { cellWidth: 22 },
        6: { cellWidth: 24 },
      },
      didParseCell: (hook) => {
        if (hook.section !== 'body' || hook.column.index !== 6) {
          return;
        }
        const status = report.rows[hook.row.index]?.status;
        hook.cell.styles.textColor = statusColor(status);
      },
      margin: { top: 16, right: 12, bottom: 14, left: 14 },
    });

    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      doc.setFont(font, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(94);
      doc.text(text(`Página ${page} de ${pages}`), doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 8, {
        align: 'right',
      });
    }

    doc.save(`asistencia-${report.date}.pdf`);
  }

  private async registerFonts(doc: jsPDF): Promise<boolean> {
    try {
      if (!this.regularFont) {
        this.regularFont = await loadFont('/fonts/IBMPlexSans-Regular.ttf');
        this.boldFont = await loadFont('/fonts/IBMPlexSans-SemiBold.ttf');
      }
      doc.addFileToVFS('IBMPlexSans-Regular.ttf', this.regularFont);
      doc.addFont('IBMPlexSans-Regular.ttf', 'IBMPlexSans', 'normal');
      if (this.boldFont) {
        doc.addFileToVFS('IBMPlexSans-SemiBold.ttf', this.boldFont);
        doc.addFont('IBMPlexSans-SemiBold.ttf', 'IBMPlexSans', 'bold');
      }
      return true;
    } catch {
      return false;
    }
  }
}

function statusColor(status: AttendanceStatus | undefined): [number, number, number] {
  switch (status) {
    case 'PRESENTE':
      return [21, 122, 69];
    case 'RETARDO':
      return [138, 90, 0];
    case 'AUSENTE':
      return [180, 35, 24];
    default:
      return [95, 107, 122];
  }
}

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace('º', 'o');
}

async function loadFont(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('No se encontró la fuente del reporte.');
  }
  const buffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}
