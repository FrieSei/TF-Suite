import { SurgerySystemIntegrator } from './surgery-integrator';
import { TaskManager } from '@/lib/task/task-manager';
import { PatientManager } from '@/lib/patient/patient-manager';
import { EquipmentManager } from '@/lib/equipment/equipment-manager';
import { NotificationService } from '@/lib/notifications/service';
import { supabaseAdmin } from '@/lib/supabase';
import { Surgery, SurgeryStatus } from '@/types/surgery-core';

export class SurgeryService {
  private integrator: SurgerySystemIntegrator;

  constructor() {
    this.integrator = new SurgerySystemIntegrator(
      new TaskManager(),
      new PatientManager(),
      new EquipmentManager(),
      new NotificationService()
    );
  }

  async scheduleSurgery(surgeryData: Omit<Surgery, 'id'>): Promise<Surgery> {
    try {
      // Create surgery record
      const { data: surgery, error } = await supabaseAdmin
        .from('surgeries')
        .insert(surgeryData)
        .select()
        .single();

      if (error) throw error;

      // Initialize all required subsystems
      await this.integrator.initializeSurgery(surgery);

      return surgery;
    } catch (error) {
      console.error('Error scheduling surgery:', error);
      throw error;
    }
  }

  async updateSurgeryStatus(surgeryId: string, status: SurgeryStatus): Promise<void> {
    try {
      if (status === SurgeryStatus.READY) {
        const isReady = await this.integrator.validateSurgeryReadiness(surgeryId);
        if (!isReady) {
          throw new Error('Surgery is not ready - requirements not met');
        }
      }

      await this.integrator.handleStatusUpdate(surgeryId, status);
    } catch (error) {
      console.error('Error updating surgery status:', error);
      throw error;
    }
  }

  async getSurgeryStatus(surgeryId: string): Promise<{
    status: SurgeryStatus;
    readiness: {
      tasks: boolean;
      equipment: boolean;
      patient: boolean;
      consultation: boolean;
    };
  }> {
    try {
      const [
        surgery,
        tasksReady,
        equipmentReady,
        patientReady,
        consultationReady
      ] = await Promise.all([
        supabaseAdmin
          .from('surgeries')
          .select('status')
          .eq('id', surgeryId)
          .single(),
        this.checkTasksReadiness(surgeryId),
        this.checkEquipmentReadiness(surgeryId),
        this.checkPatientReadiness(surgeryId),
        this.checkConsultationReadiness(surgeryId)
      ]);

      return {
        status: surgery.data?.status || SurgeryStatus.SCHEDULED,
        readiness: {
          tasks: tasksReady,
          equipment: equipmentReady,
          patient: patientReady,
          consultation: consultationReady
        }
      };
    } catch (error) {
      console.error('Error getting surgery status:', error);
      throw error;
    }
  }

  private async checkTasksReadiness(surgeryId: string): Promise<boolean> {
    const taskManager = new TaskManager();
    const tasks = await taskManager.getTaskTimeline(surgeryId);
    return tasks.every(task => task.status === 'COMPLETED');
  }

  private async checkEquipmentReadiness(surgeryId: string): Promise<boolean> {
    const equipmentManager = new EquipmentManager();
    return equipmentManager.checkReadiness(surgeryId);
  }

  private async checkPatientReadiness(surgeryId: string): Promise<boolean> {
    const { data: requirement } = await supabaseAdmin
      .from('patient_requirements')
      .select('*')
      .eq('surgeryId', surgeryId)
      .single();

    return requirement?.bloodwork?.status === 'VERIFIED' &&
           requirement?.ecg?.status === 'VERIFIED';
  }

  private async checkConsultationReadiness(surgeryId: string): Promise<boolean> {
    const { data: surgery } = await supabaseAdmin
      .from('ptl_surgeries')
      .select('consultation_status')
      .eq('id', surgeryId)
      .single();

    return surgery?.consultation_status === 'COMPLETED';
  }
}