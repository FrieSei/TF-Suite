import { NextResponse } from 'next/server';
import { CalendarService } from '@/lib/google/calendar-service';
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

    const calendarService = new CalendarService();

    // Create startTime Date object from input string
    const startTime = new Date(eventData.startTime);

    // Validate startTime
    if (isNaN(startTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid startTime format' },
        { status: 400 }
      );
    }

    // Calculate endTime based on startTime and duration
    const endTime = new Date(startTime.getTime() + eventData.duration * 60000);

    // Check availability using startTime and endTime
    const isAvailable = await calendarService.checkAvailability(
      credentials.access_token,
      calendarId,
      startTime,
      endTime,
      eventData.eventTypeCode,
      eventData.anesthesiologistId
    );

    if (!isAvailable) {
      return NextResponse.json(
        { error: 'Time slot is not available' },
        { status: 409 }
      );
    }

    // Format the event data
    const formattedEvent = {
      summary: eventData.title,
      description: eventData.description,
      location: eventData.location,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees: eventData.attendees?.map((email: string) => ({ email })),
    };

    // Create the event
    const event = await calendarService.createEvent(
      credentials.access_token,
      calendarId,
      formattedEvent
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
