import { supabaseAdmin } from '@/lib/supabase';
import { addHours, isPast } from 'date-fns';
import { NotificationService } from '../notifications/service';

export class SurgeryReportService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  async checkOverdueReports() {
    try {
      // Get all pending reports that are overdue
      const { data: overdueReports, error } = await supabaseAdmin
        .from('surgery_report_requirements')
        .select(`
          *,
          surgeon:doctors(*)
        `)
        .eq('status', 'PENDING')
        .lt('report_due_date', new Date().toISOString());

      if (error) throw error;

      // Update status and send notifications
      for (const report of overdueReports) {
        // Update status to overdue
        await supabaseAdmin
          .from('surgery_report_requirements')
          .update({
            status: 'OVERDUE',
            updated_at: new Date().toISOString()
          })
          .eq('id', report.id);

        // Send notification to surgeon
        await this.notificationService.sendNotification({
          recipient: report.surgeon.email,
          type: 'SURGERY_REPORT_OVERDUE',
          channels: ['email', 'sms'],
          data: {
            surgeryId: report.surgery_id,
            dueDate: report.report_due_date,
            patientId: report.patient_id
          }
        });
      }
    } catch (error) {
      console.error('Error checking overdue reports:', error);
      throw error;
    }
  }

  async sendReminders() {
    try {
      // Get pending reports due within next 24 hours
      const { data: upcomingReports, error } = await supabaseAdmin
        .from('surgery_report_requirements')
        .select(`
          *,
          surgeon:doctors(*)
        `)
        .eq('status', 'PENDING')
        .lt('report_due_date', addHours(new Date(), 24).toISOString())
        .gt('report_due_date', new Date().toISOString())
        .is('last_reminder_sent', null);

      if (error) throw error;

      // Send reminders
      for (const report of upcomingReports) {
        await this.notificationService.sendNotification({
          recipient: report.surgeon.email,
          type: 'SURGERY_REPORT_REMINDER',
          channels: ['email'],
          data: {
            surgeryId: report.surgery_id,
            dueDate: report.report_due_date,
            patientId: report.patient_id,
            hoursRemaining: Math.ceil(
              (new Date(report.report_due_date).getTime() - new Date().getTime()) / 
              (1000 * 60 * 60)
            )
          }
        });

        // Update reminder count and timestamp
        await supabaseAdmin
          .from('surgery_report_requirements')
          .update({
            reminder_count: report.reminder_count + 1,
            last_reminder_sent: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', report.id);
      }
    } catch (error) {
      console.error('Error sending report reminders:', error);
      throw error;
    }
  }

  async getPendingReports(surgeonId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('surgery_report_requirements')
        .select(`
          *,
          surgery:surgeries(*),
          patient:profiles(*)
        `)
        .eq('surgeon_id', surgeonId)
        .eq('status', 'PENDING')
        .order('report_due_date', { ascending: true });

      if (error) throw error;

      return data.map(report => ({
        ...report,
        isOverdue: isPast(new Date(report.report_due_date))
      }));
    } catch (error) {
      console.error('Error fetching pending reports:', error);
      throw error;
    }
  }
}