import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Search appointments
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        event_type:event_types(*),
        surgeon:doctors(*)
      `)
      .textSearch('search_text', query)
      .limit(5);

    // Search notes
    const { data: notes } = await supabaseAdmin
      .from('patient_clinical_notes')
      .select(`
        *,
        surgeon:doctors(*)
      `)
      .textSearch('search_text', query)
      .limit(5);

    return NextResponse.json({
      appointments: appointments || [],
      notes: notes || []
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to search references' },
      { status: 500 }
    );
  }
}