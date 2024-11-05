import { NextResponse } from 'next/server';
import { ClinicalNoteService } from '@/lib/notes/note-service';

const noteService = new ClinicalNoteService();

export async function POST(request: Request) {
  try {
    const { patientId, surgeonId, content, metadata } = await request.json();

    if (!patientId || !surgeonId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const note = await noteService.createNote(
      patientId,
      surgeonId,
      content,
      metadata
    );

    return NextResponse.json({ note });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create note' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const surgeonId = searchParams.get('surgeonId');

    if (!patientId || !surgeonId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const { data: notes, error } = await supabaseAdmin
      .from('patient_clinical_notes')
      .select('*')
      .eq('patient_id', patientId)
      .eq('surgeon_id', surgeonId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ notes });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}