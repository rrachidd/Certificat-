export interface InstitutionSettings {
  name: string;
  academy: string;
  province: string;
  refNumber: string;
  phone?: string;
  address?: string;
  managerName?: string;
  city?: string;
}

export interface ArchiveRecord {
  id?: string;
  studentName: string;
  regNum: string;
  certNumber: string;
  certYear: string;
  issuedAt: string;
  level: string;
}

export interface Student {
  _id: number;
  regNum: string;
  firstName: string;
  lastName: string;
  name?: string; // fallback
  birthDate: string;
  birthPlace: string;
  level: string;
  yearFrom: string;
  yearTo: string;
  reason: string;
  _lv: string;
}
