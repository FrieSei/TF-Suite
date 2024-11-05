import { NextResponse } from 'next/server';
import { NotificationScheduler } from '@/lib/notifications/scheduler';

export async function POST() {
  try {
    const scheduler = new NotificationScheduler();
    await scheduler.processScheduledNotifications();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process notifications' },
      { status: 500 }
    );
  }
}