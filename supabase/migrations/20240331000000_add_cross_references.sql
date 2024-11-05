-- Add reference tables for cross-linking
CREATE TABLE IF NOT EXISTS public.note_references (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    note_id UUID REFERENCES patient_clinical_notes(id) NOT NULL,
    appointment_id UUID REFERENCES appointments(id),
    related_note_id UUID REFERENCES patient_clinical_notes(id),
    reference_type TEXT NOT NULL CHECK (reference_type IN ('APPOINTMENT', 'NOTE')),
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    
    -- Ensure either appointment_id or related_note_id is set, but not both
    CONSTRAINT valid_reference CHECK (
        (appointment_id IS NOT NULL AND related_note_id IS NULL) OR
        (appointment_id IS NULL AND related_note_id IS NOT NULL)
    )
);

-- Add indexes for faster lookups
CREATE INDEX idx_note_refs_note ON note_references(note_id);
CREATE INDEX idx_note_refs_appointment ON note_references(appointment_id);
CREATE INDEX idx_note_refs_related ON note_references(related_note_id);

-- Create view for patient history timeline
CREATE OR REPLACE VIEW patient_history_timeline AS
WITH combined_entries AS (
    -- Notes
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

    UNION ALL

    -- Appointments
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

-- Enable RLS
ALTER TABLE note_references ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Surgeons can view references for their notes" ON note_references
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM patient_clinical_notes
            WHERE id = note_id
            AND surgeon_id = auth.uid()
        )
    );

CREATE POLICY "Surgeons can create references for their notes" ON note_references
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM patient_clinical_notes
            WHERE id = note_id
            AND surgeon_id = auth.uid()
        )
    );

-- Add helpful comments
COMMENT ON TABLE note_references IS 'Cross-references between notes and appointments';
COMMENT ON VIEW patient_history_timeline IS 'Combined timeline of patient notes and appointments';

-- Grant necessary permissions
GRANT SELECT ON patient_history_timeline TO authenticated;