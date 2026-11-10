# Control de asistencia escolar

Pantalla administrativa para registrar y consultar la asistencia diaria de alumnos mediante códigos QR.

## Arranque

```bash
npm start
```

La aplicación queda en `http://localhost:4200`.

## Qué puede hacer el personal

- Ver indicadores del día: inscritos, presentes, ausentes, retardos y porcentaje de asistencia.
- Filtrar por fecha, nivel, grado, grupo, nombre y estado.
- Elegir un grado y grupo para ver solo a sus alumnos.
- Escanear un QR con la cámara o capturar la matrícula con un lector externo.
- Consultar la ficha y el historial de un alumno.
- Exportar la consulta visible a Excel o PDF.
- Ajustar la hora de entrada, la tolerancia de retardo y el cierre de asistencia.

## Datos de demostración

No hay un backend publicado. `environment.useMockApi` está en `true` y un repositorio local, separado de la pantalla, simula los alumnos. Para usar HTTP, cambie esa bandera a `false`. Las peticiones salen hacia `/api` con estos endpoints provisionales:

- `GET /attendance/daily`
- `GET /attendance/grade/{gradeId}`
- `GET /attendance/group/{groupId}`
- `POST /attendance/qr/check-in`
- `GET /attendance/student/{studentId}`
- `GET /attendance/report`

El contrato todavía no está definido. El adaptador que habrá que ajustar está en `src/app/attendance/services/attendance-http.repository.ts`.

En el escáner, la sección **Matrículas de prueba** permite registrar una entrada sin imprimir códigos. El QR de cada alumno contiene su matrícula y también se muestra en la ficha.
