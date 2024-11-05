import { NextResponse } from 'next/server';
import { NoteSearchService } from '@/lib/notes/note-search-service';

const searchService = new NoteSearchService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const surgeonId = searchParams.get('surgeonId');
    const tags = searchParams.get('tags')?.split(',');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (!query || !surgeonId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const filters = {
      tags: tags || undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined
    };

    const results = await searchService.searchNotes(surgeonId, query, filters);
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to search notes' },
      { status: 500 }
    );
  }
}