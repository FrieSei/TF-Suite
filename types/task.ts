export enum TaskType {
  CONSULTATION = 'CONSULTATION',
  BLOODWORK = 'BLOODWORK',
  EQUIPMENT_CHECK = 'EQUIPMENT_CHECK',
  PRESCRIPTIONS = 'PRESCRIPTIONS',
  PATIENT_INSTRUCTIONS = 'PATIENT_INSTRUCTIONS',
  ANESTHESIA_CLEARANCE = 'ANESTHESIA_CLEARANCE',
  SURGICAL_PLANNING = 'SURGICAL_PLANNING'
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
  OVERDUE = 'OVERDUE'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface NotificationConfig {
  type: 'EMAIL' | 'SMS' | 'SYSTEM'
  triggerDays: number
  recipients: string[]
  template: string
}

export interface Task {
  id: string
  surgeryId: string
  type: TaskType
  title: string
  description: string
  dueDate: Date
  status: TaskStatus
  priority: TaskPriority
  assignedTo: string
  dependencies: string[]
  notifications: NotificationConfig[]
  completedAt?: Date
  completedBy?: string
  notes?: string
  created_at: Date
  updated_at: Date
}

export interface TaskTemplate {
  type: TaskType
  title: string
  description: string
  daysBeforeSurgery: number
  priority: TaskPriority
  dependencies: TaskType[]
  notifications: NotificationConfig[]
  requiredRole: string[]
}