import { TaskManager } from '@/lib/task/task-manager';
import { PatientManager } from '@/lib/patient/patient-manager';
import { EquipmentManager } from '@/lib/equipment/equipment-manager';
import { NotificationService } from '@/lib/notifications/service';
import { supabaseAdmin } from '@/lib/supabase';
import { Surgery, SurgeryStatus } from '@/types/surgery-core';
import { validateSurgeryReadiness, validateConsultationRequirement } from '@/lib/ptl/validation';

export class SurgerySystemIntegrator {
  constructor(
    private taskManager: TaskManager,
    private patientManager: PatientManager,
    private equipmentManager: EquipmentManager,
    private notificationService: NotificationService
  ) {}

  async initializeSurgery(surgery: Surgery): Promise<void> {
    try {
      // Start transaction
      const { error: txError } = await supabaseAdmin.rpc('begin_transaction');
      if (txError) throw txError;

      try {
        // Create task chain
        await this.taskManager.createTaskChain(surgery.id);

        // Initialize patient requirements
        const { data: patient } = await supabaseAdmin
          .from('patients')
          .select('*')
          .eq('id', surgery.patientId)
          .single();

        if (patient) {
          await this.patientManager.trackSubmissions(patient.id);
        }

        // Check and reserve equipment
        await this.equipmentManager.reserveEquipment(
          surgery.id,
          surgery.surgeryDate,
          surgery.location
        );

        // Send initial notifications
        await this.notificationService.sendNotification({
          recipient: patient?.contactInfo.email,
          type: 'SURGERY_SCHEDULED',
          channels: ['email'],
          data: {
            patientName: patient?.name,
            surgeryDate: surgery.surgeryDate,
            location: surgery.location
          }
        });

        // Commit transaction
        const { error: commitError } = await supabaseAdmin.rpc('commit_transaction');
        if (commitError) throw commitError;
      } catch (error) {
        // Rollback on error
        await supabaseAdmin.rpc('rollback_transaction');
        throw error;
      }
    } catch (error) {
      console.error('Error initializing surgery:', error);
      throw error;
    }
  }

