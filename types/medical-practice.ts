export enum NotificationChannel {
  EMAIL = "EMAIL",
  SMS = "SMS",
  DASHBOARD = "DASHBOARD",
}

export enum PatientLanguage {
  GERMAN = "german",
  ENGLISH = "english",
}

export enum PracticeRole {
  ADMIN = "ADMIN",
  DOCTOR = "DOCTOR",
  NURSE = "NURSE",
  RECEPTIONIST = "RECEPTIONIST",
}

export enum AppointmentStatus {
  SCHEDULED = "SCHEDULED",
  CONFIRMED = "CONFIRMED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  NO_SHOW = "NO_SHOW",
}

export enum AppointmentType {
  CONSULTATION = "CONSULTATION",
  FOLLOWUP = "FOLLOWUP",
  SURGERY = "SURGERY",
  CHECKUP = "CHECKUP",
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface WorkingHours {
  start: string; // Format: "HH:mm"
  end: string; // Format: "HH:mm"
  break?: {
    start: string;
    end: string;
  };
}

export interface DailySchedule {
  [key: string]: WorkingHours | null; // null means practice is closed
}

export interface MedicalPractice {
  id: string;
  name: string;
  address: Address;
  phone: string;
  email: string;
  website?: string;
  taxId?: string;
  licenseNumber?: string;
  preferredNotificationChannels: NotificationChannel[];
  workingHours: {
    [day: string]: WorkingHours | null;
  };
  holidays: string[]; // Array of ISO date strings
  specialties: string[];
  languages: PatientLanguage[];
}

export interface PracticeMember {
  id: string;
  practiceId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: PracticeRole;
  specialties?: string[];
  languages: PatientLanguage[];
  workingHours: DailySchedule;
  active: boolean;
  startDate: string;
  endDate?: string;
}

export interface PracticeSettings {
  notificationDefaults: {
    [key: string]: {
      channels: NotificationChannel[];
      templates: {
        [channel in NotificationChannel]?: string;
      };
    };
  };
  appointmentDurations: {
    [key in AppointmentType]: number; // Duration in minutes
  };
  workingHours: DailySchedule;
  timeSlotInterval: number; // Minutes between appointment slots
  maxAdvanceBooking: number; // Days
  cancelationPolicy: {
    deadline: number; // Hours before appointment
    fee?: number;
  };
}

export interface CreateAppointmentRequest {
  practiceId: string;
  doctorId: string;
  patientId: string;
  type: AppointmentType;
  status: AppointmentStatus;
  startTime: string; // ISO date string
  duration: number; // Minutes
  notes?: string;
  recurring?: {
    frequency: "daily" | "weekly" | "monthly";
    count: number;
  };
}

export interface AppointmentFormData extends CreateAppointmentRequest {
  patient_email?: string;
  patient_language: PatientLanguage;
  notes?: string;
}

export interface Appointment extends CreateAppointmentRequest {
  id: string;
  createdAt: string;
  updatedAt: string;
  canceledAt?: string;
  cancelationReason?: string;
  reminder: {
    sent: boolean;
    channels: NotificationChannel[];
    lastSentAt?: string;
  };
}

export interface PracticeNotificationSettings {
  [key: string]: {
    enabled: boolean;
    channels: NotificationChannel[];
    timing: {
      before?: number; // hours before event
      after?: number; // hours after event
    };
    templates: {
      [channel in NotificationChannel]?: {
        [language in PatientLanguage]: string;
      };
    };
  };
}

// Add procedure-related types
type ProcedureInfo = {
  duration: number;
  timeSlots: string[];
  requiredStaff: string[];
  equipment: string[];
};

type ConsultationType = {
  duration: number;
  timeSlots: string[];
  requiredStaff?: string[];
  equipment?: string[];
};

type SurgicalProcedures = {
  "Deep Plane Facelift": ProcedureInfo;
  "Mini Facelift": ProcedureInfo;
};

type MinimalProcedures = {
  "Botox": ProcedureInfo;
};

export const PROCEDURE_TYPES = {
  surgery: {
    "Deep Plane Facelift": {
      duration: 240,
      timeSlots: ['08:00'],
      requiredStaff: ['surgeon', 'anesthesiologist', 'nurse'],
      equipment: ['PTL Kit', 'Standard Surgery Set']
    },
    "Mini Facelift": {
      duration: 180,
      timeSlots: ['08:00', '13:00'],
      requiredStaff: ['surgeon', 'nurse'],
      equipment: ['Standard Surgery Set']
    }
  } as SurgicalProcedures,
  minimal: {
    "Botox": {
      duration: 30,
      timeSlots: ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30'],
      requiredStaff: ['doctor'],
      equipment: ['Botox Kit']
    }
  } as MinimalProcedures,
  consultation: {
    duration: 30,
    timeSlots: ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30']
  } as ConsultationType
} as const;

export type ProcedureTypes = typeof PROCEDURE_TYPES;
