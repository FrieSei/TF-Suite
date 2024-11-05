import { NextResponse } from 'next/server';
import { createCalendarEvent, listUpcomingEvents, updateCalendarEvent, deleteCalendarEvent } from '@/lib/google/calendar';

export async function GET() {
  try {
    const events = await listUpcomingEvents();
    return NextResponse.json({ events });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { summary, description, startTime, endTime, attendees } = await request.json();
    
    const event = await createCalendarEvent(
      summary,
      description,
      new Date(startTime),
      new Date(endTime),
      attendees
    );
    
    return NextResponse.json({ event });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { eventId, summary, description, startTime, endTime, attendees } = await request.json();
    
    const event = await updateCalendarEvent(
      eventId,
      summary,
      description,
      startTime ? new Date(startTime) : undefined,
      endTime ? new Date(endTime) : undefined,
      attendees
    );
    
    return NextResponse.json({ event });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { eventId } = await request.json();
    await deleteCalendarEvent(eventId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}