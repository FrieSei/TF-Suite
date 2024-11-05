-- Update appointments table with new fields and constraints
ALTER TABLE appointments
    ADD COLUMN event_type_id UUID REFERENCES event_types(id),
    ADD COLUMN anesthesiologist_id UUID REFERENCES doctors(id),
    ADD COLUMN duration INTEGER NOT NULL CHECK (duration > 0),
    ADD CONSTRAINT valid_event_type_duration CHECK (
        duration = ANY(
            SELECT unnest(possible_durations)
            FROM event_types
            WHERE id = event_type_id
        )
    ),
    ADD CONSTRAINT require_anesthesiologist CHECK (
        CASE 
            WHEN (
                SELECT requires_anesthesiologist 
                FROM event_types 
                WHERE id = event_type_id
            ) THEN anesthesiologist_id IS NOT NULL
            ELSE true
        END
    );

-- Add index for faster event type lookups
CREATE INDEX idx_appointments_event_type ON appointments(event_type_id);

-- Add trigger to validate anesthesiologist requirement
CREATE OR REPLACE FUNCTION validate_appointment_requirements()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if event type requires anesthesiologist
    IF (
        SELECT requires_anesthesiologist 
        FROM event_types 
        WHERE id = NEW.event_type_id
    ) AND NEW.anesthesiologist_id IS NULL THEN
        RAISE EXCEPTION 'Anesthesiologist is required for this procedure';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_appointment_requirements
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION validate_appointment_requirements();