-- Create notification categories type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_category') THEN
        CREATE TYPE notification_category AS ENUM (
            'confirmation',
            'reminder',
            'cancellation',
            'rescheduling'
        );
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- First, add the columns without constraints
ALTER TABLE notification_templates
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS category notification_category,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'german';

-- Update existing templates with default values
UPDATE notification_templates
SET 
    type = CASE
        WHEN body LIKE '%surgery%' THEN 'surgery'
        WHEN body LIKE '%minimal%' THEN 'minimal'
        ELSE 'consultation'
    END,
    category = 'reminder'::notification_category
WHERE type IS NULL;

-- Now add constraints if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'valid_template_type'
    ) THEN
        ALTER TABLE notification_templates
        ADD CONSTRAINT valid_template_type 
            CHECK (type IN ('surgery', 'minimal', 'consultation'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'valid_template_language'
    ) THEN
        ALTER TABLE notification_templates
        ADD CONSTRAINT valid_template_language
            CHECK (language IN ('german', 'english'));
    END IF;
END $$;

-- Make columns NOT NULL if they aren't already
DO $$ BEGIN
    ALTER TABLE notification_templates ALTER COLUMN type SET NOT NULL;
EXCEPTION
    WHEN others THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE notification_templates ALTER COLUMN category SET NOT NULL;
EXCEPTION
    WHEN others THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE notification_templates ALTER COLUMN language SET NOT NULL;
EXCEPTION
    WHEN others THEN null;
END $$;

-- Create index for faster template lookups
CREATE INDEX IF NOT EXISTS idx_notification_templates_lookup 
ON notification_templates(type, category, language);