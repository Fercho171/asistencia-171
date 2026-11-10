import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { environment } from '../../environments/environment';
import { AttendanceHttpRepository } from './services/attendance-http.repository';
import { AttendanceMockRepository } from './services/attendance-mock.repository';
import { AttendanceRepository } from './services/attendance.repository';

export function provideAttendance(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: AttendanceRepository,
      useClass: environment.useMockApi ? AttendanceMockRepository : AttendanceHttpRepository,
    },
  ]);
}
