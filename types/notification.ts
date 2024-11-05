export enum NotificationType {
  EMAIL = "EMAIL",
  SMS = "SMS",
  DASHBOARD = "DASHBOARD"
}

export enum NotificationStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED"
}

export enum Priority {
  URGENT = "URGENT",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW"
}

export interface Notification {
  id: string;
  type: NotificationType;
  priority: Priority;
  recipients: string[];
  message: string;
  status: NotificationStatus;
  sent_at: string;
  error_message?: string;
  created_at: string;
}