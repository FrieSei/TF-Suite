-- Enable text search extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add search vector column to appointments
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS search_text tsvector;

-- Create function to generate appointment search text
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

-- Create trigger for search text updates
CREATE TRIGGER update_appointment_search_text
    BEFORE INSERT OR UPDATE OF notes, patient_id, surgeon_id, event_type_id
    ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION generate_appointment_search_text();

-- Create GIN index for full text search
CREATE INDEX IF NOT EXISTS idx_appointments_search 
ON appointments USING GIN(search_text);

-- Create function for searching appointments
CREATE OR REPLACE FUNCTION search_appointments(
    search_query TEXT,
    p_surgeon_id UUID DEFAULT NULL,
    p_location location_type DEFAULT NULL,
    p_status appointment_status DEFAULT NULL,
    p_from_date TIMESTAMPTZ DEFAULT NULL,
    p_to_date TIMESTAMPTZ DEFAULT NULL,
    p_upcoming_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
    id UUID,
    patient_id UUID,
    surgeon_id UUID,
    location location_type,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    type appointment_type,
    status appointment_status,
    event_type_id UUID,
    notes TEXT,
    rank REAL
)
SECURITY DEFINER
SET search_path = public, extensions
STABLE
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.patient_id,
        a.surgeon_id,
        a.location,
        a.start_time,
        a.end_time,
        a.type,
        a.status,
        a.event_type_id,
        a.notes,
        ts_rank(a.search_text, to_tsquery('english', search_query)) as rank
    FROM appointments a
    WHERE
        (search_query IS NULL OR a.search_text @@ to_tsquery('english', search_query))
        AND (p_surgeon_id IS NULL OR a.surgeon_id = p_surgeon_id)
        AND (p_location IS NULL OR a.location = p_location)
        AND (p_status IS NULL OR a.status = p_status)
        AND (p_from_date IS NULL OR a.start_time >= p_from_date)
        AND (p_to_date IS NULL OR a.start_time <= p_to_date)
        AND (
            NOT p_upcoming_only OR 
            (a.start_time >= CURRENT_TIMESTAMP AND a.status = 'scheduled')
        )
    ORDER BY
        CASE WHEN p_upcoming_only THEN a.start_time ELSE rank END DESC;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION search_appointments TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION search_appointments IS 'Search appointments with full text search and filtering';
COMMENT ON COLUMN appointments.search_text IS 'Searchable text vector for full text search';