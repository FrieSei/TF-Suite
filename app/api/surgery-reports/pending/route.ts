import { NextResponse } from 'next/server';
import { SurgeryReportService } from '@/lib/notes/surgery-report-service';

const reportService = new SurgeryReportService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const surgeonId = searchParams.get('surgeonId');

    if (!surgeonId) {
      return NextResponse.json(
        { error: 'Surgeon ID is required' },
        { status: 400 }
      );
    }

    const pendingReports = await reportService.getPendingReports(surgeonId);
    return NextResponse.json(pendingReports);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending reports' },
      { status: 500 }
    );
  }
}