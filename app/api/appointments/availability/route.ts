import { NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/appointments/availability-service';
import { LocationType, CalendarType } from '@/types/calendar';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const surgeonId = searchParams.get('surgeonId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const duration = searchParams.get('duration');
    const location = searchParams.get('location') as LocationType;
    const type = searchParams.get('type') as CalendarType;

    if (!surgeonId || !startDate || !endDate || !duration || !location || !type) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const availabilityService = new AvailabilityService();
    const availableSlots = await availabilityService.getAvailableSlots(
      surgeonId,
      new Date(startDate),
      new Date(endDate),
      parseInt(duration),
      location,
      type
    );

    return NextResponse.json({ slots: availableSlots });
  } catch (error: any) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}