-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create doctor role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE doctor_role AS ENUM ('SURGEON', 'ANESTHESIOLOGIST');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create location type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE location_type AS ENUM ('Vienna', 'Linz', 'Munich');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create doctors table first
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    role doctor_role NOT NULL,
    calendar_id TEXT NOT NULL,
    default_location location_type NOT NULL,
    specializations TEXT[] DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT unique_calendar_id UNIQUE (calendar_id)
);

-- Enable RLS on doctors table
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

-- Create surgery status enum
DO $$ BEGIN
    DROP TYPE IF EXISTS surgery_status CASCADE;
    CREATE TYPE surgery_status AS ENUM (
        'SCHEDULED',
        'IN_PREPARATION',
        'READY',
        'BLOCKED',
        'COMPLETED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create PTL type enum
DO $$ BEGIN
    DROP TYPE IF EXISTS ptl_type CASCADE;
    CREATE TYPE ptl_type AS ENUM (
        'TYPE_1',
        'TYPE_2',
        'TYPE_3'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create core surgeries table
CREATE TABLE IF NOT EXISTS public.surgeries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES profiles(id) NOT NULL,
    surgeon_id UUID REFERENCES doctors(id) NOT NULL,
    surgery_date TIMESTAMPTZ NOT NULL,
    ptl_type ptl_type NOT NULL,
    current_status surgery_status NOT NULL DEFAULT 'SCHEDULED'::surgery_status,
    location location_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Add constraint to ensure surgery date is in the future
    CONSTRAINT future_surgery_date CHECK (surgery_date > now())
);

-- Create surgery status logs table for audit trail
CREATE TABLE IF NOT EXISTS public.surgery_status_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    surgery_id UUID REFERENCES surgeries(id) NOT NULL,
    previous_status surgery_status NOT NULL,
    new_status surgery_status NOT NULL,
    changed_by UUID REFERENCES profiles(id) NOT NULL,
    reason TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_surgeries_patient ON surgeries(patient_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_surgeon ON surgeries(surgeon_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_date ON surgeries(surgery_date);
CREATE INDEX IF NOT EXISTS idx_surgeries_status ON surgeries(current_status);
CREATE INDEX IF NOT EXISTS idx_surgery_logs_surgery ON surgery_status_logs(surgery_id);
CREATE INDEX IF NOT EXISTS idx_doctors_role_location ON doctors(role, default_location) WHERE active = true;

-- Add update trigger for surgeries
CREATE OR REPLACE FUNCTION update_surgeries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_surgeries_timestamp ON surgeries;
CREATE TRIGGER update_surgeries_timestamp
    BEFORE UPDATE ON surgeries
    FOR EACH ROW
    EXECUTE FUNCTION update_surgeries_updated_at();

-- Add trigger to automatically log status changes
CREATE OR REPLACE FUNCTION log_surgery_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.current_status IS DISTINCT FROM NEW.current_status) THEN
        INSERT INTO surgery_status_logs (
            surgery_id,
            previous_status,
            new_status,
            changed_by,
            timestamp
        ) VALUES (
            NEW.id,
            OLD.current_status,
            NEW.current_status,
            auth.uid(),
            now()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_surgery_status ON surgeries;
CREATE TRIGGER log_surgery_status
    AFTER UPDATE ON surgeries
    FOR EACH ROW
    WHEN (OLD.current_status IS DISTINCT FROM NEW.current_status)
    EXECUTE FUNCTION log_surgery_status_change();

-- Enable Row Level Security
ALTER TABLE surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgery_status_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for doctors table
CREATE POLICY "Public doctors are viewable by everyone" ON doctors
    FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own doctor profile" ON doctors
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Surgeons can view assigned surgeries" ON surgeries;
DROP POLICY IF EXISTS "Staff can view all surgeries" ON surgeries;
DROP POLICY IF EXISTS "Staff can manage surgeries" ON surgeries;
DROP POLICY IF EXISTS "Staff can view surgery logs" ON surgery_status_logs;

-- RLS Policies for surgeries table
CREATE POLICY "Surgeons can view assigned surgeries" ON surgeries
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM doctors
            WHERE user_id = auth.uid()
            AND role = 'SURGEON'
        )
    );

CREATE POLICY "Staff can view all surgeries" ON surgeries
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'staff'
        )
    );

CREATE POLICY "Staff can manage surgeries" ON surgeries
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'staff'
        )
    );

-- RLS Policies for surgery status logs
CREATE POLICY "Staff can view surgery logs" ON surgery_status_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('staff', 'surgeon')
        )
    );

-- Function to validate surgery status transitions
CREATE OR REPLACE FUNCTION validate_surgery_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent changing status of completed or cancelled surgeries
    IF OLD.current_status IN ('COMPLETED'::surgery_status, 'CANCELLED'::surgery_status) THEN
        RAISE EXCEPTION 'Cannot modify completed or cancelled surgeries';
    END IF;

    -- Validate status transitions
    IF NOT (
        -- Valid transitions from SCHEDULED
        (OLD.current_status = 'SCHEDULED'::surgery_status AND NEW.current_status IN ('IN_PREPARATION'::surgery_status, 'CANCELLED'::surgery_status)) OR
        -- Valid transitions from IN_PREPARATION
        (OLD.current_status = 'IN_PREPARATION'::surgery_status AND NEW.current_status IN ('READY'::surgery_status, 'BLOCKED'::surgery_status, 'CANCELLED'::surgery_status)) OR
        -- Valid transitions from READY
        (OLD.current_status = 'READY'::surgery_status AND NEW.current_status IN ('COMPLETED'::surgery_status, 'BLOCKED'::surgery_status, 'CANCELLED'::surgery_status)) OR
        -- Valid transitions from BLOCKED
        (OLD.current_status = 'BLOCKED'::surgery_status AND NEW.current_status IN ('READY'::surgery_status, 'CANCELLED'::surgery_status))
    ) THEN
        RAISE EXCEPTION 'Invalid surgery status transition from % to %', OLD.current_status, NEW.current_status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_surgery_status ON surgeries;
CREATE TRIGGER validate_surgery_status
    BEFORE UPDATE OF current_status ON surgeries
    FOR EACH ROW
    EXECUTE FUNCTION validate_surgery_status_transition();