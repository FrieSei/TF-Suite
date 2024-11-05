-- Create calendar_integrations table
CREATE TABLE IF NOT EXISTS public.calendar_integrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    calendar_id TEXT NOT NULL,
    calendar_type appointment_type NOT NULL,
    location location_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Each user can only have one calendar per type per location
    UNIQUE(user_id, calendar_type, location)
);

-- Enable RLS
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;

-- Users can view their own calendar integrations
CREATE POLICY "users_view_own_integrations" ON calendar_integrations
    FOR SELECT
    USING (user_id = auth.uid());

-- Only allow users to manage their own calendar integrations
CREATE POLICY "users_manage_own_integrations" ON calendar_integrations
    FOR ALL
    USING (user_id = auth.uid());

-- Add update trigger
CREATE TRIGGER update_calendar_integrations_updated_at
    BEFORE UPDATE ON calendar_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();