export type AppointmentType = 'surgery' | 'minimal' | 'consultation';

export interface Appointment {
  id: string;
  patient_name: string;
  patient_phone: string;
  appointment_type: AppointmentType;
  procedure: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  surgeon_id: string;
  notes: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
}

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
  },
  minimal: {
    "Botox": {
      duration: 30,
      timeSlots: ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30'],
      requiredStaff: ['doctor'],
      equipment: ['Botox Kit']
    }
  },
  consultation: {
    duration: 30,
    timeSlots: ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30']
  }
};