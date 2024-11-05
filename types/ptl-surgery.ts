import { Surgery, SurgeryStatus, PTLType } from './surgery-core';

export enum ConsultationStatus {
  NOT_SCHEDULED = 'NOT_SCHEDULED',
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED'
}

export enum PTLSurgeryStatus {
  PENDING_CONSULTATION = 'PENDING_CONSULTATION',
  CONSULTATION_COMPLETED = 'CONSULTATION_COMPLETED',
  READY_FOR_SURGERY = 'READY_FOR_SURGERY',
  BLOCKED = 'BLOCKED'
}

export interface PTLSurgery extends Surgery {
  consultationStatus: ConsultationStatus;
  consultationDate?: Date;
  consultationCompletionDate?: Date;
  ptlSurgeryStatus: PTLSurgeryStatus;
  lastNotificationDate?: Date;
  notificationHistory: PTLNotificationLog[];
}

export interface PTLConsultation {
  id: string;
  surgeryId: string;
  patientId: string;
  scheduledDate: Date;
  status: ConsultationStatus;
  completedDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PTLNotificationLog {
  id: string;
  surgeryId: string;
  type: 'EMAIL' | 'SMS' | 'DASHBOARD';
  priority: 'HIGH' | 'URGENT' | 'NORMAL';
  recipients: string[];
  message: string;
  sentAt: Date;
  status: 'SENT' | 'FAILED';
  error?: string;
}

export interface PTLRequirement extends SurgeryRequirement {
  consultationId?: string;
  requiredDaysBeforeSurgery: number;
}