import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Missing invitation token' },
        { status: 400 }
      );
    }

    // Verify the invitation token
    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      token_hash: token,
      type: 'invite',
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Extract user metadata
    const userData = {
      role: data.user?.user_metadata?.role || 'backoffice',
      location: data.user?.user_metadata?.location || 'Vienna',
      email: data.user?.email
    };

    return NextResponse.json(
      { 
        message: 'Invitation verified successfully',
        userData
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: error.message || 'Failed to verify invitation' 
      },
      { status: 500 }
    );
  }
}