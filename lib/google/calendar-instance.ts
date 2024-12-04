import { supabaseAdmin } from '@/lib/supabase';
import { calendarService } from './calendar';
import { CalendarType, LocationType, AppointmentStatus } from '@/types/enums';

/**
 * Determines the calendar type based on the event details
 * @param summary Event summary/title
 * @param description Event description
 * @returns Appropriate CalendarType
 */
const determineCalendarType = (summary: string, description: string): CalendarType => {
  const lowerSummary = summary.toLowerCase();
  const lowerDescription = description.toLowerCase();

  if (lowerSummary.includes('surgery') || lowerDescription.includes('surgery')) {
    return CalendarType.SURGERY;
  } else if (lowerSummary.includes('consult') || lowerDescription.includes('consultation')) {
    return CalendarType.CONSULTATION;
  }
  return CalendarType.GENERAL;
};

/**
 * Validates the location parameter
 * @param location Location to validate
 * @throws Error if location is invalid
 */
const validateLocation = (location?: LocationType): LocationType => {
  if (!location) {
    throw new Error('Location is required for calendar events');
  }

  // Verify the location is a valid enum value
  if (!Object.values(LocationType).includes(location)) {
    throw new Error(`Invalid location type: ${location}`);
  }

  return location;
};

/**
 * Creates a new calendar event and corresponding appointment
 * @param summary Event title/summary
 * @param description Event description
 * @param startTime Event start time
 * @param endTime Event end time
 * @param attendees Optional list of attendee email addresses
 * @param location Location where the event takes place
 * @throws Error if location is invalid or any required parameter is missing
 */
export const createCalendarEvent = async (
  summary: string,
  description: string,
  startTime: Date,
  endTime: Date,
  attendees?: string[],
  location?: LocationType
) => {
  // Get the authenticated user
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();
  if (authError) throw new Error(`Authentication failed: ${authError.message}`);
  if (!user) throw new Error('User not authenticated');

  // Validate required parameters
  if (!summary || !description) throw new Error('Summary and description are required');
  if (!startTime || !endTime) throw new Error('Start time and end time are required');

  // Validate and get location
  const validatedLocation = validateLocation(location);

  // Validate appointment duration (15 minutes to 4 hours)
  const durationInSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
  if (durationInSeconds < 900 || durationInSeconds > 14400) {
    throw new Error(`Invalid appointment duration (${durationInSeconds / 60} minutes). Must be between 15 minutes and 4 hours.`);
  }

  // Determine the appropriate calendar type
  const calendarType = determineCalendarType(summary, description);

  // Check if the surgeon is available
  const { data: isAvailable, error: availabilityError } = await supabaseAdmin.rpc(
    'check_appointment_availability',
    {
      p_surgeon_id: user.id,
      p_location: validatedLocation,
      p_start_time: startTime,
      p_end_time: endTime,
    }
  );

  if (availabilityError) throw new Error(`Availability check failed: ${availabilityError.message}`);
  if (!isAvailable) throw new Error('The selected time slot is not available.');

  // Create the appointment
  const appointment = await calendarService.scheduleAppointment(
    user.id,
    validatedLocation,
    startTime.toISOString(),
    endTime.toISOString(),
    calendarType,
    description
  );

  return appointment;
};

/**
 * Lists all upcoming events for the authenticated user
 * @returns Array of upcoming appointments
 * @throws Error if authentication fails or database query fails
 */
export const listUpcomingEvents = async () => {
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();
  if (authError) throw new Error(`Authentication failed: ${authError.message}`);
  if (!user) throw new Error('User not authenticated');

  const { data: appointments, error } = await supabaseAdmin
    .from('appointments')
    .select('*')
    .eq('user_id', user.id)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true });

  if (error) throw new Error(`Failed to fetch appointments: ${error.message}`);
  return appointments;
};

/**
 * Updates an existing calendar event
 * @param eventId Google Calendar event ID
 * @param summary Optional new summary
 * @param description Optional new description
 * @param startTime Optional new start time
 * @param endTime Optional new end time
 * @param attendees Optional new attendees list
 * @returns Updated appointment details
 * @throws Error if event not found or update fails
 */
export const updateCalendarEvent = async (
  eventId: string,
  summary?: string,
  description?: string,
  startTime?: Date,
  endTime?: Date,
  attendees?: string[]
) => {
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();
  if (authError) throw new Error(`Authentication failed: ${authError.message}`);
  if (!user) throw new Error('User not authenticated');

  // Get the existing appointment
  const { data: appointment, error: fetchError } = await supabaseAdmin
    .from('appointments')
    .select('*')
    .eq('google_event_id', eventId)
    .single();

  if (fetchError) throw new Error(`Failed to fetch appointment: ${fetchError.message}`);
  if (!appointment) throw new Error('Appointment not found');

  // If updating times, validate duration
  if (startTime && endTime) {
    const durationInSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
    if (durationInSeconds < 900 || durationInSeconds > 14400) {
      throw new Error(`Invalid appointment duration (${durationInSeconds / 60} minutes). Must be between 15 minutes and 4 hours.`);
    }
  }

  // Update the appointment in Google Calendar
  await calendarService.updateAppointment(
    eventId,
    summary,
    description,
    startTime?.toISOString(),
    endTime?.toISOString()
  );

  // Determine new calendar type if summary or description changed
  const calendarType = summary || description
    ? determineCalendarType(summary || appointment.summary, description || appointment.description)
    : appointment.type;

  // Update the appointment in Supabase
  const { data: updatedAppointment, error: updateError } = await supabaseAdmin
    .from('appointments')
    .update({
      type: calendarType,
      start_time: startTime?.toISOString() || appointment.start_time,
      end_time: endTime?.toISOString() || appointment.end_time,
      notes: description || appointment.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('google_event_id', eventId)
    .single();

  if (updateError) throw new Error(`Failed to update appointment: ${updateError.message}`);
  return updatedAppointment;
};

/**
 * Deletes a calendar event and its corresponding appointment
 * @param eventId Google Calendar event ID
 * @throws Error if event not found or deletion fails
 */
export const deleteCalendarEvent = async (eventId: string) => {
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();
  if (authError) throw new Error(`Authentication failed: ${authError.message}`);
  if (!user) throw new Error('User not authenticated');

  // Delete from Google Calendar
  await calendarService.deleteAppointment(eventId);

  // Delete from Supabase
  const { error: deleteError } = await supabaseAdmin
    .from('appointments')
    .delete()
    .eq('google_event_id', eventId);

  if (deleteError) throw new Error(`Failed to delete appointment: ${deleteError.message}`);
};
