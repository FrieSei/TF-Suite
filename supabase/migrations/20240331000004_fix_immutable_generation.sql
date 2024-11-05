-- Drop the generated column
ALTER TABLE patient_clinical_notes
DROP COLUMN IF EXISTS is_locked;

-- Create an immutable function for checking lock status
CREATE OR REPLACE FUNCTION is_note_locked_immutable(lock_time TIMESTAMPTZ)
RETURNS BOOLEAN
IMMUTABLE
SECURITY INVOKER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    -- Use static comparison instead of CURRENT_TIMESTAMP
    RETURN lock_time IS NOT NULL;
END;
$$;

-- Add the column back with immutable function
ALTER TABLE patient_clinical_notes
ADD COLUMN is_locked BOOLEAN 
    GENERATED ALWAYS AS (is_note_locked_immutable(locked_at)) STORED;

-- Create a function to check current lock status
CREATE OR REPLACE FUNCTION is_note_currently_locked(note_id UUID)
RETURNS BOOLEAN
STABLE
SECURITY INVOKER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
DECLARE
    lock_time TIMESTAMPTZ;
BEGIN
    SELECT locked_at INTO lock_time
    FROM patient_clinical_notes
    WHERE id = note_id;

    RETURN lock_time IS NOT NULL AND lock_time <= CURRENT_TIMESTAMP;
END;
$$;

-- Update RLS policies to use the current lock status
DROP POLICY IF EXISTS "authorized_surgeons_update_notes" ON patient_clinical_notes;

CREATE POLICY "authorized_surgeons_update_notes" ON patient_clinical_notes
    FOR UPDATE
    USING (
        -- Must be authorized
        EXISTS (
            SELECT 1 FROM doctors d
            WHERE d.user_id = auth.uid()
            AND is_surgeon_authorized(patient_clinical_notes.id, d.id)
        )
        AND
        (
            -- Either note is not currently locked
            NOT is_note_currently_locked(id)
            OR
            -- Or updating with valid edit reason
            (NEW.edit_reason IS NOT NULL AND length(trim(NEW.edit_reason)) >= 10)
        )
    );

-- Update audit logging to use current lock status
CREATE OR REPLACE FUNCTION log_note_modifications()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO note_audit_logs (
        note_id,
        operation,
        user_id,
        metadata
    ) VALUES (
        NEW.id,
        CASE
            WHEN TG_OP = 'INSERT' THEN 'NOTE_CREATED'
            WHEN TG_OP = 'UPDATE' AND is_note_currently_locked(OLD.id) AND NEW.edit_reason IS NOT NULL THEN 'LOCKED_NOTE_MODIFIED'
            ELSE 'NOTE_UPDATED'
        END,
        auth.uid(),
        jsonb_build_object(
            'previous_version', CASE WHEN TG_OP = 'UPDATE' THEN OLD.version ELSE NULL END,
            'new_version', NEW.version,
            'edit_reason', NEW.edit_reason,
            'is_locked', is_note_currently_locked(NEW.id)
        )
    );

    RETURN NEW;
END;
$$;

-- Add helpful comments
COMMENT ON FUNCTION is_note_locked_immutable(TIMESTAMPTZ) IS 'Immutable function for checking if a note has a lock timestamp';
COMMENT ON FUNCTION is_note_currently_locked(UUID) IS 'Checks if a note is currently locked based on current timestamp';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_note_locked_immutable(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION is_note_currently_locked(UUID) TO authenticated;

-- Verify setup
DO $$
BEGIN
    -- Verify functions exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname IN ('is_note_locked_immutable', 'is_note_currently_locked')
    ) THEN
        RAISE EXCEPTION 'Required functions not created';
    END IF;

    -- Verify generated column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'patient_clinical_notes'
        AND column_name = 'is_locked'
        AND is_generated = 'ALWAYS'
    ) THEN
        RAISE EXCEPTION 'Generated column not created correctly';
    END IF;
END $$;