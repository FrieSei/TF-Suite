-- Create staff settings table
CREATE TABLE IF NOT EXISTS public.staff_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
    access_level TEXT DEFAULT 'standard',
    managed_locations location_type[] DEFAULT ARRAY['Vienna']::location_type[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE staff_settings ENABLE ROW LEVEL SECURITY;

-- Add update trigger
CREATE TRIGGER update_staff_settings_updated_at
    BEFORE UPDATE ON staff_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
CREATE POLICY "Users can view their own settings" ON staff_settings
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON staff_settings
    FOR UPDATE
    USING (auth.uid() = user_id);