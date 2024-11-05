-- First, ensure we can create types
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing types if they exist
DO $$ BEGIN
    DROP TYPE IF EXISTS notification_channel CASCADE;
    DROP TYPE IF EXISTS notification_status CASCADE;
    DROP TYPE IF EXISTS notification_trigger CASCADE;
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- Create notification types
CREATE TYPE notification_channel AS ENUM ('email', 'sms');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');
CREATE TYPE notification_trigger AS ENUM (
    'appointment_created',
    'appointment_reminder',
    'appointment_cancelled',
    'appointment_rescheduled'
);

-- Create notification_templates table
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    variables TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create notification_rules table
CREATE TABLE IF NOT EXISTS public.notification_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_type TEXT NOT NULL,
    hours INTEGER NOT NULL,
    channels notification_channel[] NOT NULL,
    template_id UUID REFERENCES notification_templates(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Update notifications table
ALTER TABLE IF EXISTS notifications
    ADD COLUMN IF NOT EXISTS trigger_type notification_trigger,
    ALTER COLUMN channel DROP NOT NULL,
    ALTER COLUMN status DROP NOT NULL;

-- Convert existing data to new types
UPDATE notifications 
SET 
    channel = channel::notification_channel,
    status = status::notification_status
WHERE 
    channel IS NOT NULL 
    AND status IS NOT NULL;

-- Add NOT NULL constraints back
ALTER TABLE notifications
    ALTER COLUMN channel SET NOT NULL,
    ALTER COLUMN status SET NOT NULL;

-- Add update triggers
DROP TRIGGER IF EXISTS update_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_rules_updated_at ON notification_rules;
CREATE TRIGGER update_notification_rules_updated_at
    BEFORE UPDATE ON notification_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Staff can view notification templates" ON notification_templates;
CREATE POLICY "Staff can view notification templates" ON notification_templates
    FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'staff'
    ));

DROP POLICY IF EXISTS "Staff can manage notification templates" ON notification_templates;
CREATE POLICY "Staff can manage notification templates" ON notification_templates
    FOR ALL
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'staff'
    ));

DROP POLICY IF EXISTS "Staff can view notification rules" ON notification_rules;
CREATE POLICY "Staff can view notification rules" ON notification_rules
    FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'staff'
    ));

DROP POLICY IF EXISTS "Staff can manage notification rules" ON notification_rules;
CREATE POLICY "Staff can manage notification rules" ON notification_rules
    FOR ALL
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'staff'
    ));