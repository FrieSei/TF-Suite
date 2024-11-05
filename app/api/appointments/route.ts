import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { format } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const surgeonId = searchParams.get('surgeonId');
    const location = searchParams.get('location');
    const status = searchParams.get('status');

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Build the query
    let query = supabaseAdmin
      .from('appointments')
      .select(`
        *,
        event_type:event_types(*),
        surgeon:doctors!surgeon_id(*),
        anesthesiologist:doctors!anesthesiologist_id(*)
      `)
      .eq('date', date);

    // Add optional filters
    if (surgeonId) query = query.eq('surgeon_id', surgeonId);
    if (location) query = query.eq('location', location);
    if (status) query = query.eq('status', status);

    // Execute query
    const { data: appointments, error } = await query;

    if (error) throw error;

    return NextResponse.json({ appointments });
  } catch (error: any) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}