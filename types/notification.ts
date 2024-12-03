export enum NotificationType {
  EMAIL = "EMAIL",
  SMS = "SMS",
  DASHBOARD = "DASHBOARD",
}

export enum NotificationStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED",
}

export enum Priority {
  URGENT = "URGENT",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
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

export interface NotificationRule {
  days: number;
  channels: NotificationType[];
}

export const NOTIFICATION_RULES: Record<string, NotificationRule> = {
  UPCOMING_SURGERY: {
    days: 7,
    channels: [NotificationType.EMAIL, NotificationType.SMS],
  },
  SURGERY_FOLLOWUP: {
    days: 1,
    channels: [NotificationType.EMAIL],
  },
  CONSULTATION_REMINDER: {
    days: 2,
    channels: [NotificationType.SMS],
  },
};
