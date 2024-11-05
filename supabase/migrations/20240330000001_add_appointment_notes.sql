-- Add notes column to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update search function to handle null notes
CREATE OR REPLACE FUNCTION generate_appointment_search_text()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_text := to_tsvector('english',
        COALESCE(NEW.notes, '') || ' ' ||
        COALESCE((SELECT name FROM profiles WHERE id = NEW.patient_id), '') || ' ' ||
        COALESCE((SELECT name FROM doctors WHERE id = NEW.surgeon_id), '') || ' ' ||
        COALESCE((
            SELECT name 
            FROM event_types 
            WHERE id = NEW.event_type_id
        ), '')
    );
    RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS update_appointment_search_text ON appointments;
CREATE TRIGGER update_appointment_search_text
    BEFORE INSERT OR UPDATE OF notes, patient_id, surgeon_id, event_type_id
    ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION generate_appointment_search_text();

-- Add helpful comments
COMMENT ON COLUMN appointments.notes IS 'Additional notes or comments for the appointment';

-- Verify setup
DO $$
BEGIN
    -- Verify column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'notes'
    ) THEN
        RAISE EXCEPTION 'notes column was not created successfully';
    END IF;

    -- Verify trigger exists
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_appointment_search_text'
    ) THEN
        RAISE EXCEPTION 'Search trigger was not created successfully';
    END IF;
END $$;