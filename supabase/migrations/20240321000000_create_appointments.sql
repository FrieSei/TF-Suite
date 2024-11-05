-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for spatial operations (needed for GIST index)
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create appointment types enum
CREATE TYPE appointment_type AS ENUM ('surgery', 'consultation');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled');
CREATE TYPE location_type AS ENUM ('Vienna', 'Linz', 'Munich');

-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.profiles(id) NOT NULL,
    surgeon_id UUID REFERENCES public.profiles(id) NOT NULL,
    location location_type NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    type appointment_type NOT NULL,
    status appointment_status DEFAULT 'scheduled',
    google_event_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Prevent overlapping appointments for the same surgeon at the same location
    CONSTRAINT no_overlap EXCLUDE USING GIST (
        surgeon_id WITH =,
        location WITH =,
        tstzrange(start_time, end_time) WITH &&
    ),

    -- Ensure appointment duration is valid (15 min to 4 hours)
    CONSTRAINT valid_duration CHECK (
        EXTRACT(EPOCH FROM (end_time - start_time)) BETWEEN 900 AND 14400
    ),

    -- Ensure end time is after start time
    CONSTRAINT valid_timerange CHECK (end_time > start_time)
);

-- Create index for faster queries
CREATE INDEX idx_appointments_surgeon_date ON appointments (surgeon_id, start_time);
CREATE INDEX idx_appointments_patient_date ON appointments (patient_id, start_time);
CREATE INDEX idx_appointments_location_date ON appointments (location, start_time);
CREATE INDEX idx_appointments_status ON appointments (status);

-- Add trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Surgeons can view their own appointments
CREATE POLICY "surgeons_view_own_appointments" ON appointments
    FOR SELECT
    USING (surgeon_id = auth.uid());

-- Surgeons can update their own appointments
CREATE POLICY "surgeons_update_own_appointments" ON appointments
    FOR UPDATE
    USING (
        surgeon_id = auth.uid() 
        AND status NOT IN ('completed', 'cancelled')
    );

-- Patients can view their own appointments
CREATE POLICY "patients_view_own_appointments" ON appointments
    FOR SELECT
    USING (patient_id = auth.uid());

-- Staff can view all appointments
CREATE POLICY "staff_view_all_appointments" ON appointments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'staff'
        )
    );

-- Staff can manage all appointments
CREATE POLICY "staff_manage_all_appointments" ON appointments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'staff'
        )
    );

-- Create function to check appointment availability
CREATE OR REPLACE FUNCTION check_appointment_availability(
    p_surgeon_id UUID,
    p_location location_type,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
DECLARE
    is_available BOOLEAN;
BEGIN
    -- Check if there are any overlapping appointments
    SELECT NOT EXISTS (
        SELECT 1 FROM appointments
        WHERE surgeon_id = p_surgeon_id
        AND location = p_location
        AND status NOT IN ('cancelled')
        AND tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time)
    ) INTO is_available;

    -- Check if the time is within surgeon's working hours
    -- This can be expanded based on your availability template logic
    
    RETURN is_available;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;