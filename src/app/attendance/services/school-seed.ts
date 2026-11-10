import { SchoolCatalog, Student } from '../interfaces/student.interface';
import { AttendanceRecord } from '../interfaces/attendance.interface';
import { hashString, previousSchoolDays } from './attendance-rules';

const FIRST_NAMES = [
  'Valentina', 'Santiago', 'Regina', 'Mateo', 'Camila', 'Emiliano', 'Mariana', 'Diego',
  'Ximena', 'Sebastián', 'Renata', 'Leonardo', 'Fernanda', 'Iker', 'Sofía', 'Gael',
  'Ana Paula', 'Nicolás', 'María José', 'Dylan', 'Andrea', 'Daniela', 'Emilio', 'Paula',
  'Javier', 'Isabel', 'Tomás', 'Elena', 'Hugo', 'Natalia', 'Andrés', 'Carmen',
  'Rodrigo', 'Lucía', 'Martín', 'Alejandra', 'Pablo', 'Jimena', 'Bruno', 'Olivia',
  'Thiago', 'Mía',
];

const LAST_NAMES = [
  'García', 'Hernández', 'López', 'Martínez', 'González', 'Rodríguez', 'Pérez', 'Sánchez',
  'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Morales',
  'Reyes', 'Gutiérrez', 'Ortiz', 'Ramos', 'Vargas', 'Castillo', 'Jiménez', 'Romero',
  'Navarro', 'Mendoza', 'Aguilar', 'Vega', 'Castro', 'Ruiz', 'Chávez', 'Guerrero',
  'Delgado', 'Ríos', 'Salazar', 'Paredes', 'Ibarra', 'Cervantes', 'Mejía', 'Acosta',
];

const INACTIVE_INDEXES = new Set([7, 53, 101, 149]);
const STUDENTS_PER_GROUP = 14;

export function buildCatalog(): SchoolCatalog {
  const levels = [
    { id: 'secundaria', name: 'Secundaria' },
  ];
  const grades = levels.flatMap((level) =>
    [1, 2, 3].map((order) => ({
      id: `${level.id}-${order}`,
      levelId: level.id,
      name: `${order}.º grado`,
      order,
    })),
  );
  const groups = grades.flatMap((grade) =>
    ['A', 'B', 'C', 'D'].map((name) => ({
      id: `${grade.id}-${name.toLowerCase()}`,
      gradeId: grade.id,
      name,
    })),
  );
  return { levels, grades, groups };
}

export function buildStudents(catalog: SchoolCatalog, today: string): Student[] {
  const year = today.slice(0, 4);
  const usedNames = new Set<string>();
  const students: Student[] = [];
  const total = catalog.groups.length * STUDENTS_PER_GROUP;

  for (let index = 0; index < total; index += 1) {
    const group = catalog.groups[index % catalog.groups.length];
    const grade = catalog.grades.find((item) => item.id === group.gradeId)!;
    const level = catalog.levels.find((item) => item.id === grade.levelId)!;
    const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
    const paternalLastName = LAST_NAMES[(index * 3) % LAST_NAMES.length];
    let maternalOffset = (index * 7 + 5) % LAST_NAMES.length;
    let maternalLastName = LAST_NAMES[maternalOffset];
    let fullName = `${firstName} ${paternalLastName} ${maternalLastName}`;
    while (usedNames.has(fullName) || maternalLastName === paternalLastName) {
      maternalOffset = (maternalOffset + 1) % LAST_NAMES.length;
      maternalLastName = LAST_NAMES[maternalOffset];
      fullName = `${firstName} ${paternalLastName} ${maternalLastName}`;
    }
    usedNames.add(fullName);
    const enrollment = `A${year}${String(index + 1).padStart(4, '0')}`;
    students.push({
      id: `stu-${index + 1}`,
      enrollment,
      qrCode: enrollment,
      firstName,
      paternalLastName,
      maternalLastName,
      fullName,
      photoUrl: null,
      levelId: level.id,
      levelName: level.name,
      gradeId: grade.id,
      gradeName: grade.name,
      groupId: group.id,
      groupName: group.name,
      active: !INACTIVE_INDEXES.has(index),
    });
  }

  return students;
}

export function buildRecords(students: Student[], today: string): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const dates = [today, ...previousSchoolDays(today, 8)];

  for (const date of dates) {
    for (const student of students) {
      if (!student.active) {
        continue;
      }
      const roll = hashString(`${student.id}:${date}`) % 100;
      const presentCutoff = date === today ? 58 : 80;
      const lateCutoff = date === today ? 73 : 90;
      if (roll >= lateCutoff) {
        continue;
      }
      const onTime = roll < presentCutoff;
      const minutes = onTime ? 7 * 60 + 35 + (roll % 36) : 8 * 60 + 16 + (roll % 40);
      records.push({
        id: `${student.id}-${date}`,
        studentId: student.id,
        date,
        checkInTime: toLocalIso(date, minutes, roll % 50),
        method: 'QR',
      });
    }
  }

  return records;
}

function toLocalIso(date: string, minutesFromMidnight: number, seconds: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  return new Date(year, month - 1, day, hours, minutes, seconds).toISOString();
}
