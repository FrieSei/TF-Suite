import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { ReferenceService } from '@/lib/notes/reference-service';

const referenceService = new ReferenceService();

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { type, targetId } = await request.json();
    const { data: { session } } = await supabaseAdmin.auth.getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await referenceService.addReference(
      params.id,
      type,
      targetId,
      session.user.id
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to add reference' },
      { status: 500 }
    );
  }
}
