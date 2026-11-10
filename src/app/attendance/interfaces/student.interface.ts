export interface EducationLevel {
  id: string;
  name: string;
}

export interface Grade {
  id: string;
  levelId: string;
  name: string;
  order: number;
}

export interface SchoolGroup {
  id: string;
  gradeId: string;
  name: string;
}

export interface SchoolCatalog {
  levels: EducationLevel[];
  grades: Grade[];
  groups: SchoolGroup[];
}

export interface Student {
  id: string;
  enrollment: string;
  qrCode: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  fullName: string;
  photoUrl: string | null;
  levelId: string;
  levelName: string;
  gradeId: string;
  gradeName: string;
  groupId: string;
  groupName: string;
  active: boolean;
}
