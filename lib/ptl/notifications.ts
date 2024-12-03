import { supabaseAdmin } from '@/lib/supabase';
import { NotificationService } from '@/lib/notifications/service';
import { addDays, differenceInDays } from 'date-fns';
import { PTLSurgery, ConsultationStatus } from '@/types/ptl-surgery';
import { Surgery, SurgeryStatus } from '@/types/surgery-core';

const notificationService = new NotificationService();

/**
 * Trigger notifications related to consultations.
 */
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

  for (const surgery of surgeries as PTLSurgery[]) {
    await processSurgeryNotifications(surgery);
  }
}

/**
 * Process individual surgery notifications based on its status and timeline.
 * @param surgery - The PTL surgery record.
 */
async function processSurgeryNotifications(surgery: PTLSurgery): Promise<void> {
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
