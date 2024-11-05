import { NextResponse } from 'next/server';
import { ClinicalNoteService } from '@/lib/notes/note-service';

const noteService = new ClinicalNoteService();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const versions = await noteService.getNoteHistory(params.id);
    return NextResponse.json(versions);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch note history' },
      { status: 500 }
    );
  }
}