import { addDays, isBefore } from 'date-fns';
import { supabaseAdmin } from '@/lib/supabase';
import { ConsultationStatus, SurgeryStatus, Surgery } from '@/types/ptl-surgery';

export async function checkConsultationRequirement(surgeryId: string): Promise<boolean> {
  const { data: surgery, error } = await supabaseAdmin
    .from('ptl_surgeries')
    .select('*')
    .eq('id', surgeryId)
    .single();

  if (error || !surgery) {
    throw new Error('Surgery not found');
  }

  // Check if consultation is completed
  if (surgery.consultation_status !== ConsultationStatus.COMPLETED) {
    return false;
  }

  // Check if consultation was completed at least 3 days before surgery
  const minCompletionDate = addDays(new Date(surgery.surgery_date), -3);
  return isBefore(new Date(surgery.consultation_completion_date), minCompletionDate);
}

export async function validateSurgeryReadiness(surgeryId: string): Promise<SurgeryStatus> {
  const { data: surgery, error } = await supabaseAdmin
    .from('ptl_surgeries')
    .select('*')
    .eq('id', surgeryId)
    .single();

  if (error || !surgery) {
    throw new Error('Surgery not found');
  }

  // Check if surgery should be blocked
  if (surgery.consultation_status !== ConsultationStatus.COMPLETED &&
      isBefore(addDays(new Date(), 3), new Date(surgery.surgery_date))) {
    return SurgeryStatus.BLOCKED;
  }

  // Update surgery status based on consultation status
  if (surgery.consultation_status === ConsultationStatus.COMPLETED) {
    return SurgeryStatus.CONSULTATION_COMPLETED;
  }

  return SurgeryStatus.PENDING_CONSULTATION;
}

export async function updateSurgeryStatus(surgeryId: string, status: SurgeryStatus): Promise<void> {
  const { error } = await supabaseAdmin
    .from('ptl_surgeries')
    .update({ surgery_status: status, updated_at: new Date().toISOString() })
    .eq('id', surgeryId);

  if (error) {
    throw new Error('Failed to update surgery status');
  }
}