export interface NoteVersion {
  id: string;
  note_id: string;
  version: number;
  encrypted_content: string;
  iv: string;
  auth_tag: string;
  created_by: string;
  created_at: string;
  content?: string;
  doctor?: {
    name: string;
  };
}

export interface NoteAttachment {
  id: string;
  note_id: string;
  encrypted_file: string;
  iv: string;
  auth_tag: string;
  mime_type: string;
  encrypted_metadata: string;
  meta_iv: string;
  meta_auth_tag: string;
  created_at: string;
}

export interface IClinicalNoteService {
  createNote(
    patientId: string,
    surgeonId: string,
    content: string,
    metadata: any
  ): Promise<any>;

  updateNote(
    noteId: string,
    surgeonId: string,
    content: string,
    metadata?: any
  ): Promise<any>;

  getNotesByPatient(patientId: string): Promise<any[]>;

  getNoteHistory(noteId: string): Promise<NoteVersion[]>;

  addAttachment(
    noteId: string,
    file: Buffer,
    mimeType: string,
    metadata: any
  ): Promise<NoteAttachment>;

  getAttachment(attachmentId: string): Promise<{
    file: Buffer;
    mime_type: string;
    metadata: any;
  }>;
}

