import { NextResponse } from 'next/server';
import { triggerConsultationNotifications } from '@/lib/ptl/notifications';

export async function POST() {
  try {
    await triggerConsultationNotifications();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing PTL notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process notifications' },
      { status: 500 }
    );
  }
}