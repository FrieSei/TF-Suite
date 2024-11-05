-- Function to check appointment availability
CREATE OR REPLACE FUNCTION check_appointment_availability(
    p_surgeon_id UUID,
    p_location location_type,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_event_type_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_requires_anesthesiologist BOOLEAN;
    v_available_anesthesiologist UUID;
BEGIN
    -- Check if there are any overlapping appointments
    IF EXISTS (
        SELECT 1 FROM appointments
        WHERE surgeon_id = p_surgeon_id
        AND location = p_location
        AND status NOT IN ('cancelled')
        AND tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time)
    ) THEN
        RETURN FALSE;
    END IF;

    -- Check if event type requires anesthesiologist
    SELECT requires_anesthesiologist INTO v_requires_anesthesiologist
    FROM event_types
    WHERE id = p_event_type_id;

    IF v_requires_anesthesiologist THEN
        -- Find available anesthesiologist
        SELECT id INTO v_available_anesthesiologist
        FROM doctors d
        WHERE d.role = 'ANESTHESIOLOGIST'
        AND d.default_location = p_location
        AND d.active = true
        AND NOT EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.anesthesiologist_id = d.id
            AND a.status NOT IN ('cancelled')
            AND tstzrange(a.start_time, a.end_time) && tstzrange(p_start_time, p_end_time)
        )
        LIMIT 1;

        IF v_available_anesthesiologist IS NULL THEN
            RETURN FALSE;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;