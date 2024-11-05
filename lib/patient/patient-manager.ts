import { supabaseAdmin } from '@/lib/supabase';
import { NotificationService } from '@/lib/notifications/service';
import { 
  PatientRequirement, 
  PatientProfile,
  SubmissionStatus,
  MedicationStatus,
  InstructionStatus 
} from '@/types/patient';
import { addDays, isBefore } from 'date-fns';

export class PatientManager {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  async trackSubmissions(patientId: string): Promise<PatientRequirement[]> {
    try {
      const { data: requirements, error } = await supabaseAdmin
        .from('patient_requirements')
        .select('*')
        .eq('patientId', patientId);

      if (error) throw error;

      // Update statuses based on due dates
      const updatedRequirements = requirements.map(req => {
        const now = new Date();
        if (isBefore(new Date(req.bloodwork.dueDate), now) && 
            req.bloodwork.status === SubmissionStatus.PENDING) {
          req.bloodwork.status = SubmissionStatus.EXPIRED;
        }
        if (isBefore(new Date(req.ecg.dueDate), now) && 
            req.ecg.status === SubmissionStatus.PENDING) {
          req.ecg.status = SubmissionStatus.EXPIRED;
        }
        return req;
      });

      // Update expired statuses in database
      const expiredReqs = updatedRequirements.filter(req => 
        req.bloodwork.status === SubmissionStatus.EXPIRED ||
        req.ecg.status === SubmissionStatus.EXPIRED
      );

      if (expiredReqs.length > 0) {
        await this.updateExpiredRequirements(expiredReqs);
      }

      return updatedRequirements;
    } catch (error) {
      console.error('Error tracking submissions:', error);
      throw error;
    }
  }

  async updatePatientStatus(
    patientId: string, 
    updates: Partial<PatientProfile>
  ): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('patients')
        .update({
          ...updates,
          updated_at: new Date()
        })
        .eq('id', patientId);

      if (error) throw error;

      // Check if medical history was updated
      if (updates.medicalHistory) {
        await this.reviewMedicationStatus(patientId);
      }
    } catch (error) {
      console.error('Error updating patient status:', error);
      throw error;
    }
  }

  async sendPatientInstructions(patientId: string, surgeryId: string): Promise<void> {
    try {
      // Get patient and surgery details
      const { data: patient, error: patientError } = await supabaseAdmin
        .from('patients')
        .select('*, surgeries!inner(*)')
        .eq('id', patientId)
        .eq('surgeries.id', surgeryId)
        .single();

      if (patientError) throw patientError;

      // Generate instruction documents
      const documents = await this.generateInstructionDocuments(patient);

      // Update requirements with new instructions
      const { error: updateError } = await supabaseAdmin
        .from('patient_requirements')
        .update({
          instructions: {
            status: InstructionStatus.SENT,
            sentAt: new Date(),
            documents
          },
          updated_at: new Date()
        })
        .eq('patientId', patientId)
        .eq('surgeryId', surgeryId);

      if (updateError) throw updateError;

      // Send notifications
      await this.notificationService.sendNotification({
        recipient: patient.contactInfo.email,
        type: 'INSTRUCTIONS',
        channels: ['email'],
        data: {
          patientName: patient.name,
          surgeryDate: patient.surgeries[0].date,
          documents
        }
      });
    } catch (error) {
      console.error('Error sending patient instructions:', error);
      throw error;
    }
  }

  async verifySubmission(
    requirementId: string,
    type: 'bloodwork' | 'ecg',
    verifiedBy: string,
    results?: Record<string, any>,
    notes?: string
  ): Promise<void> {
    try {
      const updates = {
        [`${type}.status`]: SubmissionStatus.VERIFIED,
        [`${type}.verifiedAt`]: new Date(),
        [`${type}.verifiedBy`]: verifiedBy,
        [`${type}.results`]: results,
        [`${type}.notes`]: notes,
        updated_at: new Date()
      };

      const { error } = await supabaseAdmin
        .from('patient_requirements')
        .update(updates)
        .eq('id', requirementId);

      if (error) throw error;
    } catch (error) {
      console.error('Error verifying submission:', error);
      throw error;
    }
  }

  private async updateExpiredRequirements(requirements: PatientRequirement[]): Promise<void> {
    try {
      const updates = requirements.map(req => ({
        id: req.id,
        bloodwork: {
          ...req.bloodwork,
          status: req.bloodwork.status
        },
        ecg: {
          ...req.ecg,
          status: req.ecg.status
        },
        updated_at: new Date()
      }));

      const { error } = await supabaseAdmin
        .from('patient_requirements')
        .upsert(updates);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating expired requirements:', error);
      throw error;
    }
  }

  private async reviewMedicationStatus(patientId: string): Promise<void> {
    try {
      const { data: patient, error } = await supabaseAdmin
        .from('patients')
        .select('medicalHistory')
        .eq('id', patientId)
        .single();

      if (error) throw error;

      const currentMedications = patient.medicalHistory.medications.map(med => ({
        ...med,
        status: med.endDate && isBefore(new Date(med.endDate), new Date())
          ? MedicationStatus.DISCONTINUED
          : MedicationStatus.CURRENT
      }));

      const { error: updateError } = await supabaseAdmin
        .from('patient_requirements')
        .update({
          medications: {
            status: MedicationStatus.CURRENT,
            currentMedications,
            lastReviewedAt: new Date()
          },
          updated_at: new Date()
        })
        .eq('patientId', patientId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error reviewing medication status:', error);
      throw error;
    }
  }

  private async generateInstructionDocuments(patient: PatientProfile): Promise<any[]> {
    // Implementation would generate necessary instruction documents
    // based on surgery type, patient language preference, etc.
    return [];
  }
}