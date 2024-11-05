// Previous types remain unchanged...

export enum PatientLanguage {
  GERMAN = 'german',
  ENGLISH = 'english'
}

export interface AppointmentFormData extends CreateAppointmentRequest {
  patient_email?: string;
  patient_language: PatientLanguage;
  notes?: string;
}

// Rest of the types remain unchanged...