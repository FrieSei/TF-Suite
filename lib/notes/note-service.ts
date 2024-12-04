import { supabaseAdmin } from '@/lib/supabase';
import { NoteEncryptionService } from '@/lib/encryption/note-encryption';
import { AuditLogger } from '@/lib/security/audit-logger';
import { addHours, isBefore } from 'date-fns';

export class ClinicalNoteService {
  private encryptionService: NoteEncryptionService;
  private auditLogger: AuditLogger;

  constructor() {
    const encryptionKey = Buffer.from(process.env.NOTE_ENCRYPTION_KEY || '', 'base64');
    this.encryptionService = new NoteEncryptionService(encryptionKey);
    this.auditLogger = new AuditLogger();
  }

  async addAttachment(
    noteId: string,
    file: Buffer,
    mimeType: string,
    metadata: any
  ) {
    try {
      const { data: note } = await supabaseAdmin
        .from('patient_clinical_notes')
        .select('id, surgeon_id')
        .eq('id', noteId)
        .single();

      if (!note) {
        throw new Error('Note not found');
      }

      const { encryptedContent, iv, authTag } = await this.encryptionService.encryptNote(
        file.toString('base64')
      );

      const { encryptedContent: encryptedMeta, iv: metaIv, authTag: metaAuthTag } =
        await this.encryptionService.encryptNote(JSON.stringify(metadata));

      const { data: attachment, error } = await supabaseAdmin
        .from('note_attachments')
        .insert({
          note_id: noteId,
          encrypted_file: encryptedContent,
          iv,
          auth_tag: authTag,
          mime_type: mimeType,
          encrypted_metadata: encryptedMeta,
          meta_iv: metaIv,
          meta_auth_tag: metaAuthTag,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error || !attachment) throw new Error('Failed to add attachment');

      await this.auditLogger.log({
        operation: 'NOTE_ATTACHMENT_ADDED',
        userId: note.surgeon_id,
        metadata: {
          noteId,
          attachmentId: attachment.id,
          timestamp: new Date().toISOString(),
        },
      });

      return attachment;
    } catch (error) {
      console.error('Error adding attachment:', error);
      throw error;
    }
  }

  async getAttachment(attachmentId: string) {
    try {
      const { data: attachment, error } = await supabaseAdmin
        .from('note_attachments')
        .select('*')
        .eq('id', attachmentId)
        .single();

      if (error) throw error;
      if (!attachment) throw new Error('Attachment not found');

      const fileContent = await this.encryptionService.decryptNote(
        attachment.encrypted_file,
        attachment.iv,
        attachment.auth_tag
      );

      const decryptedMetadata = await this.encryptionService.decryptNote(
        attachment.encrypted_metadata,
        attachment.meta_iv,
        attachment.meta_auth_tag
      );

      return {
        file: Buffer.from(fileContent, 'base64'),
        mime_type: attachment.mime_type,
        metadata: JSON.parse(decryptedMetadata),
      };
    } catch (error) {
      console.error('Error fetching attachment:', error);
      throw error;
    }
  }

  async getNoteHistory(noteId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('patient_clinical_notes_history')
        .select('*')
        .eq('note_id', noteId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        return [];
      }

      return await Promise.all(
        data.map(async (entry) => ({
          ...entry,
          content: await this.encryptionService.decryptNote(
            entry.encrypted_content,
            entry.iv,
            entry.auth_tag
          ),
        }))
      );
    } catch (error) {
      console.error('Error fetching note history:', error);
      throw error;
    }
  }
}
