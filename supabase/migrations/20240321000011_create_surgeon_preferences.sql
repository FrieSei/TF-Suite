-- Create surgeon preferences table
CREATE TABLE IF NOT EXISTS public.surgeon_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
    notification_preferences JSONB DEFAULT '{
        "surgery_reminders": true,
        "consultation_reminders": true,
        "emergency_alerts": true
    }',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE surgeon_preferences ENABLE ROW LEVEL SECURITY;

-- Add update trigger
CREATE TRIGGER update_surgeon_preferences_updated_at
    BEFORE UPDATE ON surgeon_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
CREATE POLICY "Users can view their own preferences" ON surgeon_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON surgeon_preferences
    FOR UPDATE
    USING (auth.uid() = user_id);