import { addHours, isBefore } from 'date-fns';
import { supabaseAdmin } from '@/lib/supabase';
import { NOTIFICATION_RULES } from '@/types/notification';
import { NotificationService } from './service';

export class NotificationScheduler {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  async scheduleAppointmentReminders(appointment: any) {
    const rules = NOTIFICATION_RULES[appointment.event_type.code];
    if (!rules) return;

    const startTime = new Date(appointment.start_time);

    for (const reminder of rules.reminders) {
      const sendAt = addHours(startTime, -reminder.hours);
      
      // Don't schedule if send time is in the past
      if (isBefore(sendAt, new Date())) continue;

      // Create notification records
      for (const channel of reminder.channels) {
        await supabaseAdmin
          .from('notifications')
          .insert({
            appointment_id: appointment.id,
            patient_id: appointment.patient_id,
            channel,
            template_id: reminder.templateId,
            status: 'pending',
            scheduled_for: sendAt.toISOString(),
            created_at: new Date().toISOString()
          });
      }
    }
  }

  async processScheduledNotifications() {
    const now = new Date();
    const endTime = addHours(now, 1); // Process next hour's notifications

    // Get pending notifications
    const { data: notifications, error } = await supabaseAdmin
      .from('notifications')
      .select(`
        *,
        appointment:appointments(
          *,
          patient:patients(*),
          surgeon:doctors(*),
          event_type:event_types(*)
        )
      `)
      .eq('status', 'pending')
      .gte('scheduled_for', now.toISOString())
      .lte('scheduled_for', endTime.toISOString());

    if (error) throw error;

    // Process each notification
    for (const notification of notifications || []) {
      try {
        await this.notificationService.sendNotification(notification);

        // Update status to sent
        await supabaseAdmin
          .from('notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', notification.id);
      } catch (error) {
        console.error(`Failed to send notification ${notification.id}:`, error);
        
        // Update status to failed
        await supabaseAdmin
          .from('notifications')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', notification.id);
      }
    }
  }
}