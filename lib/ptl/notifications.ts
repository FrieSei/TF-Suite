import { supabaseAdmin } from '@/lib/supabase';
import { NotificationService } from '@/lib/notifications/service';
import { addDays, differenceInDays } from 'date-fns';
import { Surgery, ConsultationStatus, SurgeryStatus } from '@/types/ptl-surgery';

const notificationService = new NotificationService();

export async function triggerConsultationNotifications(): Promise<void> {
  const today = new Date();
  const twoWeeksFromNow = addDays(today, 14);

  // Get all surgeries in the next 14 days
  const { data: surgeries, error } = await supabaseAdmin
    .from('ptl_surgeries')
    .select(`
      *,
      patient:profiles!patient_id(*)
    `)
    .gte('surgery_date', today.toISOString())
    .lte('surgery_date', twoWeeksFromNow.toISOString())
    .neq('surgery_status', SurgeryStatus.BLOCKED);

  if (error) throw error;

  for (const surgery of surgeries) {
    await processSurgeryNotifications(surgery);
  }
}

async function processSurgeryNotifications(surgery: Surgery): Promise<void> {
  const daysToSurgery = differenceInDays(new Date(surgery.surgeryDate), new Date());

  // Initial notification at Day -14
  if (daysToSurgery === 14 && surgery.consultationStatus === ConsultationStatus.NOT_SCHEDULED) {
    await sendNotification({
      surgeryId: surgery.id,
      type: 'EMAIL',
      priority: 'HIGH',
      recipients: await getBackOfficeStaff(),
      message: `Schedule consultation for ${surgery.patient.name} - Surgery Date: ${surgery.surgeryDate}`
    });
  }

  // Urgent notification at Day -13 if not scheduled
  if (daysToSurgery === 13 && surgery.consultationStatus === ConsultationStatus.NOT_SCHEDULED) {
    await sendNotification({
      surgeryId: surgery.id,
      type: 'DASHBOARD',
      priority: 'URGENT',
      recipients: await getBackOfficeStaffAndManagers(),
      message: `URGENT: Consultation not scheduled - Surgery at risk for ${surgery.patient.name}`
    });

    await sendNotification({
      surgeryId: surgery.id,
      type: 'SMS',
      priority: 'URGENT',
      recipients: await getBackOfficeStaffAndManagers(),
      message: `URGENT: PTL consultation not scheduled for ${surgery.patient.name}`
    });
  }

  // Block surgery if consultation not completed within 3 days
  if (daysToSurgery <= 3 && surgery.consultationStatus !== ConsultationStatus.COMPLETED) {
    await supabaseAdmin
      .from('ptl_surgeries')
      .update({
        surgery_status: SurgeryStatus.BLOCKED,
        updated_at: new Date().toISOString()
      })
      .eq('id', surgery.id);

    await sendNotification({
      surgeryId: surgery.id,
      type: 'EMAIL',
      priority: 'URGENT',
      recipients: await getAllRelevantStaff(surgery),
      message: `SURGERY BLOCKED: Consultation requirements not met for ${surgery.patient.name}`
    });
  }
}

async function sendNotification(notification: {
  surgeryId: string;
  type: 'EMAIL' | 'SMS' | 'DASHBOARD';
  priority: 'HIGH' | 'URGENT' | 'NORMAL';
  recipients: string[];
  message: string;
}): Promise<void> {
  // Log notification
  const { error } = await supabaseAdmin
    .from('ptl_notification_logs')
    .insert({
      surgery_id: notification.surgeryId,
      type: notification.type,
      priority: notification.priority,
      recipients: notification.recipients,
      message: notification.message,
      status: 'SENT',
      sent_at: new Date().toISOString()
    });

  if (error) throw error;

  // Send actual notification
  if (notification.type === 'EMAIL') {
    await notificationService.sendEmail({
      to: notification.recipients,
      subject: `PTL Surgery Notification - ${notification.priority}`,
      html: notification.message
    });
  } else if (notification.type === 'SMS') {
    for (const recipient of notification.recipients) {
      await notificationService.sendSMS({
        to: recipient,
        body: notification.message
      });
    }
  }
}

async function getBackOfficeStaff(): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('role', 'staff');
  
  return data?.map(staff => staff.email) || [];
}

async function getBackOfficeStaffAndManagers(): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .in('role', ['staff', 'admin']);
  
  return data?.map(staff => staff.email) || [];
}

async function getAllRelevantStaff(surgery: Surgery): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .in('role', ['staff', 'admin', 'surgeon']);
  
  return data?.map(staff => staff.email) || [];
}