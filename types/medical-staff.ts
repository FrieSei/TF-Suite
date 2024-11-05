export interface Doctor {
  id: string;
  name: string;
  role: 'SURGEON' | 'ANESTHESIOLOGIST';
  calendarId: string;
  defaultLocation: string;
  specializations?: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffAvailability {
  doctorId: string;
  available: boolean;
  conflicts?: {
    start: string;
    end: string;
    reason: string;
  }[];
}