-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create encrypted notes table
CREATE TABLE IF NOT EXISTS public.patient_clinical_notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES profiles(id) NOT NULL,
    surgeon_id UUID REFERENCES doctors(id) NOT NULL,
    -- Encrypted content using AES-256-GCM
    encrypted_content BYTEA NOT NULL,
    -- Initialization vector for encryption
    iv BYTEA NOT NULL,
    -- Authentication tag
    auth_tag BYTEA NOT NULL,
    -- Metadata (encrypted)
    encrypted_metadata BYTEA NOT NULL,
    -- File attachments (encrypted)
    attachments JSONB DEFAULT '[]',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    
    -- Ensure only soft deletes
    CONSTRAINT active_note CHECK (deleted_at IS NULL)
);

-- Create note attachments table
CREATE TABLE IF NOT EXISTS public.note_attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    note_id UUID REFERENCES patient_clinical_notes(id) NOT NULL,
    encrypted_file BYTEA NOT NULL,
    file_iv BYTEA NOT NULL,
    file_auth_tag BYTEA NOT NULL,
    encrypted_metadata BYTEA NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create note version history
CREATE TABLE IF NOT EXISTS public.note_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    note_id UUID REFERENCES patient_clinical_notes(id) NOT NULL,
    version INTEGER NOT NULL,
    encrypted_content BYTEA NOT NULL,
    iv BYTEA NOT NULL,
    auth_tag BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES profiles(id) NOT NULL
);

-- Add indexes
CREATE INDEX idx_notes_patient ON patient_clinical_notes(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_surgeon ON patient_clinical_notes(surgeon_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_note_attachments ON note_attachments(note_id);
CREATE INDEX idx_note_versions ON note_versions(note_id, version);

-- Add RLS policies
ALTER TABLE patient_clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_versions ENABLE ROW LEVEL SECURITY;

-- Only surgeons can access their own notes
CREATE POLICY "surgeons_access_own_notes" ON patient_clinical_notes
    FOR ALL
    USING (
        surgeon_id IN (
            SELECT id FROM doctors 
            WHERE user_id = auth.uid() 
            AND role = 'SURGEON'
        )
    );

-- Attachments accessible only to note owners
CREATE POLICY "surgeons_access_own_attachments" ON note_attachments
    FOR ALL
    USING (
        note_id IN (
            SELECT id FROM patient_clinical_notes
            WHERE surgeon_id IN (
                SELECT id FROM doctors 
                WHERE user_id = auth.uid() 
                AND role = 'SURGEON'
            )
        )
    );

-- Versions accessible only to note owners
CREATE POLICY "surgeons_access_own_versions" ON note_versions
    FOR ALL
    USING (
        note_id IN (
            SELECT id FROM patient_clinical_notes
            WHERE surgeon_id IN (
                SELECT id FROM doctors 
                WHERE user_id = auth.uid() 
                AND role = 'SURGEON'
            )
        )
    );