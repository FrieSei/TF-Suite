import { supabaseAdmin } from '@/lib/supabase';
import { 
  Task, 
  TaskType, 
  TaskStatus, 
  TaskTemplate,
  TaskPriority 
} from '@/types/task';
import { addDays, isBefore } from 'date-fns';

const TASK_TEMPLATES: TaskTemplate[] = [
  {
    type: TaskType.CONSULTATION,
    title: 'Pre-Surgery Consultation',
    description: 'Initial consultation to discuss procedure and requirements',
    daysBeforeSurgery: 14,
    priority: TaskPriority.HIGH,
    dependencies: [],
    notifications: [
      {
        type: 'EMAIL',
        triggerDays: 1,
        recipients: ['surgeon', 'patient'],
        template: 'consultation_reminder'
      }
    ],
    requiredRole: ['surgeon']
  },
  {
    type: TaskType.BLOODWORK,
    title: 'Pre-Surgery Blood Tests',
    description: 'Complete required blood work and analysis',
    daysBeforeSurgery: 7,
    priority: TaskPriority.HIGH,
    dependencies: [TaskType.CONSULTATION],
    notifications: [
      {
        type: 'SMS',
        triggerDays: 2,
        recipients: ['patient'],
        template: 'bloodwork_reminder'
      }
    ],
    requiredRole: ['staff']
  },
  {
    type: TaskType.ANESTHESIA_CLEARANCE,
    title: 'Anesthesia Clearance',
    description: 'Obtain clearance from anesthesiologist',
    daysBeforeSurgery: 5,
    priority: TaskPriority.HIGH,
    dependencies: [TaskType.BLOODWORK],
    notifications: [
      {
        type: 'EMAIL',
        triggerDays: 1,
        recipients: ['anesthesiologist'],
        template: 'anesthesia_clearance_required'
      }
    ],
    requiredRole: ['anesthesiologist']
  }
];

export class TaskManager {
  async createTaskChain(surgeryId: string): Promise<Task[]> {
    try {
      // Get surgery details
      const { data: surgery, error: surgeryError } = await supabaseAdmin
        .from('surgeries')
        .select('*')
        .eq('id', surgeryId)
        .single();

      if (surgeryError) throw surgeryError;

      const tasks: Partial<Task>[] = TASK_TEMPLATES.map(template => {
        const dueDate = addDays(new Date(surgery.surgery_date), -template.daysBeforeSurgery);
        
        return {
          surgeryId,
          type: template.type,
          title: template.title,
          description: template.description,
          dueDate,
          status: TaskStatus.PENDING,
          priority: template.priority,
          dependencies: template.dependencies,
          notifications: template.notifications,
          created_at: new Date(),
          updated_at: new Date()
        };
      });

      // Insert tasks
      const { data: createdTasks, error: tasksError } = await supabaseAdmin
        .from('surgery_tasks')
        .insert(tasks)
        .select();

      if (tasksError) throw tasksError;

      return createdTasks;
    } catch (error) {
      console.error('Error creating task chain:', error);
      throw error;
    }
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    try {
      // Check dependencies before completing
      if (status === TaskStatus.COMPLETED) {
        const canComplete = await this.checkDependencies(taskId);
        if (!canComplete) {
          throw new Error('Cannot complete task: dependencies not met');
        }
      }

      const { error } = await supabaseAdmin
        .from('surgery_tasks')
        .update({
          status,
          completedAt: status === TaskStatus.COMPLETED ? new Date() : null,
          completedBy: status === TaskStatus.COMPLETED ? 'auth.uid()' : null,
          updated_at: new Date()
        })
        .eq('id', taskId);

      if (error) throw error;

      // Update dependent tasks
      if (status === TaskStatus.COMPLETED) {
        await this.updateDependentTasks(taskId);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }

  async checkDependencies(taskId: string): Promise<boolean> {
    try {
      // Get task and its dependencies
      const { data: task, error: taskError } = await supabaseAdmin
        .from('surgery_tasks')
        .select('dependencies')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      if (!task.dependencies.length) return true;

      // Check if all dependency tasks are completed
      const { data: dependencies, error: depsError } = await supabaseAdmin
        .from('surgery_tasks')
        .select('status')
        .in('type', task.dependencies);

      if (depsError) throw depsError;

      return dependencies.every(dep => dep.status === TaskStatus.COMPLETED);
    } catch (error) {
      console.error('Error checking dependencies:', error);
      throw error;
    }
  }

  private async updateDependentTasks(taskId: string): Promise<void> {
    try {
      // Get tasks that depend on the completed task
      const { data: dependentTasks, error } = await supabaseAdmin
        .from('surgery_tasks')
        .select('id')
        .contains('dependencies', [taskId]);

      if (error) throw error;

      // Update status of dependent tasks if their dependencies are met
      for (const depTask of dependentTasks) {
        const canProgress = await this.checkDependencies(depTask.id);
        if (canProgress) {
          await supabaseAdmin
            .from('surgery_tasks')
            .update({
              status: TaskStatus.IN_PROGRESS,
              updated_at: new Date()
            })
            .eq('id', depTask.id);
        }
      }
    } catch (error) {
      console.error('Error updating dependent tasks:', error);
      throw error;
    }
  }

  async getTaskTimeline(surgeryId: string): Promise<Task[]> {
    try {
      const { data: tasks, error } = await supabaseAdmin
        .from('surgery_tasks')
        .select('*')
        .eq('surgeryId', surgeryId)
        .order('dueDate', { ascending: true });

      if (error) throw error;

      // Update overdue tasks
      const now = new Date();
      const updatedTasks = tasks.map(task => ({
        ...task,
        status: isBefore(new Date(task.dueDate), now) && 
                task.status === TaskStatus.PENDING
                  ? TaskStatus.OVERDUE 
                  : task.status
      }));

      return updatedTasks;
    } catch (error) {
      console.error('Error fetching task timeline:', error);
      throw error;
    }
  }
}