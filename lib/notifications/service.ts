import { NOTIFICATION_TEMPLATES } from './templates';
import { NotificationChannel, PatientLanguage } from '@/types/medical-practice';

export class NotificationService {
  constructor() {
    // Mock constructor
    console.log('Notification service initialized in mock mode');
  }

  async sendNotification(notification: any) {
    const appointmentType = notification.appointment.type;
    const templates = NOTIFICATION_TEMPLATES[appointmentType];
    if (!templates) {
      throw new Error(`No templates found for appointment type: ${appointmentType}`);
    }

    const templateSet = templates['reminder'];
    if (!templateSet) {
      throw new Error('Reminder template not found');
    }

    const patientLanguage = notification.appointment.patient.language || PatientLanguage.GERMAN;
    const template = templateSet[patientLanguage];
    if (!template) {
      throw new Error(`Template not found for language: ${patientLanguage}`);
    }

    const content = this.replaceVariables(template.body, {
      patientName: notification.appointment.patient.name,
      time: new Date(notification.appointment.start_time).toLocaleTimeString(
        patientLanguage === PatientLanguage.ENGLISH ? 'en-US' : 'de-DE',
        { hour: '2-digit', minute: '2-digit' }
      )
    });

    if (notification.channel === NotificationChannel.SMS) {
      await this.sendSMS({
        to: notification.appointment.patient.phone,
        body: content
      });
    } else {
      await this.sendEmail({
        to: notification.appointment.patient.email,
        subject: template.subject,
        html: content
      });
    }
  }

  private replaceVariables(template: string, variables: Record<string, string>) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '');
  }

  private async sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    // Mock email sending
    console.log('Mock: Sending email', { to, subject, html });
  }

  private async sendSMS({ to, body }: { to: string; body: string }) {
    // Mock SMS sending
    console.log('Mock: Sending SMS', { to, body });
  }
}
