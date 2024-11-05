-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create PTL-specific enums
DO $$ BEGIN
    CREATE TYPE consultation_status AS ENUM (
        'NOT_SCHEDULED',
        'SCHEDULED',
        'COMPLETED',
        'EXPIRED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE surgery_status AS ENUM (
        'PENDING_CONSULTATION',
        'CONSULTATION_COMPLETED',
        'READY_FOR_SURGERY',
        'BLOCKED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ptl_type AS ENUM (
        'FACELIFT',
        'RHINOPLASTY',
        'BLEPHAROPLASTY'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create PTL surgeries table
CREATE TABLE IF NOT EXISTS public.ptl_surgeries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES profiles(id) NOT NULL,
    surgery_date TIMESTAMPTZ NOT NULL,
    ptl_type ptl_type NOT NULL,
    consultation_status consultation_status NOT NULL DEFAULT 'NOT_SCHEDULED',
    consultation_date TIMESTAMPTZ,
    consultation_completion_date TIMESTAMPTZ,
    surgery_status surgery_status NOT NULL DEFAULT 'PENDING_CONSULTATION',
    last_notification_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Ensure consultation is completed at least 3 days before surgery
    CONSTRAINT valid_consultation_completion CHECK (
        consultation_completion_date IS NULL OR
        surgery_date >= consultation_completion_date + INTERVAL '3 days'
    )
);

-- Create PTL consultation appointments table
CREATE TABLE IF NOT EXISTS public.ptl_consultation_appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    surgery_id UUID REFERENCES ptl_surgeries(id) NOT NULL,
    patient_id UUID REFERENCES profiles(id) NOT NULL,
    scheduled_date TIMESTAMPTZ NOT NULL,
    status consultation_status NOT NULL DEFAULT 'SCHEDULED',
    completed_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create PTL notification logs table
CREATE TABLE IF NOT EXISTS public.ptl_notification_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    surgery_id UUID REFERENCES ptl_surgeries(id) NOT NULL,
    type TEXT CHECK (type IN ('EMAIL', 'SMS', 'DASHBOARD')) NOT NULL,
    priority TEXT CHECK (priority IN ('HIGH', 'URGENT', 'NORMAL')) NOT NULL,
    recipients JSONB NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT CHECK (status IN ('SENT', 'FAILED')) NOT NULL,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX idx_ptl_surgeries_dates ON ptl_surgeries(surgery_date, consultation_completion_date);
CREATE INDEX idx_ptl_surgeries_status ON ptl_surgeries(surgery_status, consultation_status);
CREATE INDEX idx_ptl_consultations_surgery ON ptl_consultation_appointments(surgery_id, status);
CREATE INDEX idx_ptl_notifications_surgery ON ptl_notification_logs(surgery_id, sent_at);

-- Add update triggers
CREATE TRIGGER update_ptl_surgeries_updated_at
    BEFORE UPDATE ON ptl_surgeries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ptl_consultations_updated_at
    BEFORE UPDATE ON ptl_consultation_appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to validate consultation date
CREATE OR REPLACE FUNCTION validate_consultation_date()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM ptl_surgeries s
        WHERE s.id = NEW.surgery_id
        AND NEW.scheduled_date >= s.surgery_date
    ) THEN
        RAISE EXCEPTION 'Consultation must be scheduled before surgery date';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for consultation date validation
CREATE TRIGGER check_consultation_date
    BEFORE INSERT OR UPDATE ON ptl_consultation_appointments
    FOR EACH ROW
    EXECUTE FUNCTION validate_consultation_date();

-- Create function to validate surgery status
CREATE OR REPLACE FUNCTION validate_ptl_surgery_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If consultation is completed, update surgery status
    IF NEW.consultation_status = 'COMPLETED' THEN
        NEW.surgery_status = 'CONSULTATION_COMPLETED';
    END IF;

    -- Block surgery if consultation not completed within 3 days of surgery
    IF NEW.consultation_status != 'COMPLETED' AND 
       NEW.surgery_date <= (CURRENT_TIMESTAMP + INTERVAL '3 days') THEN
        NEW.surgery_status = 'BLOCKED';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for surgery status validation
CREATE TRIGGER check_ptl_surgery_status
    BEFORE INSERT OR UPDATE ON ptl_surgeries
    FOR EACH ROW
    EXECUTE FUNCTION validate_ptl_surgery_status();

-- Enable RLS
ALTER TABLE ptl_surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ptl_consultation_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ptl_notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view all PTL surgeries" ON ptl_surgeries
    FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('surgeon', 'staff')
    ));

CREATE POLICY "Staff can manage PTL surgeries" ON ptl_surgeries
    FOR ALL
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'staff'
    ));

CREATE POLICY "Staff can view all PTL consultations" ON ptl_consultation_appointments
    FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('surgeon', 'staff')
    ));

CREATE POLICY "Staff can manage PTL consultations" ON ptl_consultation_appointments
    FOR ALL
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'staff'
    ));

CREATE POLICY "Staff can view notification logs" ON ptl_notification_logs
    FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('surgeon', 'staff')
    ));