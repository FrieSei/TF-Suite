import { supabaseAdmin } from '@/lib/supabase';
import { NoteEncryptionService } from '@/lib/encryption/note-encryption';
import { AuditLogger } from '@/lib/security/audit-logger';
import { addHours } from 'date-fns';

export class ClinicalNoteService {
  private encryptionService: NoteEncryptionService;
  private auditLogger: AuditLogger;

  constructor() {
    const encryptionKey = Buffer.from(process.env.NOTE_ENCRYPTION_KEY || '', 'base64');
    this.encryptionService = new NoteEncryptionService(encryptionKey);
    this.auditLogger = new AuditLogger();
  }

  async createNote(
    patientId: string,
    surgeonId: string,
    content: string,
    metadata: any
  ) {
    try {
      // Encrypt the content
      const { encryptedContent, iv, authTag } = await this.encryptionService.encryptNote(content);

      // Encrypt the metadata
      const { encryptedContent: encryptedMeta, iv: metaIv, authTag: metaAuthTag } =
        await this.encryptionService.encryptNote(JSON.stringify(metadata));

      // Insert the new note
      const { data: note, error } = await supabaseAdmin
        .from('patient_clinical_notes')
        .insert({
          patient_id: patientId,
          surgeon_id: surgeonId,
          encrypted_content: encryptedContent,
          iv,
          auth_tag: authTag,
          encrypted_metadata: encryptedMeta,
          meta_iv: metaIv,
          meta_auth_tag: metaAuthTag,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          locked_at: addHours(new Date(), 12).toISOString(), // Lock note after 12 hours
        })
        .select()
        .single();

      if (error) throw new Error('Failed to create note');

      // Log the note creation
      await this.auditLogger.log({
        operation: 'NOTE_CREATED',
        userId: surgeonId,
        metadata: {
          noteId: note.id,
          patientId,
          timestamp: new Date().toISOString(),
        },
      });

      return note;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  }

  // Other methods remain unchanged...
  async addAttachment(
    noteId: string,
    file: Buffer,
    mimeType: string,
    metadata: any
  ) {
    // Method implementation...
  }

  async getAttachment(attachmentId: string) {
    // Method implementation...
  }

  async getNoteHistory(noteId: string) {
    // Method implementation...
  }

  async getNotesByPatient(patientId: string) {
    // Method implementation...
  }

  async updateNote(noteId: string, content: string, metadata: any) {
    // Method implementation...
  }

  async deleteNote(noteId: string) {
    // Method implementation...
  }
}