  async validateSurgeryReadiness(surgeryId: string): Promise<boolean> {
    try {
      // Check consultation requirements
      const consultationValid = await validateConsultationRequirement(surgeryId);
      if (!consultationValid) return false;

      // Check task completion
      const tasks = await this.taskManager.getTaskTimeline(surgeryId);
      const allTasksCompleted = tasks.every(task => 
        task.status === 'COMPLETED' || task.status === 'BLOCKED'
      );
      if (!allTasksCompleted) return false;

      // Check equipment availability
      const { data: surgery } = await supabaseAdmin
        .from('surgeries')
        .select('*')
        .eq('id', surgeryId)
        .single();

      if (surgery) {
        const equipmentReady = await this.equipmentManager.validateEquipmentStatus(
          surgeryId,
          surgery.surgeryDate,
          surgery.location
        );
        if (!equipmentReady) return false;
      }

      // Check patient requirements
      const { data: patient } = await supabaseAdmin
        .from('patient_requirements')
        .select('*')
        .eq('surgeryId', surgeryId)
        .single();

      if (patient) {
        const requirements = await this.patientManager.trackSubmissions(patient.id);
        const allRequirementsMet = requirements.every(req =>
          req.bloodwork.status === 'VERIFIED' &&
          req.ecg.status === 'VERIFIED' &&
          req.instructions.status === 'ACKNOWLEDGED'
        );
        if (!allRequirementsMet) return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating surgery readiness:', error);
      throw error;
    }
  }

  async handleStatusUpdate(surgeryId: string, newStatus: SurgeryStatus): Promise<void> {
    try {
      // Start transaction
      const { error: txError } = await supabaseAdmin.rpc('begin_transaction');
      if (txError) throw txError;

      try {
        // Update surgery status
        const { data: surgery, error: updateError } = await supabaseAdmin
          .from('surgeries')
          .update({ status: newStatus, updated_at: new Date() })
          .eq('id', surgeryId)
          .select()
          .single();

        if (updateError) throw updateError;

        // Handle status-specific actions
        switch (newStatus) {
          case SurgeryStatus.IN_PREPARATION:
            await this.handlePreparationPhase(surgeryId);
            break;
          case SurgeryStatus.READY:
            await this.handleReadyPhase(surgeryId);
            break;
          case SurgeryStatus.COMPLETED:
            await this.handleCompletionPhase(surgeryId);
            break;
          case SurgeryStatus.CANCELLED:
            await this.handleCancellation(surgeryId);
            break;
        }

        // Commit transaction
        const { error: commitError } = await supabaseAdmin.rpc('commit_transaction');
        if (commitError) throw commitError;
      } catch (error) {
        // Rollback on error
        await supabaseAdmin.rpc('rollback_transaction');
        throw error;
      }
    } catch (error) {
      console.error('Error handling surgery status update:', error);
      throw error;
    }
  }

  private async handlePreparationPhase(surgeryId: string): Promise<void> {
    // Start equipment preparation
    await this.equipmentManager.startPreparation(surgeryId);

    // Send notifications to relevant staff
    const { data: surgery } = await supabaseAdmin
      .from('surgeries')
      .select('*, patient:patients(*), surgeon:doctors(*)')
      .eq('id', surgeryId)
      .single();

    if (surgery) {
      await this.notificationService.sendNotification({
        recipient: surgery.surgeon.email,
        type: 'SURGERY_PREPARATION',
        channels: ['email', 'sms'],
        data: {
          patientName: surgery.patient.name,
          surgeryDate: surgery.surgeryDate,
          location: surgery.location
        }
      });
    }
  }

  private async handleReadyPhase(surgeryId: string): Promise<void> {
    // Verify final equipment status
    await this.equipmentManager.verifyReadiness(surgeryId);

    // Send final confirmations
    const { data: surgery } = await supabaseAdmin
      .from('surgeries')
      .select('*, patient:patients(*), surgeon:doctors(*)')
      .eq('id', surgeryId)
      .single();

    if (surgery) {
      await this.notificationService.sendNotification({
        recipient: surgery.patient.email,
        type: 'SURGERY_READY',
        channels: ['email', 'sms'],
        data: {
          patientName: surgery.patient.name,
          surgeryDate: surgery.surgeryDate,
          location: surgery.location,
          arrivalTime: surgery.arrivalTime
        }
      });
    }
  }

  private async handleCompletionPhase(surgeryId: string): Promise<void> {
    // Release equipment
    await this.equipmentManager.releaseEquipment(surgeryId);

    // Update task statuses
    await this.taskManager.updateTaskStatus(surgeryId, 'COMPLETED');

    // Send post-surgery notifications
    const { data: surgery } = await supabaseAdmin
      .from('surgeries')
      .select('*, patient:patients(*)')
      .eq('id', surgeryId)
      .single();

    if (surgery) {
      await this.notificationService.sendNotification({
        recipient: surgery.patient.email,
        type: 'SURGERY_COMPLETED',
        channels: ['email'],
        data: {
          patientName: surgery.patient.name,
          followUpDate: surgery.followUpDate,
          instructions: surgery.postOpInstructions
        }
      });
    }
  }

  private async handleCancellation(surgeryId: string): Promise<void> {
    // Release equipment reservations
    await this.equipmentManager.releaseEquipment(surgeryId);

    // Cancel all pending tasks
    await this.taskManager.updateTaskStatus(surgeryId, 'CANCELLED');

    // Send cancellation notifications
    const { data: surgery } = await supabaseAdmin
      .from('surgeries')
      .select('*, patient:patients(*), surgeon:doctors(*)')
      .eq('id', surgeryId)
      .single();

    if (surgery) {
      await this.notificationService.sendNotification({
        recipient: surgery.patient.email,
        type: 'SURGERY_CANCELLED',
        channels: ['email', 'sms'],
        data: {
          patientName: surgery.patient.name,
          surgeryDate: surgery.surgeryDate,
          reason: surgery.cancellationReason
        }
      });
    }
  }
}