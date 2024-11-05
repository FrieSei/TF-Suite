-- Create staff schedules table
CREATE TABLE IF NOT EXISTS public.staff_schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    staff_id UUID REFERENCES doctors(id) NOT NULL,
    location location_type NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    schedule_type schedule_type NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_schedule_time CHECK (end_time > start_time)
);

-- Enable RLS
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;

-- Add update trigger
CREATE TRIGGER update_staff_schedules_updated_at
    BEFORE UPDATE ON staff_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
CREATE POLICY "Staff can view all schedules" ON staff_schedules
    FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('surgeon', 'staff')
    ));

CREATE POLICY "Staff can manage schedules" ON staff_schedules
    FOR ALL
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'staff'
    ));