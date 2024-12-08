export enum SurgeryStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PREPARATION = 'IN_PREPARATION',
  READY = 'READY',
  BLOCKED = 'BLOCKED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  CONSULTATION_COMPLETED = 'CONSULTATION_COMPLETED', // Add this
}

export enum PTLType {
  TYPE_1 = 'TYPE_1',
  TYPE_2 = 'TYPE_2',
  TYPE_3 = 'TYPE_3'
}

export interface Surgery {
  id: string;
  patientId: string;
  surgeryDate: Date;
  ptlType: PTLType;
  currentStatus: SurgeryStatus;
  location: string;
  surgeonId: string;
  anesthesiologistId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SurgeryRequirement {
  id: string;
  surgeryId: string;
  type: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  completedAt?: Date;
  notes?: string;
}

export interface SurgeryStatusLog {
  id: string;
  surgeryId: string;
  previousStatus: SurgeryStatus;
  newStatus: SurgeryStatus;
  changedBy: string;
  reason?: string;
  timestamp: Date;
}
