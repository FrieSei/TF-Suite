-- Create availability_templates table
CREATE TABLE IF NOT EXISTS public.availability_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    surgeon_id UUID REFERENCES public.profiles(id) NOT NULL,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location location_type NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Each surgeon can only have one active template per day per location
    UNIQUE(surgeon_id, day_of_week, location) WHERE is_active = true,
    
    -- Ensure end time is after start time
    CONSTRAINT valid_timerange CHECK (end_time > start_time)
);

-- Enable RLS
ALTER TABLE availability_templates ENABLE ROW LEVEL SECURITY;

-- Surgeons can view their own templates
CREATE POLICY "surgeons_view_own_templates" ON availability_templates
    FOR SELECT
    USING (surgeon_id = auth.uid());

-- Only allow surgeons to manage their own templates
CREATE POLICY "surgeons_manage_own_templates" ON availability_templates
    FOR ALL
    USING (surgeon_id = auth.uid());

-- Staff can view all templates
CREATE POLICY "staff_view_all_templates" ON availability_templates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'staff'
        )
    );

-- Staff can manage all templates
CREATE POLICY "staff_manage_all_templates" ON availability_templates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'staff'
        )
    );

-- Add update trigger
CREATE TRIGGER update_availability_templates_updated_at
    BEFORE UPDATE ON availability_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();