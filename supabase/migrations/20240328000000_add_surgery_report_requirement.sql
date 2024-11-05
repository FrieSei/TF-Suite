-- Create surgery report status enum
CREATE TYPE surgery_report_status AS ENUM (
    'PENDING',
    'SUBMITTED',
    'OVERDUE'
);

-- Create surgery reports tracking table
CREATE TABLE IF NOT EXISTS public.surgery_report_requirements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    surgery_id UUID REFERENCES surgeries(id) NOT NULL,
    patient_id UUID REFERENCES profiles(id) NOT NULL,
    surgeon_id UUID REFERENCES doctors(id) NOT NULL,
    surgery_date TIMESTAMPTZ NOT NULL,
    report_due_date TIMESTAMPTZ NOT NULL,
    report_note_id UUID REFERENCES patient_clinical_notes(id),
    status surgery_report_status NOT NULL DEFAULT 'PENDING',
    reminder_count INTEGER DEFAULT 0,
    last_reminder_sent TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT valid_due_date CHECK (
        report_due_date = surgery_date + INTERVAL '72 hours'
    )
);

-- Create index for faster queries
CREATE INDEX idx_surgery_reports_status 
ON surgery_report_requirements(status, report_due_date)
WHERE status = 'PENDING';

CREATE INDEX idx_surgery_reports_surgeon 
ON surgery_report_requirements(surgeon_id, status);

-- Add trigger to automatically create report requirement when surgery is completed
CREATE OR REPLACE FUNCTION create_surgery_report_requirement()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        INSERT INTO surgery_report_requirements (
            surgery_id,
            patient_id,
            surgeon_id,
            surgery_date,
            report_due_date
        ) VALUES (
            NEW.id,
            NEW.patient_id,
            NEW.surgeon_id,
            NEW.surgery_date,
            NEW.surgery_date + INTERVAL '72 hours'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

CREATE TRIGGER create_report_requirement
    AFTER UPDATE OF status ON surgeries
    FOR EACH ROW
    EXECUTE FUNCTION create_surgery_report_requirement();

-- Add function to check and update report status
CREATE OR REPLACE FUNCTION update_report_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a surgery report note
    IF NEW.metadata->>'type' = 'SURGERY_REPORT' THEN
        -- Update the report requirement
        UPDATE surgery_report_requirements
        SET 
            status = 'SUBMITTED',
            report_note_id = NEW.id,
            updated_at = now()
        WHERE 
            surgery_id = (NEW.metadata->>'surgeryId')::UUID
            AND status = 'PENDING';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

CREATE TRIGGER update_report_requirement
    AFTER INSERT ON patient_clinical_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_report_status();

-- Enable RLS
ALTER TABLE surgery_report_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Surgeons can view their report requirements" ON surgery_report_requirements
    FOR SELECT
    USING (surgeon_id = auth.uid());

-- Add helpful comments
COMMENT ON TABLE surgery_report_requirements IS 'Tracks mandatory surgery report submissions';
COMMENT ON COLUMN surgery_report_requirements.report_due_date IS 'Report must be submitted within 72 hours of surgery';

-- Grant necessary permissions
GRANT SELECT ON surgery_report_requirements TO authenticated;