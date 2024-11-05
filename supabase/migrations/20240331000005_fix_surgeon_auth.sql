-- Create function to check surgeon authorization
CREATE OR REPLACE FUNCTION is_surgeon_authorized(
    note_id UUID,
    checking_surgeon_id UUID
)
RETURNS BOOLEAN
STABLE
SECURITY INVOKER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
DECLARE
    _note RECORD;
BEGIN
    -- Get note details
    SELECT 
        n.creator_id,
        n.surgeon_id,
        n.case_id,
        n.authorized_surgeons
    INTO _note
    FROM patient_clinical_notes n
    WHERE n.id = note_id;

    -- Check various authorization conditions
    RETURN (
        -- Is creator
        _note.creator_id = checking_surgeon_id
        OR
        -- Is responsible surgeon
        _note.surgeon_id = checking_surgeon_id
        OR
        -- Is in authorized surgeons list
        checking_surgeon_id = ANY(_note.authorized_surgeons)
        OR
        -- Is participant in the case
        (_note.case_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM case_participants
            WHERE case_id = _note.case_id
            AND surgeon_id = checking_surgeon_id
        ))
    );
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION is_surgeon_authorized(UUID, UUID) IS 'Checks if a surgeon is authorized to access a clinical note';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_surgeon_authorized(UUID, UUID) TO authenticated;

-- Verify function exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname = 'is_surgeon_authorized'
    ) THEN
        RAISE EXCEPTION 'Surgeon authorization function not created successfully';
    END IF;

    -- Verify function is not SECURITY DEFINER
    IF EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname = 'is_surgeon_authorized'
        AND prosecdef = true
    ) THEN
        RAISE EXCEPTION 'Function should not be SECURITY DEFINER';
    END IF;
END $$;