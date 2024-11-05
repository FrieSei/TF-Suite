import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const surgeonId = searchParams.get('surgeonId');
    const search = searchParams.get('search');

    let query = supabaseAdmin
      .from('patients')
      .select(`
        *,
        appointments:appointments(*)
      `);

    if (surgeonId) {
      query = query.eq('appointments.surgeon_id', surgeonId);
    }

    if (search) {
      query = query.or(`
        name.ilike.%${search}%,
        email.ilike.%${search}%,
        phone.ilike.%${search}%
      `);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ patients: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch patients' },
      { status: 500 }
    );
  }
}