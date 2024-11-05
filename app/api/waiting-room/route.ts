import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');

    const today = new Date().toISOString();

    let query = supabaseAdmin
      .from('appointments')
      .select(`
        *,
        patient:patients(*),
        surgeon:doctors!surgeon_id(*),
        event_type:event_types(*)
      `)
      .eq('status', 'scheduled')
      .eq('date', today.split('T')[0]);

    if (location) query = query.eq('location', location);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ waitingRoom: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch waiting room data' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { appointmentId, status } = await request.json();

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ appointment: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update waiting room status' },
      { status: 500 }
    );
  }
}