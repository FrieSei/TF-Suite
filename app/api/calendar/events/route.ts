import { NextResponse } from 'next/server';
import {
  createCalendarEvent,
  listUpcomingEvents,
  updateCalendarEvent,
  deleteCalendarEvent
} from '@/lib/google/calendar-instance';

/**
 * GET: Fetch a list of upcoming calendar events.
 * @returns JSON response with the events or an error message.
 */
export async function GET() {
  try {
    const events = await listUpcomingEvents();
    return NextResponse.json({ success: true, events });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: Create a new calendar event.
 * @param request - JSON body containing event details (summary, description, startTime, endTime, attendees).
 * @returns JSON response with the created event or an error message.
 */
export async function POST(request: Request) {
  try {
    const { summary, description, startTime, endTime, attendees }: {
      summary: string;
      description: string;
      startTime: string;
      endTime: string;
      attendees?: string[];
    } = await request.json();
    
    const event = await createCalendarEvent(
      summary,
      description,
      new Date(startTime),
      new Date(endTime),
      attendees
    );
    
    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT: Update an existing calendar event.
 * @param request - JSON body containing event details (eventId, summary, description, startTime, endTime, attendees).
 * @returns JSON response with the updated event or an error message.
 */
export async function PUT(request: Request) {
  try {
    const { eventId, summary, description, startTime, endTime, attendees }: {
      eventId: string;
      summary?: string;
      description?: string;
      startTime?: string;
      endTime?: string;
      attendees?: string[];
    } = await request.json();
    
    const event = await updateCalendarEvent(
      eventId,
      summary,
      description,
      startTime ? new Date(startTime) : undefined,
      endTime ? new Date(endTime) : undefined,
      attendees
    );
    
    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE: Remove an existing calendar event.
 * @param request - JSON body containing the eventId.
 * @returns JSON response confirming deletion or an error message.
 */
export async function DELETE(request: Request) {
  try {
    const { eventId }: { eventId: string } = await request.json();
    await deleteCalendarEvent(eventId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
