-- First add the locked_at column if it doesn't exist
ALTER TABLE patient_clinical_notes
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS enforce_note_lock ON patient_clinical_notes;
DROP FUNCTION IF EXISTS prevent_locked_note_updates() CASCADE;
DROP FUNCTION IF EXISTS is_note_locked CASCADE;
DROP FUNCTION IF EXISTS is_note_locked_immutable CASCADE;
DROP INDEX IF EXISTS idx_notes_locked_at;

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

-- Create index using immutable function
CREATE INDEX idx_notes_locked_at 
ON patient_clinical_notes(locked_at)
WHERE is_note_locked_immutable(locked_at);

-- Create trigger function to prevent updates on locked notes
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

-- Create trigger
CREATE TRIGGER enforce_note_lock
    BEFORE UPDATE ON patient_clinical_notes
    FOR EACH ROW
    EXECUTE FUNCTION prevent_locked_note_updates();

-- Add audit logging for lock operations
CREATE OR REPLACE FUNCTION log_note_lock_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.locked_at IS DISTINCT FROM NEW.locked_at THEN
        INSERT INTO note_audit_logs (
            note_id,
            operation,
            user_id,
            metadata
        ) VALUES (
            NEW.id,
            CASE 
                WHEN NEW.locked_at IS NULL THEN 'NOTE_UNLOCKED'
                ELSE 'NOTE_LOCKED'
            END,
            auth.uid(),
            jsonb_build_object(
                'previous_lock', OLD.locked_at,
                'new_lock', NEW.locked_at
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for lock audit logging
CREATE TRIGGER log_note_lock_changes
    AFTER UPDATE OF locked_at ON patient_clinical_notes
    FOR EACH ROW
    EXECUTE FUNCTION log_note_lock_change();

-- Add helpful comments
COMMENT ON COLUMN patient_clinical_notes.locked_at IS 'Timestamp until which the note is locked for editing';
COMMENT ON FUNCTION is_note_locked_immutable(TIMESTAMPTZ) IS 'Immutable function for checking if a timestamp represents a locked state';
COMMENT ON FUNCTION is_note_locked(UUID) IS 'Checks if a specific note is currently locked for editing';
COMMENT ON FUNCTION prevent_locked_note_updates() IS 'Prevents updates to locked notes';
COMMENT ON FUNCTION log_note_lock_change() IS 'Logs changes to note lock status';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_note_locked_immutable(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION is_note_locked(UUID) TO authenticated;

-- Verify setup
DO $$
BEGIN
    -- Verify column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'patient_clinical_notes' 
        AND column_name = 'locked_at'
    ) THEN
        RAISE EXCEPTION 'locked_at column was not created successfully';
    END IF;

    -- Verify index exists
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'patient_clinical_notes'
        AND indexname = 'idx_notes_locked_at'
    ) THEN
        RAISE EXCEPTION 'Index was not created successfully';
    END IF;

    -- Verify triggers exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname IN ('enforce_note_lock', 'log_note_lock_changes')
    ) THEN
        RAISE EXCEPTION 'Triggers were not created successfully';
    END IF;
END $$;