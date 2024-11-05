import { supabaseAdmin } from '@/lib/supabase';
import { createCalendar } from './calendar';

export async function createDefaultCalendars(userId: string) {
  try {
    const { data: locations, error } = await supabaseAdmin
      .from('surgeon_locations')
      .select('location')
      .eq('surgeon_id', userId);

    if (error) throw error;

    if (!locations?.length) return;

    for (const { location } of locations) {
      // Create surgery calendar
      const surgeryCalendar = await createCalendar(
        `${location} - Surgeries`,
        `Surgery calendar for ${location} location`
      );

      // Create consultation calendar
      const consultationCalendar = await createCalendar(
        `${location} - Consultations`,
        `Consultation calendar for ${location} location`
      );

      // Store calendar IDs in database
      const { error: insertError } = await supabaseAdmin
        .from('calendar_integrations')
        .insert([
          {
            user_id: userId,
            location,
            calendar_id: surgeryCalendar.data.id,
            calendar_type: 'surgery',
            created_at: new Date().toISOString()
          },
          {
            user_id: userId,
            location,
            calendar_id: consultationCalendar.data.id,
            calendar_type: 'consultation',
            created_at: new Date().toISOString()
          }
        ]);

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error creating default calendars:', error);
    throw error;
  }
}