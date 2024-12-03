import { CalendarService } from './calendar';
import { supabaseAdmin } from '@/lib/supabase';
import { LocationType, CalendarType } from '@/types/calendar';

const calendarService = new CalendarService();

/**
 * List upcoming events for the authenticated user.
 */
export const listUpcomingEvents = async () => {
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();
  if (authError) throw new Error('Authentication error');
  if (!user) throw new Error('User not authenticated');

  const { data: calendars, error: calendarError } = await supabaseAdmin
    .from('calendar_integrations')
    .select('*')
    .eq('user_id', user.id);

  if (calendarError) throw new Error('Failed to fetch user calendars');
  if (!calendars?.length) return [];

  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const eventsPromises = calendars.map(cal =>
    calendarService.getSurgeonAvailability(
      user.id,
      now,
      endOfMonth,
      cal.location as LocationType
    )
  );

  const availabilityResults = await Promise.all(eventsPromises);
  return availabilityResults.flat();
};

/**
 * Create a new calendar event.
 */
export const createCalendarEvent = async (
  summary: string,
  description: string,
  startTime: Date,
  endTime: Date,
  attendees?: string[]
) => {
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();
  if (authError) throw new Error('Authentication error');
  if (!user) throw new Error('User not authenticated');

  const { data: calendar, error: calendarError } = await supabaseAdmin
    .from('calendar_integrations')
    .select('*')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (calendarError || !calendar) throw new Error('No calendars found for the user');

  const appointment = await calendarService.createAppointment(
    user.id,
    attendees?.[0] || 'guest',
    calendar.location as LocationType,
    startTime,
    endTime,
    calendar.calendar_type as CalendarType,
    description
  );

  return appointment;
};

/**
 * Update an existing calendar event.
 */
export const updateCalendarEvent = async (
  eventId: string,
  summary?: string,
  description?: string,
  startTime?: Date,
  endTime?: Date,
  attendees?: string[]
) => {
  const { data: appointment, error: appointmentError } = await supabaseAdmin
    .from('appointments')
    .select('*')
    .eq('id', eventId)
    .single();

  if (appointmentError || !appointment) throw new Error(`Appointment with ID ${eventId} not found`);

  const updates = {
    notes: description,
    ...(startTime && { start_time: startTime }),
    ...(endTime && { end_time: endTime })
  };

  return await calendarService.updateAppointment(eventId, updates);
};

/**
 * Delete a calendar event.
 */
export const deleteCalendarEvent = async (eventId: string) => {
  await calendarService.deleteAppointment(eventId);
};
