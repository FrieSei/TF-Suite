-- Create notification channels type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel') THEN
        CREATE TYPE notification_channel AS ENUM ('email', 'sms');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add type column to notification rules
ALTER TABLE notification_rules
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- Update existing rules with appointment types
UPDATE notification_rules nr
SET type = nt.type
FROM notification_templates nt
WHERE nr.template_id = nt.id
AND nr.type IS NULL;

-- Add constraints if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'valid_rule_type'
    ) THEN
        ALTER TABLE notification_rules
        ADD CONSTRAINT valid_rule_type 
            CHECK (type IN ('surgery', 'minimal', 'consultation'));
    END IF;
END $$;

-- Make columns NOT NULL if they aren't already
DO $$ BEGIN
    ALTER TABLE notification_rules ALTER COLUMN type SET NOT NULL;
EXCEPTION
    WHEN others THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE notification_rules ALTER COLUMN priority SET NOT NULL;
EXCEPTION
    WHEN others THEN null;
END $$;

-- Add unique constraint for upsert if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'unique_notification_rule'
    ) THEN
        ALTER TABLE notification_rules
        ADD CONSTRAINT unique_notification_rule 
            UNIQUE (event_type, type);
    END IF;
END $$;

-- Insert default reminder rules one by one to avoid conflicts
DO $$ 
DECLARE
    template_record RECORD;
BEGIN
    FOR template_record IN 
        SELECT DISTINCT ON (type)
            id,
            type
        FROM notification_templates
        WHERE category = 'reminder'
        ORDER BY type, language -- Prioritize one language version
    LOOP
        INSERT INTO notification_rules (
            event_type,
            type,
            hours,
            channels,
            template_id,
            priority
        ) VALUES (
            'APPOINTMENT_REMINDER',
            template_record.type,
            CASE 
                WHEN template_record.type = 'surgery' THEN 24  -- 24 hours for surgery
                ELSE 24                                        -- 24 hours for others
            END,
            ARRAY['sms']::notification_channel[],
            template_record.id,
            CASE
                WHEN template_record.type = 'surgery' THEN 1   -- Higher priority for surgery
                ELSE 0                                         -- Normal priority for others
            END
        )
        ON CONFLICT ON CONSTRAINT unique_notification_rule 
        DO UPDATE SET 
            hours = EXCLUDED.hours,
            channels = EXCLUDED.channels,
            priority = EXCLUDED.priority,
            template_id = EXCLUDED.template_id;
    END LOOP;
END $$;