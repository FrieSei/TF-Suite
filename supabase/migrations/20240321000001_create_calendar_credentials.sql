-- Create calendar_credentials table
CREATE TABLE IF NOT EXISTS public.calendar_credentials (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expiry_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE calendar_credentials ENABLE ROW LEVEL SECURITY;

-- Users can only view their own credentials
CREATE POLICY "users_view_own_credentials" ON calendar_credentials
    FOR SELECT
    USING (user_id = auth.uid());

-- Only allow users to update their own credentials
CREATE POLICY "users_update_own_credentials" ON calendar_credentials
    FOR ALL
    USING (user_id = auth.uid());

-- Add update trigger
CREATE TRIGGER update_calendar_credentials_updated_at
    BEFORE UPDATE ON calendar_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();