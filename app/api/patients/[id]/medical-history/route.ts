import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('medical_records')
      .select(`
        *,
        appointments(*),
        procedures(*),
        medications(*),
        notes(*)
      `)
      .eq('patient_id', params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ medicalHistory: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch medical history' },
      { status: 500 }
    );
  }
}