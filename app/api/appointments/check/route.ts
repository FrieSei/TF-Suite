import { NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/appointments/availability-service';
import { LocationType } from '@/types/calendar';

export async function POST(request: Request) {
  try {
    const { surgeonId, startTime, endTime, location } = await request.json();

    if (!surgeonId || !startTime || !endTime || !location) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const availabilityService = new AvailabilityService();
    const isAvailable = await availabilityService.checkAvailability(
      surgeonId,
      new Date(startTime),
      new Date(endTime),
      location as LocationType
    );

    return NextResponse.json({ available: isAvailable });
  } catch (error: any) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check availability' },
      { status: 500 }
    );
  }
}