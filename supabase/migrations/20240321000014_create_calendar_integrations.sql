-- Create calendar integrations table
CREATE TABLE IF NOT EXISTS public.calendar_integrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    calendar_id TEXT NOT NULL,
    calendar_type appointment_type NOT NULL,
    location location_type NOT NULL,
    sync_enabled BOOLEAN DEFAULT true,
    last_synced TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Each user can only have one calendar per type per location
    UNIQUE(user_id, calendar_type, location)
);

-- Enable RLS
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;

-- Add update trigger (with conditional check)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_calendar_integrations_updated_at'
    ) THEN
        CREATE TRIGGER update_calendar_integrations_updated_at
            BEFORE UPDATE ON calendar_integrations
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- RLS Policies
CREATE POLICY "Users can view their own integrations" ON calendar_integrations
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own integrations" ON calendar_integrations
    FOR ALL
    USING (auth.uid() = user_id);