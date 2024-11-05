import { NextResponse } from 'next/server';
import { CalendarIntegrationService } from '@/lib/google/calendar-integration';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect('/settings?error=Invalid authorization response');
    }

    // Decode state parameter
    const { userId, location, returnTo } = JSON.parse(
      Buffer.from(state, 'base64').toString()
    );

    if (!userId || !location) {
      return NextResponse.redirect('/settings?error=Invalid state parameter');
    }

    // Store tokens and create calendars
    const service = new CalendarIntegrationService();
    await service.storeCalendarTokens(code, userId, location);

    return NextResponse.redirect(returnTo + '?success=Calendar connected successfully');
  } catch (error) {
    console.error('Error in Google callback:', error);
    return NextResponse.redirect('/settings?error=Failed to connect calendar');
  }
}