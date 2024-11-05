-- Add locking column to patient_clinical_notes
ALTER TABLE patient_clinical_notes
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- Add index for faster locked status queries
CREATE INDEX IF NOT EXISTS idx_notes_locked_at 
ON patient_clinical_notes(locked_at)
WHERE locked_at > now();

-- Create function to check if note is locked
CREATE OR REPLACE FUNCTION is_note_locked(note_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
DECLARE
    lock_time TIMESTAMPTZ;
BEGIN
    SELECT locked_at INTO lock_time
    FROM patient_clinical_notes
    WHERE id = note_id;

    RETURN lock_time IS NOT NULL AND lock_time > now();
END;
$$;

-- Create trigger to prevent updates on locked notes
CREATE OR REPLACE FUNCTION prevent_locked_note_updates()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.locked_at IS NOT NULL AND OLD.locked_at > now() THEN
        RAISE EXCEPTION 'Cannot modify locked note';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_note_lock
    BEFORE UPDATE ON patient_clinical_notes
    FOR EACH ROW
    EXECUTE FUNCTION prevent_locked_note_updates();

-- Add audit logging for note operations
CREATE TABLE IF NOT EXISTS note_audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    note_id UUID REFERENCES patient_clinical_notes(id) NOT NULL,
    operation TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for faster audit log queries
CREATE INDEX idx_note_audit_logs 
ON note_audit_logs(note_id, created_at);

-- Enable RLS on audit logs
ALTER TABLE note_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit logs
CREATE POLICY "Surgeons can view their note audit logs" ON note_audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM patient_clinical_notes
            WHERE id = note_id
            AND surgeon_id = auth.uid()
        )
    );

-- Add helpful comments
COMMENT ON COLUMN patient_clinical_notes.locked_at IS 'Timestamp until which the note is locked for editing';
COMMENT ON TABLE note_audit_logs IS 'Audit trail for clinical note operations';
COMMENT ON FUNCTION is_note_locked(UUID) IS 'Checks if a note is currently locked for editing';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_note_locked(UUID) TO authenticated;