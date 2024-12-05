import { NextResponse } from 'next/server';
import { ClinicalNoteService } from '@/lib/notes/note-service';

const noteService = new ClinicalNoteService();

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadata = JSON.parse(formData.get('metadata') as string);

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const attachment = await noteService.addAttachment(
      params.id,
      buffer,
      file.type,
      metadata
    );

    return NextResponse.json({ attachment });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to upload attachment' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'Attachment ID is required' },
        { status: 400 }
      );
    }

    const attachment = await noteService.getAttachment(attachmentId);

    return new NextResponse(attachment.file, {
      headers: {
        'Content-Type': attachment.mime_type,
        'Content-Disposition': `attachment; filename="${attachment.metadata.fileName}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch attachment' },
      { status: 500 }
    );
  }
}
