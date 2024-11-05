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

  async createNote(
    patientId: string,
    surgeonId: string,
    content: string,
    metadata: any
  ) {
    try {
      const { encryptedContent, iv, authTag } = await this.encryptionService.encryptNote(
        content
      );

      const { encryptedContent: encryptedMeta, iv: metaIv, authTag: metaAuthTag } = 
        await this.encryptionService.encryptNote(JSON.stringify(metadata));

      const { data, error } = await supabaseAdmin
        .from('patient_clinical_notes')
        .insert({
          patient_id: patientId,
          surgeon_id: surgeonId,
          encrypted_content: encryptedContent,
          iv,
          auth_tag: authTag,
          encrypted_metadata: encryptedMeta,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          locked_at: addHours(new Date(), 12).toISOString() // Lock after 12 hours
        })
        .select()
        .single();

      if (error) throw error;

      // Log note creation
      await this.auditLogger.log({
        operation: 'NOTE_CREATED',
        userId: surgeonId,
        metadata: {
          noteId: data.id,
          patientId,
          timestamp: new Date().toISOString()
        }
      });

      return data;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  }

  async updateNote(
    noteId: string,
    surgeonId: string,
    content: string,
    metadata?: any
  ) {
    try {
      // Check if note is locked
      const { data: note } = await supabaseAdmin
        .from('patient_clinical_notes')
        .select('locked_at, surgeon_id')
        .eq('id', noteId)
        .single();

      if (!note) {
        throw new Error('Note not found');
      }

      // Verify surgeon ownership
      if (note.surgeon_id !== surgeonId) {
        throw new Error('Unauthorized to modify this note');
      }

      // Check if note is locked
      if (note.locked_at && isBefore(new Date(), new Date(note.locked_at))) {
        throw new Error('Note is locked for editing');
      }

      // Start transaction
      const { error: txError } = await supabaseAdmin.rpc('begin_transaction');
      if (txError) throw txError;

      try {
        // Get current version
        const { data: currentNote } = await supabaseAdmin
          .from('patient_clinical_notes')
          .select('version')
          .eq('id', noteId)
          .single();

        // Encrypt new content
        const { encryptedContent, iv, authTag } = await this.encryptionService.encryptNote(
          content
        );

        // Create new version
        await supabaseAdmin
          .from('note_versions')
          .insert({
            note_id: noteId,
            version: currentNote.version,
            encrypted_content: encryptedContent,
            iv,
            auth_tag: authTag,
            created_by: surgeonId,
            created_at: new Date().toISOString()
          });

        // Update note
        const updates: any = {
          encrypted_content: encryptedContent,
          iv,
          auth_tag: authTag,
          version: currentNote.version + 1,
          updated_at: new Date().toISOString(),
          locked_at: addHours(new Date(), 12).toISOString() // Reset lock period
        };

        if (metadata) {
          const { encryptedContent: encryptedMeta, iv: metaIv, authTag: metaAuthTag } = 
            await this.encryptionService.encryptNote(JSON.stringify(metadata));
          updates.encrypted_metadata = encryptedMeta;
        }

        const { data, error } = await supabaseAdmin
          .from('patient_clinical_notes')
          .update(updates)
          .eq('id', noteId)
          .select()
          .single();

        if (error) throw error;

        // Log note update
        await this.auditLogger.log({
          operation: 'NOTE_UPDATED',
          userId: surgeonId,
          metadata: {
            noteId,
            version: currentNote.version + 1,
            timestamp: new Date().toISOString()
          }
        });

        // Commit transaction
        await supabaseAdmin.rpc('commit_transaction');
        return data;
      } catch (error) {
        // Rollback on error
        await supabaseAdmin.rpc('rollback_transaction');
        throw error;
      }
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }

  async getNotesByPatient(patientId: string) {
    try {
      const { data: notes, error } = await supabaseAdmin
        .from('patient_clinical_notes')
        .select(`
          *,
          surgeon:doctors(name),
          attachments:note_attachments(*)
        `)
        .eq('patient_id', patientId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Decrypt notes
      const decryptedNotes = await Promise.all(
        notes.map(async (note) => {
          const decryptedContent = await this.encryptionService.decryptNote(
            note.encrypted_content,
            note.iv,
            note.auth_tag
          );

          const decryptedMetadata = await this.encryptionService.decryptNote(
            note.encrypted_metadata,
            note.iv,
            note.auth_tag
          );

          return {
            ...note,
            content: decryptedContent,
            metadata: JSON.parse(decryptedMetadata),
            isLocked: note.locked_at && isBefore(new Date(), new Date(note.locked_at))
          };
        })
      );

      return decryptedNotes;
    } catch (error) {
      console.error('Error fetching notes:', error);
      throw error;
    }
  }

  async getNoteHistory(noteId: string) {
    try {
      const { data: versions, error } = await supabaseAdmin
        .from('note_versions')
        .select(`
          *,
          created_by:doctors(name)
        `)
        .eq('note_id', noteId)
        .order('version', { ascending: false });

      if (error) throw error;

      // Decrypt all versions
      const decryptedVersions = await Promise.all(
        versions.map(async (version) => {
          const decryptedContent = await this.encryptionService.decryptNote(
            version.encrypted_content,
            version.iv,
            version.auth_tag
          );

          return {
            ...version,
            content: decryptedContent
          };
        })
      );

      return decryptedVersions;
    } catch (error) {
      console.error('Error fetching note history:', error);
      throw error;
    }
  }

  // Rest of the methods remain the same...
}