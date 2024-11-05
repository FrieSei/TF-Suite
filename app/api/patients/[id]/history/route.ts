import { NextResponse } from 'next/server';
import { ReferenceService } from '@/lib/notes/reference-service';

const referenceService = new ReferenceService();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const timeline = await referenceService.getPatientHistory(params.id);
    return NextResponse.json(timeline);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch patient history' },
      { status: 500 }
    );
  }
}