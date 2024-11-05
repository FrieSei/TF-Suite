import { supabaseAdmin } from '@/lib/supabase';

export class ReferenceService {
  async addReference(
    noteId: string,
    referenceType: 'APPOINTMENT' | 'NOTE',
    targetId: string,
    userId: string
  ) {
    try {
      const { error } = await supabaseAdmin
        .from('note_references')
        .insert({
          note_id: noteId,
          [referenceType === 'APPOINTMENT' ? 'appointment_id' : 'related_note_id']: targetId,
          reference_type: referenceType,
          created_by: userId
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding reference:', error);
      throw error;
    }
  }

  async getRelatedAppointments(noteId: string) {
    try {
      const { data, error } = await supabaseAdmin.rpc(
        'get_patient_references',
        {
          p_note_id: noteId,
          p_reference_type: 'APPOINTMENT'
        }
      );

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching related appointments:', error);
      throw error;
    }
  }

  async getRelatedNotes(appointmentId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('note_references')
        .select(`
          note:patient_clinical_notes(
            *,
            surgeon:doctors(*)
          )
        `)
        .eq('appointment_id', appointmentId);

      if (error) throw error;

      return data.map(ref => ref.note);
    } catch (error) {
      console.error('Error fetching related notes:', error);
      throw error;
    }
  }

  async getPatientHistory(patientId: string) {
    try {
      const { data, error } = await supabaseAdmin.rpc(
        'get_patient_history',
        { p_patient_id: patientId }
      );

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching patient history:', error);
      throw error;
    }
  }
}