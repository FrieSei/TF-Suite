import { supabaseAdmin } from '@/lib/supabase';
import { LocationType, TimeSlot, AvailabilityTemplate } from '@/types/calendar';

export class AvailabilityService {
  async checkAvailability(
    surgeonId: string,
    startTime: Date,
    endTime: Date,
    location: LocationType
  ): Promise<boolean> {
    try {
      // 1. Check if the requested time falls within surgeon's template hours
      const isWithinTemplateHours = await this.checkTemplateHours(
        surgeonId,
        startTime,
        endTime,
        location
      );

      if (!isWithinTemplateHours) {
        return false;
      }

      // 2. Check for existing appointments that would conflict
      const hasConflicts = await this.checkForConflicts(
        surgeonId,
        startTime,
        endTime,
        location
      );

      return !hasConflicts;
    } catch (error) {
      console.error('Error checking availability:', error);
      throw new Error('Failed to check availability');
    }
  }

  private async checkTemplateHours(
    surgeonId: string,
    startTime: Date,
    endTime: Date,
    location: LocationType
  ): Promise<boolean> {
    const dayOfWeek = startTime.getDay();

    const { data: templates, error } = await supabaseAdmin
      .from('availability_templates')
      .select('*')
      .eq('surgeon_id', surgeonId)
      .eq('day_of_week', dayOfWeek)
      .eq('location', location)
      .eq('is_active', true);

    if (error || !templates.length) {
      return false;
    }

    // Convert request times to HH:mm format for comparison
    const requestStartTime = startTime.toTimeString().slice(0, 5);
    const requestEndTime = endTime.toTimeString().slice(0, 5);

    // Check if requested time falls within template hours
    return templates.some(
      (t: AvailabilityTemplate) =>
        requestStartTime >= t.startTime && requestEndTime <= t.endTime
    );
  }

  private async checkForConflicts(
    surgeonId: string,
    startTime: Date,
    endTime: Date,
    location: LocationType
  ): Promise<boolean> {
    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('surgeon_id', surgeonId)
      .eq('location', location)
      .neq('status', 'cancelled')
      .or(`start_time.gte.${startTime.toISOString()},end_time.lte.${endTime.toISOString()}`);

    if (error) {
      throw error;
    }

    return appointments.length > 0;
  }

  async getAvailableSlots(
    surgeonId: string,
    startDate: Date,
    endDate: Date,
    duration: number,
    location: LocationType,
    appointmentType: string
  ): Promise<TimeSlot[]> {
    const availableSlots: TimeSlot[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const { data: templates, error } = await supabaseAdmin
        .from('availability_templates')
        .select('*')
        .eq('surgeon_id', surgeonId)
        .eq('day_of_week', currentDate.getDay())
        .eq('location', location)
        .eq('is_active', true);

      if (error) throw error;

      for (const template of templates) {
        const [templateStartHour, templateStartMinute] = template.start_time.split(':');
        const [templateEndHour, templateEndMinute] = template.end_time.split(':');

        let slotStart = new Date(currentDate);
        slotStart.setHours(parseInt(templateStartHour), parseInt(templateStartMinute), 0);

        const templateEnd = new Date(currentDate);
        templateEnd.setHours(parseInt(templateEndHour), parseInt(templateEndMinute), 0);

        while (slotStart < templateEnd) {
          const slotEnd = new Date(slotStart.getTime() + duration * 60000);

          if (slotEnd <= templateEnd) {
            const isAvailable = await this.checkAvailability(
              surgeonId,
              slotStart,
              slotEnd,
              location
            );

            if (isAvailable) {
              availableSlots.push({
                start: slotStart.toISOString(),
                end: slotEnd.toISOString(),
                type: appointmentType
              });
            }
          }

          slotStart = new Date(slotStart.getTime() + duration * 60000);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return availableSlots;
  }
}
