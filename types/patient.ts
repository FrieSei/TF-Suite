export enum SubmissionStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

export enum MedicationStatus {
  NONE = 'NONE',
  CURRENT = 'CURRENT',
  DISCONTINUED = 'DISCONTINUED',
  REQUIRES_ADJUSTMENT = 'REQUIRES_ADJUSTMENT'
}

export enum InstructionStatus {
  NOT_SENT = 'NOT_SENT',
  SENT = 'SENT',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  COMPLETED = 'COMPLETED'
}

export interface PatientRequirement {
  id: string
  surgeryId: string
  patientId: string
  bloodwork: {
    status: SubmissionStatus
    dueDate: Date
    submittedAt?: Date
    verifiedAt?: Date
    verifiedBy?: string
    results?: Record<string, any>
    notes?: string
  }
  ecg: {
    status: SubmissionStatus
    dueDate: Date
    submittedAt?: Date
    verifiedAt?: Date
    verifiedBy?: string
    results?: Record<string, any>
    notes?: string
  }
  medications: {
    status: MedicationStatus
    currentMedications: Array<{
      name: string
      dosage: string
      frequency: string
      status: MedicationStatus
      adjustmentNeeded?: boolean
      adjustmentNotes?: string
    }>
    lastReviewedAt?: Date
    reviewedBy?: string
    notes?: string
  }
  instructions: {
    status: InstructionStatus
    sentAt?: Date
    acknowledgedAt?: Date
    completedAt?: Date
    documents: Array<{
      type: string
      url: string
      sentAt: Date
      viewedAt?: Date
    }>
    notes?: string
  }
  created_at: Date
  updated_at: Date
}

export interface PatientProfile {
  id: string
  name: string
  dateOfBirth: Date
  gender: string
  contactInfo: {
    email: string
    phone: string
    preferredLanguage: string
    preferredContactMethod: string
  }
  emergencyContact: {
    name: string
    relationship: string
    phone: string
  }
  medicalHistory: {
    allergies: string[]
    conditions: string[]
    previousSurgeries: Array<{
      procedure: string
      date: Date
      notes?: string
    }>
    medications: Array<{
      name: string
      dosage: string
      frequency: string
      startDate: Date
      endDate?: Date
    }>
  }
  insuranceInfo?: {
    provider: string
    policyNumber: string
    groupNumber?: string
    validUntil: Date
  }
  created_at: Date
  updated_at: Date
}