-- Create consultation status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE consultation_status AS ENUM (
        'NOT_SCHEDULED',
        'SCHEDULED',
        'COMPLETED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create consultations table
CREATE TABLE IF NOT EXISTS public.consultations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    surgery_id UUID REFERENCES surgeries(id) NOT NULL,
    patient_id UUID REFERENCES profiles(id) NOT NULL,
    scheduled_date TIMESTAMPTZ NOT NULL,
    status consultation_status NOT NULL DEFAULT 'SCHEDULED',
    completed_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Ensure completed_date is only set when status is COMPLETED
    CONSTRAINT completed_date_validation CHECK (
        (status = 'COMPLETED' AND completed_date IS NOT NULL) OR
        (status != 'COMPLETED' AND completed_date IS NULL)
    )
);

-- Create consultation logs table for audit trail
CREATE TABLE IF NOT EXISTS public.consultation_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    consultation_id UUID REFERENCES consultations(id) NOT NULL,
    previous_status consultation_status,
    new_status consultation_status NOT NULL,
    changed_by UUID REFERENCES profiles(id) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_consultations_surgery ON consultations(surgery_id);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date ON consultations(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultation_logs ON consultation_logs(consultation_id);

-- Function to validate consultation date
CREATE OR REPLACE FUNCTION validate_consultation_date()
RETURNS TRIGGER AS $$
DECLARE
    surgery_date TIMESTAMPTZ;
BEGIN
    -- Get the surgery date
    SELECT s.surgery_date INTO surgery_date
    FROM surgeries s
    WHERE s.id = NEW.surgery_id;

    -- Ensure consultation is scheduled before surgery
    IF NEW.scheduled_date >= surgery_date THEN
        RAISE EXCEPTION 'Consultation must be scheduled before surgery date';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for consultation date validation
DROP TRIGGER IF EXISTS check_consultation_date ON consultations;
CREATE TRIGGER check_consultation_date
    BEFORE INSERT OR UPDATE OF scheduled_date ON consultations
    FOR EACH ROW
    EXECUTE FUNCTION validate_consultation_date();

-- Add update trigger for consultations
CREATE OR REPLACE FUNCTION update_consultations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_consultations_timestamp
    BEFORE UPDATE ON consultations
    FOR EACH ROW
    EXECUTE FUNCTION update_consultations_updated_at();

-- Add trigger to automatically log status changes
CREATE OR REPLACE FUNCTION log_consultation_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO consultation_logs (
            consultation_id,
            previous_status,
            new_status,
            changed_by,
            notes
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            auth.uid(),
            NEW.notes
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_consultation_status
    AFTER UPDATE ON consultations
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION log_consultation_status_change();

-- Function to validate consultation requirements
CREATE OR REPLACE FUNCTION validate_consultation_requirement(surgery_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    surgery_date DATE;
    consultation_complete BOOLEAN;
BEGIN
    -- Get surgery date
    SELECT surgery_date::DATE INTO surgery_date
    FROM surgeries
    WHERE id = surgery_id;

    -- Check if consultation is completed
    SELECT EXISTS (
        SELECT 1
        FROM consultations
        WHERE surgery_id = surgery_id
        AND status = 'COMPLETED'
        AND completed_date < (surgery_date - INTERVAL '3 days')
    ) INTO consultation_complete;

    RETURN consultation_complete;
END;
$$ LANGUAGE plpgsql;

-- Function to update surgery status based on consultation status
CREATE OR REPLACE FUNCTION update_surgery_consultation_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If consultation is completed, update surgery status
    IF NEW.status = 'COMPLETED' THEN
        UPDATE surgeries
        SET current_status = 
            CASE 
                WHEN current_status = 'BLOCKED' THEN 'READY'
                ELSE current_status
            END
        WHERE id = NEW.surgery_id;
    END IF;

    -- If consultation is cancelled, block surgery
    IF NEW.status = 'CANCELLED' AND 
       EXISTS (
           SELECT 1 
           FROM surgeries 
           WHERE id = NEW.surgery_id 
           AND surgery_date <= (CURRENT_DATE + INTERVAL '3 days')
       ) 
    THEN
        UPDATE surgeries
        SET current_status = 'BLOCKED'
        WHERE id = NEW.surgery_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_surgery_on_consultation_change
    AFTER UPDATE ON consultations
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_surgery_consultation_status();

-- Enable Row Level Security
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for consultations
CREATE POLICY "Surgeons can view assigned consultations" ON consultations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM surgeries s
            JOIN doctors d ON s.surgeon_id = d.id
            WHERE s.id = consultations.surgery_id
            AND d.user_id = auth.uid()
        )
    );

CREATE POLICY "Staff can view all consultations" ON consultations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'staff'
        )
    );

CREATE POLICY "Staff can manage consultations" ON consultations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'staff'
        )
    );

-- RLS Policies for consultation logs
CREATE POLICY "Staff can view consultation logs" ON consultation_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('staff', 'surgeon')
        )
    );