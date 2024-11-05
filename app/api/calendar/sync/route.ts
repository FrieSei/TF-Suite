import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createDefaultCalendars } from '@/lib/google/calendar-setup';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if calendars already exist
    const { data: existingCalendars } = await supabaseAdmin
      .from('calendar_integrations')
      .select('calendar_id')
      .eq('user_id', userId)
      .limit(1);

    if (!existingCalendars?.length) {
      await createDefaultCalendars(userId);
    }

    return NextResponse.json({
      success: true,
      message: 'Calendar sync completed successfully'
    });
  } catch (error: any) {
    console.error('Error syncing calendars:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync calendars' },
      { status: 500 }
    );
  }
}