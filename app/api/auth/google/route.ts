"use client";

import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const location = searchParams.get('location') || 'Vienna';

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Generate state parameter with user ID and location
    const state = Buffer.from(JSON.stringify({
      userId,
      location,
      returnTo: searchParams.get('returnTo') || '/settings'
    })).toString('base64');

    // Get authorization URL
    const authUrl = getAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating Google auth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google authentication' },
      { status: 500 }
    );
  }
}