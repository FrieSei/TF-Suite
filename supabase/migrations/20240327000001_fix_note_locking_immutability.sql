-- Drop existing function and index
DROP INDEX IF EXISTS idx_notes_locked_at;
DROP FUNCTION IF EXISTS is_note_locked CASCADE;

-- Create immutable function for checking lock status
CREATE OR REPLACE FUNCTION is_note_locked_immutable(lock_time TIMESTAMPTZ)
RETURNS BOOLEAN
IMMUTABLE
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

-- Recreate index using immutable function
CREATE INDEX idx_notes_locked_at 
ON patient_clinical_notes(locked_at)
WHERE is_note_locked_immutable(locked_at);

-- Update trigger function to use immutable function
CREATE OR REPLACE FUNCTION prevent_locked_note_updates()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    IF is_note_locked_immutable(OLD.locked_at) THEN
        RAISE EXCEPTION 'Cannot modify locked note';
    END IF;
    RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS enforce_note_lock ON patient_clinical_notes;
CREATE TRIGGER enforce_note_lock
    BEFORE UPDATE ON patient_clinical_notes
    FOR EACH ROW
    EXECUTE FUNCTION prevent_locked_note_updates();

-- Add helpful comments
COMMENT ON FUNCTION is_note_locked_immutable(TIMESTAMPTZ) IS 'Immutable function for checking if a timestamp represents a locked state';
COMMENT ON FUNCTION is_note_locked(UUID) IS 'Checks if a specific note is currently locked for editing';
COMMENT ON FUNCTION prevent_locked_note_updates() IS 'Prevents updates to locked notes';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_note_locked_immutable(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION is_note_locked(UUID) TO authenticated;