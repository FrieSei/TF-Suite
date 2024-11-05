import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { setupUserByRole } from '@/lib/auth/role-setup';

export async function POST(request: Request) {
  try {
    const { token, password, userData } = await request.json();

    if (!token || !password || !userData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the invitation token
    const { data: verifyData, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
      token_hash: token,
      type: 'invite',
    });

    if (verifyError || !verifyData.user) {
      return NextResponse.json(
        { error: verifyError?.message || 'Invalid invitation' },
        { status: 400 }
      );
    }

    // Set password for the new user
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      verifyData.user.id,
      { password }
    );

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Set up role-specific configurations
    await setupUserByRole(
      supabaseAdmin,
      verifyData.user.id,
      userData.role,
      userData.location ? [userData.location] : undefined
    );

    return NextResponse.json(
      {
        message: 'Account setup completed successfully',
        user: updateData.user,
        redirect: `/${userData.role}-dashboard`
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to complete account setup'
      },
      { status: 500 }
    );
  }
}