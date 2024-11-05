import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('calendar_credentials')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch calendar tokens' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, tokens } = await request.json();

    if (!userId || !tokens) {
      return NextResponse.json(
        { error: 'User ID and tokens are required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('calendar_credentials')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Calendar tokens stored successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to store calendar tokens' },
      { status: 500 }
    );
  }
}