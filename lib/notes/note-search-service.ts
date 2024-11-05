import { supabaseAdmin } from '@/lib/supabase';
import { NoteEncryptionService } from '../encryption/note-encryption';

interface SearchFilters {
  patientId?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export class NoteSearchService {
  private encryptionService: NoteEncryptionService;

  constructor() {
    const encryptionKey = Buffer.from(process.env.NOTE_ENCRYPTION_KEY || '', 'base64');
    this.encryptionService = new NoteEncryptionService(encryptionKey);
  }

  private prepareSearchQuery(query: string): string {
    // Convert search query to tsquery format
    return query
      .trim()
      .split(/\s+/)
      .map(term => `${term}:*`)
      .join(' & ');
  }

  async searchNotes(
    surgeonId: string,
    searchQuery: string,
    filters?: SearchFilters
  ) {
    try {
      const formattedQuery = this.prepareSearchQuery(searchQuery);

      const { data: results, error } = await supabaseAdmin.rpc(
        'search_clinical_notes',
        {
          search_query: formattedQuery,
          p_surgeon_id: surgeonId,
          p_patient_id: filters?.patientId || null,
          p_tags: filters?.tags || null,
          p_date_from: filters?.dateFrom?.toISOString() || null,
          p_date_to: filters?.dateTo?.toISOString() || null
        }
      );

      if (error) throw error;

      // Decrypt content for results
      const decryptedResults = await Promise.all(
        results.map(async (note) => {
          const decryptedContent = await this.encryptionService.decryptNote(
            note.encrypted_content,
            note.iv,
            note.auth_tag
          );

          return {
            ...note,
            content: decryptedContent,
            rank: parseFloat(note.rank)
          };
        })
      );

      return decryptedResults;
    } catch (error) {
      console.error('Error searching notes:', error);
      throw error;
    }
  }

  async updateSearchableContent(noteId: string, content: string) {
    try {
      // Update the searchable content
      const { error } = await supabaseAdmin
        .from('patient_clinical_notes')
        .update({
          decrypted_content: content
        })
        .eq('id', noteId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating searchable content:', error);
      throw error;
    }
  }
}