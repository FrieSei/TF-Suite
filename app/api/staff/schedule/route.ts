import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const location = searchParams.get('location');

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    const dayStart = startOfDay(new Date(date)).toISOString();
    const dayEnd = endOfDay(new Date(date)).toISOString();

    let query = supabaseAdmin
      .from('staff_schedules')
      .select(`
        *,
        staff:doctors(*)
      `)
      .gte('start_time', dayStart)
      .lte('end_time', dayEnd);

    if (location) query = query.eq('location', location);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ schedules: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch staff schedules' },
      { status: 500 }
    );
  }
}