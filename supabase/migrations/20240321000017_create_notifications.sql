-- Create notifications table with basic types first
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    appointment_id UUID REFERENCES appointments(id) NOT NULL,
    patient_id UUID REFERENCES profiles(id) NOT NULL,
    channel TEXT NOT NULL,
    template_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Basic constraints before enum types are created
    CONSTRAINT valid_channel CHECK (channel IN ('email', 'sms')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed'))
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Add update trigger
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
CREATE POLICY "Staff can view all notifications" ON notifications
    FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'staff'
    ));

CREATE POLICY "Staff can manage notifications" ON notifications
    FOR ALL
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'staff'
    ));

-- Create index for faster notification processing
CREATE INDEX idx_notifications_scheduled 
ON notifications(scheduled_for) 
WHERE status = 'pending';