-- Drop existing functions
DROP FUNCTION IF EXISTS is_note_locked_immutable CASCADE;
DROP FUNCTION IF EXISTS is_note_locked CASCADE;
DROP FUNCTION IF EXISTS prevent_locked_note_updates CASCADE;

-- Create immutable function for checking lock status without LEAKPROOF
CREATE OR REPLACE FUNCTION is_note_locked_immutable(lock_time TIMESTAMPTZ)
RETURNS BOOLEAN
IMMUTABLE
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    -- Simple timestamp comparison is safe without LEAKPROOF
    RETURN CASE
        WHEN lock_time IS NULL THEN false
        ELSE lock_time > CURRENT_TIMESTAMP
    END;
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
    -- Only fetch locked_at timestamp for authorized users
    SELECT locked_at INTO lock_time
    FROM patient_clinical_notes
    WHERE id = note_id
    AND surgeon_id = auth.uid();

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
    -- Verify user has permission to modify this note
    IF OLD.surgeon_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized to modify this note';
    END IF;

    IF is_note_locked_immutable(OLD.locked_at) THEN
        -- Allow updates to specific fields even when locked
        IF (TG_OP = 'UPDATE' AND (
            NEW.encrypted_content IS DISTINCT FROM OLD.encrypted_content OR
            NEW.encrypted_metadata IS DISTINCT FROM OLD.encrypted_metadata
        )) THEN
            IF NEW.edit_reason IS NULL OR length(trim(NEW.edit_reason)) < 1 THEN
                RAISE EXCEPTION 'Edit reason is required for locked notes';
            END IF;

            -- Log modification of locked note
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

-- Recreate trigger
DROP TRIGGER IF EXISTS enforce_note_lock ON patient_clinical_notes;
CREATE TRIGGER enforce_note_lock
    BEFORE UPDATE ON patient_clinical_notes
    FOR EACH ROW
    EXECUTE FUNCTION prevent_locked_note_updates();

-- Add helpful comments
COMMENT ON FUNCTION is_note_locked_immutable(TIMESTAMPTZ) IS 'Checks if a timestamp represents a locked state (immutable)';
COMMENT ON FUNCTION is_note_locked(UUID) IS 'Checks if a specific note is currently locked for editing';
COMMENT ON FUNCTION prevent_locked_note_updates() IS 'Prevents unauthorized updates to locked notes and handles audit logging';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_note_locked_immutable(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION is_note_locked(UUID) TO authenticated;