-- Create enum for surgeon participation types
CREATE TYPE surgeon_participation_type AS ENUM (
    'PRIMARY',
    'ASSISTANT',
    'CONSULTANT'
);

-- Create case participation table
CREATE TABLE IF NOT EXISTS public.case_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    case_id UUID REFERENCES surgeries(id) NOT NULL,
    surgeon_id UUID REFERENCES doctors(id) NOT NULL,
    participation_type surgeon_participation_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    
    CONSTRAINT unique_case_surgeon UNIQUE(case_id, surgeon_id)
);

-- Add authorized surgeons array to clinical notes
ALTER TABLE patient_clinical_notes
ADD COLUMN IF NOT EXISTS authorized_surgeons UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES surgeries(id),
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES doctors(id) NOT NULL,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN 
    GENERATED ALWAYS AS (
        locked_at IS NOT NULL AND locked_at <= CURRENT_TIMESTAMP
    ) STORED;

-- Create index for faster authorization checks
CREATE INDEX idx_notes_auth_surgeons 
ON patient_clinical_notes USING GIN (authorized_surgeons);

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
        EXISTS (
            SELECT 1 FROM case_participants
            WHERE case_id = _note.case_id
            AND surgeon_id = checking_surgeon_id
        )
    );
END;
$$;

-- Create function to automatically update authorized surgeons
CREATE OR REPLACE FUNCTION update_note_authorized_surgeons()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    -- Add case participants to authorized surgeons
    IF NEW.case_id IS NOT NULL THEN
        SELECT array_agg(DISTINCT surgeon_id)
        INTO NEW.authorized_surgeons
        FROM case_participants
        WHERE case_id = NEW.case_id;
    END IF;

    -- Always ensure creator and responsible surgeon are authorized
    NEW.authorized_surgeons = ARRAY(
        SELECT DISTINCT unnest(
            array_cat(
                array_cat(
                    COALESCE(NEW.authorized_surgeons, ARRAY[]::UUID[]),
                    ARRAY[NEW.creator_id]
                ),
                ARRAY[NEW.surgeon_id]
            )
        )
    );

    RETURN NEW;
END;
$$;

-- Create trigger for authorized surgeons updates
CREATE TRIGGER update_authorized_surgeons
    BEFORE INSERT OR UPDATE OF case_id, surgeon_id ON patient_clinical_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_note_authorized_surgeons();

-- Enable RLS
ALTER TABLE case_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for case participants
CREATE POLICY "Staff can view all case participants" ON case_participants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'staff'
        )
    );

CREATE POLICY "Staff can manage case participants" ON case_participants
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'staff'
        )
    );

-- Update RLS policies for clinical notes
DROP POLICY IF EXISTS "surgeons_view_own_notes" ON patient_clinical_notes;
DROP POLICY IF EXISTS "surgeons_create_notes" ON patient_clinical_notes;
DROP POLICY IF EXISTS "surgeons_update_notes" ON patient_clinical_notes;

-- View policy
CREATE POLICY "authorized_surgeons_view_notes" ON patient_clinical_notes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM doctors d
            WHERE d.user_id = auth.uid()
            AND is_surgeon_authorized(patient_clinical_notes.id, d.id)
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'staff'
        )
    );

-- Create policy
CREATE POLICY "surgeons_create_notes" ON patient_clinical_notes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM doctors d
            WHERE d.user_id = auth.uid()
            AND d.id = creator_id
        )
    );

-- Update policy
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
            -- Either note is not locked
            NOT is_locked
            OR
            -- Or updating with valid edit reason
            (NEW.edit_reason IS NOT NULL AND length(trim(NEW.edit_reason)) >= 10)
        )
    );

-- Add audit logging for note modifications
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
            WHEN TG_OP = 'UPDATE' AND OLD.is_locked AND NEW.edit_reason IS NOT NULL THEN 'LOCKED_NOTE_MODIFIED'
            ELSE 'NOTE_UPDATED'
        END,
        auth.uid(),
        jsonb_build_object(
            'previous_version', CASE WHEN TG_OP = 'UPDATE' THEN OLD.version ELSE NULL END,
            'new_version', NEW.version,
            'edit_reason', NEW.edit_reason,
            'is_locked', NEW.is_locked
        )
    );

    RETURN NEW;
END;
$$;

-- Create trigger for modifications
CREATE TRIGGER log_note_modifications
    AFTER INSERT OR UPDATE ON patient_clinical_notes
    FOR EACH ROW
    EXECUTE FUNCTION log_note_modifications();

-- Add helpful comments
COMMENT ON TABLE case_participants IS 'Tracks surgeon participation in medical cases';
COMMENT ON TABLE patient_clinical_notes IS 'Clinical notes with strict access control';
COMMENT ON FUNCTION is_surgeon_authorized IS 'Checks if a surgeon is authorized to access a note';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_surgeon_authorized TO authenticated;

-- Verify setup
DO $$
BEGIN
    -- Verify RLS is enabled
    IF NOT EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE tablename = 'case_participants'
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS not enabled on case_participants';
    END IF;

    -- Verify triggers exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname IN ('update_authorized_surgeons', 'log_note_modifications')
    ) THEN
        RAISE EXCEPTION 'Required triggers not created';
    END IF;

    -- Verify columns exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'patient_clinical_notes'
        AND column_name IN ('authorized_surgeons', 'case_id', 'creator_id', 'is_locked')
    ) THEN
        RAISE EXCEPTION 'Required columns not added to patient_clinical_notes';
    END IF;
END $$;