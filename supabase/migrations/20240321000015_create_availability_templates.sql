-- Create availability templates table
CREATE TABLE IF NOT EXISTS public.availability_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    surgeon_id UUID REFERENCES doctors(id) NOT NULL,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location location_type NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure end time is after start time
    CONSTRAINT valid_timerange CHECK (end_time > start_time)
);

-- Create a partial unique index for active templates
CREATE UNIQUE INDEX unique_active_template 
ON availability_templates (surgeon_id, day_of_week, location) 
WHERE is_active = true;

-- Enable RLS
ALTER TABLE availability_templates ENABLE ROW LEVEL SECURITY;

-- Add update trigger
CREATE TRIGGER update_availability_templates_updated_at
    BEFORE UPDATE ON availability_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
CREATE POLICY "Surgeons can view their own templates" ON availability_templates
    FOR SELECT
    USING (surgeon_id = auth.uid());

CREATE POLICY "Surgeons can manage their own templates" ON availability_templates
    FOR ALL
    USING (surgeon_id = auth.uid());

CREATE POLICY "Staff can view all templates" ON availability_templates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'staff'
        )
    );

CREATE POLICY "Staff can manage all templates" ON availability_templates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'staff'
        )
    );