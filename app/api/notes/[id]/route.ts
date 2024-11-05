import { NextResponse } from 'next/server';
import { ClinicalNoteService } from '@/lib/notes/note-service';

const noteService = new ClinicalNoteService();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const notes = await noteService.getNotesByPatient(params.id);
    return NextResponse.json({ notes });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { content, metadata } = await request.json();
    const note = await noteService.updateNote(params.id, content, metadata);
    return NextResponse.json({ note });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update note' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await noteService.deleteNote(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete note' },
      { status: 500 }
    );
  }
}