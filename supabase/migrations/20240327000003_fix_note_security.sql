-- Drop existing functions and recreate with proper security
DROP FUNCTION IF EXISTS is_note_locked_immutable CASCADE;
DROP FUNCTION IF EXISTS is_note_locked CASCADE;
DROP FUNCTION IF EXISTS prevent_locked_note_updates CASCADE;

-- Create immutable function for checking lock status
CREATE OR REPLACE FUNCTION is_note_locked_immutable(lock_time TIMESTAMPTZ)
RETURNS BOOLEAN
IMMUTABLE
LEAKPROOF
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    RETURN lock_time IS NOT NULL AND lock_time > CURRENT_TIMESTAMP;
END;
$$;

-- Create stable function for checking note lock status
CREATE OR REPLACE FUNCTION is_note_locked(note_id UUID)
RETURNS BOOLEAN
STABLE
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
DECLARE
    lock_time TIMESTAMPTZ;
BEGIN
    SELECT locked_at INTO lock_time
    FROM patient_clinical_notes
    WHERE id = note_id;

    RETURN is_note_locked_immutable(lock_time);
END;
$$;

-- Create trigger function to prevent updates on locked notes
CREATE OR REPLACE FUNCTION prevent_locked_note_updates()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    IF is_note_locked_immutable(OLD.locked_at) THEN
        -- Allow updates to specific fields even when locked
        IF (TG_OP = 'UPDATE' AND (
            NEW.encrypted_content IS DISTINCT FROM OLD.encrypted_content OR
            NEW.encrypted_metadata IS DISTINCT FROM OLD.encrypted_metadata
        )) THEN
            -- Ensure audit logging for locked note modifications
            INSERT INTO note_audit_logs (
                note_id,
                operation,
                user_id,
                metadata
            ) VALUES (
                NEW.id,
                'LOCKED_NOTE_MODIFIED',
                auth.uid(),
                jsonb_build_object(
                    'reason', NEW.edit_reason,
                    'previous_version', OLD.version,
                    'new_version', NEW.version
                )
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Add RLS policies for clinical notes
ALTER TABLE patient_clinical_notes ENABLE ROW LEVEL SECURITY;

-- Surgeons can view their own notes
CREATE POLICY "surgeons_view_own_notes" ON patient_clinical_notes
    FOR SELECT
    USING (surgeon_id = auth.uid());

-- Surgeons can create notes for their patients
CREATE POLICY "surgeons_create_notes" ON patient_clinical_notes
    FOR INSERT
    WITH CHECK (surgeon_id = auth.uid());

-- Surgeons can update their own notes if not locked
CREATE POLICY "surgeons_update_notes" ON patient_clinical_notes
    FOR UPDATE
    USING (
        surgeon_id = auth.uid() AND
        (NOT is_note_locked_immutable(locked_at) OR edit_reason IS NOT NULL)
    );

-- Add index for faster note queries
CREATE INDEX IF NOT EXISTS idx_notes_surgeon_patient ON patient_clinical_notes(surgeon_id, patient_id);

-- Add helpful comments
COMMENT ON FUNCTION is_note_locked_immutable(TIMESTAMPTZ) IS 'Immutable function for checking if a timestamp represents a locked state';
COMMENT ON FUNCTION is_note_locked(UUID) IS 'Checks if a specific note is currently locked for editing';
COMMENT ON FUNCTION prevent_locked_note_updates() IS 'Prevents unauthorized updates to locked notes and handles audit logging';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_note_locked_immutable(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION is_note_locked(UUID) TO authenticated;

-- Add edit reason column for locked note modifications
ALTER TABLE patient_clinical_notes
ADD COLUMN IF NOT EXISTS edit_reason TEXT;