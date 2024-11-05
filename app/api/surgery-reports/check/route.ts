import { NextResponse } from 'next/server';
import { SurgeryReportService } from '@/lib/notes/surgery-report-service';

const reportService = new SurgeryReportService();

export async function POST() {
  try {
    // Check for overdue reports
    await reportService.checkOverdueReports();
    
    // Send reminders for upcoming deadlines
    await reportService.sendReminders();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process surgery reports' },
      { status: 500 }
    );
  }
}