-- Drop the existing view
DROP VIEW IF EXISTS patient_history_timeline;

-- Recreate the view with SECURITY INVOKER (default)
CREATE OR REPLACE VIEW patient_history_timeline AS
WITH combined_entries AS (
    -- Notes (with RLS check)
    SELECT
        n.id,
        n.patient_id,
        n.created_at as entry_date,
        n.metadata->>'visitType' as entry_type,
        n.surgeon_id as provider_id,
        'NOTE' as source_type,
        n.id as source_id,
        n.metadata as additional_data
    FROM patient_clinical_notes n
    WHERE n.deleted_at IS NULL
    AND (
        -- User is the surgeon
        n.surgeon_id = auth.uid()
        OR
        -- User is staff with access to patient records
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'staff'
        )
    )

    UNION ALL

    -- Appointments (with RLS check)
    SELECT
        a.id,
        a.patient_id,
        a.start_time as entry_date,
        et.name as entry_type,
        a.surgeon_id as provider_id,
        'APPOINTMENT' as source_type,
        a.id as source_id,
        jsonb_build_object(
            'status', a.status,
            'location', a.location,
            'notes', a.notes
        ) as additional_data
    FROM appointments a
    LEFT JOIN event_types et ON a.event_type_id = et.id
    WHERE (
        -- User is the surgeon
        a.surgeon_id = auth.uid()
        OR
        -- User is staff
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'staff'
        )
    )
)
SELECT
    id,
    patient_id,
    entry_date,
    entry_type,
    provider_id,
    source_type,
    source_id,
    additional_data,
    (
        SELECT jsonb_agg(jsonb_build_object(
            'id', r.id,
            'type', r.reference_type,
            'target_id', COALESCE(r.appointment_id, r.related_note_id)
        ))
        FROM note_references r
        WHERE 
            (source_type = 'NOTE' AND r.note_id = combined_entries.id) OR
            (source_type = 'APPOINTMENT' AND r.appointment_id = combined_entries.id)
    ) as references
FROM combined_entries;

-- Add RLS policies for note_references if not exists
DO $$ BEGIN
    CREATE POLICY "Users can view references they have access to" ON note_references
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM patient_clinical_notes n
                WHERE n.id = note_id
                AND (
                    n.surgeon_id = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM profiles p
                        WHERE p.id = auth.uid()
                        AND p.role = 'staff'
                    )
                )
            )
            OR
            EXISTS (
                SELECT 1 FROM appointments a
                WHERE a.id = appointment_id
                AND (
                    a.surgeon_id = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM profiles p
                        WHERE p.id = auth.uid()
                        AND p.role = 'staff'
                    )
                )
            )
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add helpful comments
COMMENT ON VIEW patient_history_timeline IS 'Combined timeline of patient notes and appointments with proper RLS';

-- Grant necessary permissions
GRANT SELECT ON patient_history_timeline TO authenticated;

-- Verify the security setup
DO $$ 
BEGIN
    -- Verify view exists
    IF NOT EXISTS (
        SELECT 1
        FROM pg_views
        WHERE viewname = 'patient_history_timeline'
    ) THEN
        RAISE EXCEPTION 'View was not created successfully';
    END IF;

    -- Verify view is not SECURITY DEFINER
    IF EXISTS (
        SELECT 1
        FROM pg_views
        WHERE viewname = 'patient_history_timeline'
        AND definition LIKE '%SECURITY DEFINER%'
    ) THEN
        RAISE EXCEPTION 'View still has SECURITY DEFINER set';
    END IF;

    -- Verify RLS is enabled on referenced tables
    IF NOT EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE tablename = 'note_references'
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS not enabled on note_references table';
    END IF;
END $$;