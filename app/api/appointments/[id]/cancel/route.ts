import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { CalendarService } from '@/lib/google/calendar';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get the appointment
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        surgeon:doctors!surgeon_id(calendar_id)
      `)
      .eq('id', params.id)
      .single();

    if (fetchError || !appointment) {
      throw new Error('Appointment not found');
    }

    // Get surgeon's calendar credentials
    const { data: credentials, error: credentialsError } = await supabaseAdmin
      .from('calendar_credentials')
      .select('access_token')
      .eq('user_id', appointment.surgeon_id)
      .single();

    if (credentialsError || !credentials) {
      throw new Error('Calendar credentials not found');
    }

    // Cancel in Google Calendar
    if (appointment.google_event_id) {
      const calendarService = new CalendarService();
      await calendarService.deleteEvent(
        credentials.access_token,
        appointment.surgeon.calendar_id,
        appointment.google_event_id
      );
    }

    // Update appointment status in database
    const { data: updatedAppointment, error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ appointment: updatedAppointment });
  } catch (error: any) {
    console.error('Error cancelling appointment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel appointment' },
      { status: 500 }
    );
  }
}