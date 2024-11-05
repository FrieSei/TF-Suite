import { NextResponse } from 'next/server';
import { StaffCalendarService } from '@/lib/google/staff-calendar';
import { LocationType } from '@/types/calendar';

export async function POST(request: Request) {
  try {
    const { userId, location, startTime, endTime, scheduleType } = await request.json();

    if (!userId || !location || !startTime || !endTime || !scheduleType) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const calendarService = new StaffCalendarService();
    const event = await calendarService.addAvailabilityEvent(
      userId,
      location as LocationType,
      startTime,
      endTime,
      scheduleType
    );

    return NextResponse.json({ event });
  } catch (error: any) {
    console.error('Error adding staff availability:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add availability' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const location = searchParams.get('location');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!userId || !location || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const calendarService = new StaffCalendarService();
    const availability = await calendarService.getStaffAvailability(
      userId,
      location as LocationType,
      startDate,
      endDate
    );

    return NextResponse.json({ availability });
  } catch (error: any) {
    console.error('Error fetching staff availability:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}