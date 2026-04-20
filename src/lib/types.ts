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

export interface Student {
  _id: number;
  regNum: string;
  name: string;
  birthDate: string;
  birthPlace: string;
  level: string;
  yearFrom: string;
  yearTo: string;
  reason: string;
  _lv: string;
}
