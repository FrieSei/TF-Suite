import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('equipment')
      .select('*');

    if (location) query = query.eq('location', location);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ equipment: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, error } = await supabaseAdmin
      .from('equipment')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ equipment: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create equipment' },
      { status: 500 }
    );
  }
}