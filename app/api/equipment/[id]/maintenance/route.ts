import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { notes, scheduledDate } = await request.json();

    const { data, error } = await supabaseAdmin
      .from('equipment_maintenance')
      .insert({
        equipment_id: params.id,
        notes,
        scheduled_date: scheduledDate,
        status: 'scheduled'
      })
      .select()
      .single();

    if (error) throw error;

    // Update equipment status
    await supabaseAdmin
      .from('equipment')
      .update({ status: 'maintenance_scheduled' })
      .eq('id', params.id);

    return NextResponse.json({ maintenance: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to schedule maintenance' },
      { status: 500 }
    );
  }
}