-- Drop the existing view
DROP VIEW IF EXISTS patient_history_timeline;

-- Create a function to get patient history with proper security context
CREATE OR REPLACE FUNCTION get_patient_history(p_patient_id UUID)
RETURNS TABLE (
    id UUID,
    patient_id UUID,
    entry_date TIMESTAMPTZ,
    entry_type TEXT,
    provider_id UUID,
    source_type TEXT,
    source_id UUID,
    additional_data JSONB,
    reference_list JSONB  -- Changed from 'references' to 'reference_list'
)
STABLE
SECURITY INVOKER
SET search_path = public, extensions
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if user has access to patient data
    IF NOT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND (
            p.role = 'staff' OR
            EXISTS (
                SELECT 1 FROM doctors d
                WHERE d.user_id = auth.uid()
                AND d.role = 'SURGEON'
                AND EXISTS (
                    SELECT 1 FROM appointments a
                    WHERE a.surgeon_id = d.id
                    AND a.patient_id = p_patient_id
                )
            )
        )
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    -- Notes
    SELECT
        n.id,
        n.patient_id,
        n.created_at as entry_date,
        n.metadata->>'visitType' as entry_type,
        n.surgeon_id as provider_id,
        'NOTE'::TEXT as source_type,
        n.id as source_id,
        n.metadata as additional_data,
        (
            SELECT jsonb_agg(jsonb_build_object(
                'id', r.id,
                'type', r.reference_type,
                'target_id', COALESCE(r.appointment_id, r.related_note_id)
            ))
            FROM note_references r
            WHERE r.note_id = n.id
        ) as reference_list  -- Changed from 'references' to 'reference_list'
    FROM patient_clinical_notes n
    WHERE n.patient_id = p_patient_id
    AND n.deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM doctors d
        WHERE d.id = n.surgeon_id
        AND (
            d.user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.id = auth.uid()
                AND p.role = 'staff'
            )
        )
    )

    UNION ALL

    -- Appointments
    SELECT
        a.id,
        a.patient_id,
        a.start_time as entry_date,
        et.name as entry_type,
        a.surgeon_id as provider_id,
        'APPOINTMENT'::TEXT as source_type,
        a.id as source_id,
        jsonb_build_object(
            'status', a.status,
            'location', a.location,
            'notes', a.notes
        ) as additional_data,
        (
            SELECT jsonb_agg(jsonb_build_object(
                'id', r.id,
                'type', r.reference_type,
                'target_id', r.note_id
            ))
            FROM note_references r
            WHERE r.appointment_id = a.id
        ) as reference_list  -- Changed from 'references' to 'reference_list'
    FROM appointments a
    LEFT JOIN event_types et ON a.event_type_id = et.id
    WHERE a.patient_id = p_patient_id
    AND EXISTS (
        SELECT 1 FROM doctors d
        WHERE d.id = a.surgeon_id
        AND (
            d.user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.id = auth.uid()
                AND p.role = 'staff'
            )
        )
    )
    ORDER BY entry_date DESC;
END;
$$;

-- Add helpful comments
COMMENT ON FUNCTION get_patient_history(UUID) IS 'Retrieves patient history timeline with proper security checks';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_patient_history(UUID) TO authenticated;

-- Update the reference service to use the new function
CREATE OR REPLACE FUNCTION get_patient_references(
    p_note_id UUID,
    p_reference_type TEXT
)
RETURNS TABLE (
    id UUID,
    reference_type TEXT,
    target_id UUID,
    created_at TIMESTAMPTZ,
    metadata JSONB
)
STABLE
SECURITY INVOKER
SET search_path = public, extensions
LANGUAGE plpgsql
AS $$
BEGIN
    -- Verify user has access to the note
    IF NOT EXISTS (
        SELECT 1 FROM patient_clinical_notes n
        WHERE n.id = p_note_id
        AND (
            EXISTS (
                SELECT 1 FROM doctors d
                WHERE d.id = n.surgeon_id
                AND d.user_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.id = auth.uid()
                AND p.role = 'staff'
            )
        )
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT
        r.id,
        r.reference_type,
        COALESCE(r.appointment_id, r.related_note_id) as target_id,
        r.created_at,
        CASE
            WHEN r.reference_type = 'APPOINTMENT' THEN
                (SELECT jsonb_build_object(
                    'type', et.name,
                    'date', a.start_time,
                    'status', a.status
                )
                FROM appointments a
                LEFT JOIN event_types et ON a.event_type_id = et.id
                WHERE a.id = r.appointment_id)
            ELSE
                (SELECT jsonb_build_object(
                    'type', n.metadata->>'visitType',
                    'date', n.created_at
                )
                FROM patient_clinical_notes n
                WHERE n.id = r.related_note_id)
        END as metadata
    FROM note_references r
    WHERE r.note_id = p_note_id
    AND (p_reference_type IS NULL OR r.reference_type = p_reference_type);
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_patient_references(UUID, TEXT) TO authenticated;

-- Verify the setup
DO $$
BEGIN
    -- Verify functions exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname = 'get_patient_history'
    ) THEN
        RAISE EXCEPTION 'Patient history function not created successfully';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname = 'get_patient_references'
    ) THEN
        RAISE EXCEPTION 'Patient references function not created successfully';
    END IF;

    -- Verify functions are not SECURITY DEFINER
    IF EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname IN ('get_patient_history', 'get_patient_references')
        AND prosecdef = true
    ) THEN
        RAISE EXCEPTION 'Functions should not be SECURITY DEFINER';
    END IF;
END $$;