export const createCalendarEvent = async (
  summary: string,
  description: string,
  startTime: Date,
  endTime: Date,
  attendees?: string[]
) => {
  // Get the authenticated user
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();
  if (authError) throw new Error(`Authentication failed: ${authError.message}`);
  if (!user) throw new Error('User not authenticated');

  // Validate required parameters
  if (!startTime || !endTime) throw new Error('Start time and end time are required');

  // Validate appointment duration (15 minutes to 4 hours)
  const durationInSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
  if (durationInSeconds < 900 || durationInSeconds > 14400) {
    throw new Error(`Invalid appointment duration (${durationInSeconds / 60} minutes). Must be between 15 minutes and 4 hours.`);
  }

  // Check if the surgeon is available
  const { data: isAvailable, error: availabilityError } = await supabaseAdmin.rpc(
    'check_appointment_availability',
    {
      p_surgeon_id: user.id,
      p_location: location,
      p_start_time: startTime,
      p_end_time: endTime
    }
  );

  if (availabilityError) throw new Error(`Availability check failed: ${availabilityError.message}`);
  if (!isAvailable) throw new Error('The selected time slot is not available.');

  // Create the appointment
  const appointment = await calendarService.createAppointment(
    user.id,
    attendees?.[0] || 'guest', // Using first attendee or default
    location,
    startTime,
    endTime,
    CalendarType.DEFAULT, // Replace with actual calendar type
    description
  );

  return appointment;
};
