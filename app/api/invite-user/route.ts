import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { email, role, location } = await request.json();

    if (!email || !role || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { 
          role,
          location,
          invited_at: new Date().toISOString()
        },
      }
    );

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Invitation sent successfully',
        data 
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: error.message || 'Failed to send invitation' 
      },
      { status: 500 }
    );
  }
}