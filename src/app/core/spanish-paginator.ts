import { MatPaginatorIntl } from '@angular/material/paginator';

export function createSpanishPaginator(): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();
  intl.itemsPerPageLabel = 'Alumnos por página';
  intl.nextPageLabel = 'Página siguiente';
  intl.previousPageLabel = 'Página anterior';
  intl.firstPageLabel = 'Primera página';
  intl.lastPageLabel = 'Última página';
  intl.getRangeLabel = (page, pageSize, length) => {
    if (length === 0 || pageSize === 0) {
      return `0 de ${length}`;
    }
    const start = page * pageSize;
    const end = Math.min(length, start + pageSize);
    return `${start + 1} – ${end} de ${length}`;
  };
  return intl;
}
