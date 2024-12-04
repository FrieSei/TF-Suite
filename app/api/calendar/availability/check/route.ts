import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { EVENT_TYPES, CalendarType } from '@/types/calendar';
import { AnesthesiologistService } from '@/lib/google/anesthesiologist-service';
import { CalendarService } from '@/lib/google/calendar-service';

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const { surgeonId, startTime, duration, location, eventTypeCode } = await request.json();

    // Validate required fields
    if (!surgeonId || !startTime || !duration || !location || !eventTypeCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate date format and range
    const startDateTime = new Date(startTime);
    if (isNaN(startDateTime.getTime())) {
      return NextResponse.json({ error: 'Invalid start time format' }, { status: 400 });
    }

    // Validate duration is a positive number
    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      return NextResponse.json({ error: 'Duration must be a positive number' }, { status: 400 });
    }

    // Get surgeon's calendar credentials
    const { data: credentials, error: credentialsError } = await supabaseAdmin
      .from('calendar_credentials')
      .select('access_token')
      .eq('user_id', surgeonId)
      .single();

    if (credentialsError || !credentials?.access_token) {
      return NextResponse.json({ error: 'Calendar credentials not found' }, { status: 404 });
    }

    // Validate surgeon exists and is active
    const { data: surgeon, error: surgeonError } = await supabaseAdmin
      .from('doctors')
      .select('*')
      .eq('id', surgeonId)
      .eq('active', true)
      .single();

    if (surgeonError || !surgeon) {
      return NextResponse.json({ error: 'Surgeon not found or inactive' }, { status: 404 });
    }

    // Validate event type
    const eventType = EVENT_TYPES[eventTypeCode];
    if (!eventType) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    // Validate duration is within event type's allowed range
    if (!eventType.duration.includes(durationNum)) {
      return NextResponse.json(
        {
          error: `Invalid duration. ${eventType.name} must be ${eventType.duration.join(' or ')} minutes`,
        },
        { status: 400 }
      );
    }

    // Check for anesthesiologist requirement
    const requiresAnesthesiologist =
      eventType.category === CalendarType.SURGERY || eventType.requiresAnesthesiologist;

    // Check surgeon availability
    const endDateTime = new Date(startDateTime.getTime() + durationNum * 60000);
    const calendarService = new CalendarService();
    const surgeonAvailable = await calendarService.checkAvailability(
      credentials.access_token,
      surgeonId,
      startDateTime,
      endDateTime,
      eventTypeCode,
      location
    );

    if (!surgeonAvailable) {
      return NextResponse.json(
        {
          available: false,
          reason: 'Surgeon is not available at the requested time',
        },
        { status: 200 }
      );
    }

    // Check anesthesiologist availability for surgical procedures
    if (requiresAnesthesiologist) {
      const { data: anesthesiologists, error: anesthError } = await supabaseAdmin
        .from('doctors')
        .select('*')
        .eq('role', 'ANESTHESIOLOGIST')
        .eq('default_location', location)
        .eq('active', true);

      if (anesthError || !anesthesiologists?.length) {
        return NextResponse.json(
          {
            available: false,
            reason: 'No anesthesiologists found for this location. Surgical procedures require an anesthesiologist.',
          },
          { status: 200 }
        );
      }

      const anesthesiologistService = new AnesthesiologistService();
      const availableAnesthesiologist = await anesthesiologistService.findAvailableAnesthesiologist(
        credentials.access_token,
        startTime,
        durationNum,
        location,
        anesthesiologists
      );

      if (!availableAnesthesiologist) {
        return NextResponse.json(
          {
            available: false,
            reason: 'No anesthesiologist available. Surgical procedures require an anesthesiologist.',
          },
          { status: 200 }
        );
      }

      return NextResponse.json({
        available: true,
        anesthesiologist: {
          id: availableAnesthesiologist.id,
          name: availableAnesthesiologist.name,
        },
      });
    }

    return NextResponse.json({ available: true });
  } catch (error: any) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
