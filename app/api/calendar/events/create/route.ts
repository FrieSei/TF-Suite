import { NextResponse } from 'next/server';
import { CalendarService } from '@/lib/google/calendar-service'; // Updated import
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { userId, calendarId, eventData } = await request.json();

    if (!userId || !calendarId || !eventData) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get user's calendar credentials
    const { data: credentials, error: credentialsError } = await supabaseAdmin
      .from('calendar_credentials')
      .select('access_token')
      .eq('user_id', userId)
      .single();

    if (credentialsError || !credentials) {
      return NextResponse.json(
        { error: 'Calendar credentials not found' },
        { status: 404 }
      );
    }

    const calendarService = new CalendarService(); // Updated instantiation to use CalendarService

    // Check availability
    const isAvailable = await calendarService.checkAvailability(
      credentials.access_token,
      calendarId,
      eventData.startTime,
      new Date(new Date(eventData.startTime).getTime() + eventData.duration * 60000).toISOString(),
      eventData.eventTypeCode,
      eventData.anesthesiologistId
    );

    if (!isAvailable) {
      return NextResponse.json(
        { error: 'Time slot is not available' },
        { status: 409 }
      );
    }

    // Create the event
    const event = await calendarService.createEventWithType(
      credentials.access_token,
      calendarId,
      eventData
    );

    return NextResponse.json({ event });
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create event' },
      { status: 500 }
    );
  }
}
