import { NextResponse } from 'next/server';
import { CalendarSearchService } from '@/lib/calendar/calendar-search-service';

const searchService = new CalendarSearchService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const surgeonId = searchParams.get('surgeonId');
    const location = searchParams.get('location');
    const status = searchParams.get('status');
    const upcomingOnly = searchParams.get('upcomingOnly') === 'true';

    const filters = {
      surgeonId: surgeonId || undefined,
      location: location as any || undefined,
      status: status as any || undefined,
      upcomingOnly
    };

    const results = await searchService.searchAppointments(query, filters);
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to search appointments' },
      { status: 500 }
    );
  }
}