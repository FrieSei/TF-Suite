-- Create calendar credentials table
CREATE TABLE IF NOT EXISTS public.calendar_credentials (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE calendar_credentials ENABLE ROW LEVEL SECURITY;

-- Add update trigger
CREATE TRIGGER update_calendar_credentials_updated_at
    BEFORE UPDATE ON calendar_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
CREATE POLICY "Users can view their own credentials" ON calendar_credentials
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials" ON calendar_credentials
    FOR ALL
    USING (auth.uid() = user_id);