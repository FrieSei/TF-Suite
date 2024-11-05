-- First ensure the emergency_contact column exists
DO $$ 
BEGIN
    -- Add the column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'emergency_contact'
    ) THEN
        ALTER TABLE profiles
        ADD COLUMN emergency_contact JSONB DEFAULT '{}'::jsonb NOT NULL;
    END IF;
END $$;

-- Create index for the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'profiles'
        AND indexname = 'idx_profiles_emergency_contact'
    ) THEN
        CREATE INDEX idx_profiles_emergency_contact 
        ON profiles USING gin (emergency_contact);
    END IF;
END $$;

-- Now create the audit function with proper error handling
CREATE OR REPLACE FUNCTION public.audit_contact_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current user id with proper error handling
    SELECT auth.uid() INTO current_user_id;
    
    IF current_user_id IS NULL THEN
        -- Fallback to system user if available
        SELECT id INTO current_user_id
        FROM auth.users
        WHERE email = 'system@clinicflow.internal'
        LIMIT 1;
        
        IF current_user_id IS NULL THEN
            RAISE EXCEPTION 'No authenticated user or system user found';
        END IF;
    END IF;

    -- Only proceed if there's an actual change
    IF TG_OP = 'UPDATE' AND OLD.emergency_contact IS DISTINCT FROM NEW.emergency_contact THEN
        INSERT INTO audit_logs (
            operation,
            user_id,
            metadata,
            severity,
            timestamp
        ) VALUES (
            'EMERGENCY_CONTACT_UPDATE',
            current_user_id,
            jsonb_build_object(
                'profile_id', NEW.id,
                'previous', COALESCE(OLD.emergency_contact, '{}'::jsonb),
                'new', COALESCE(NEW.emergency_contact, '{}'::jsonb),
                'changed_fields', (
                    SELECT jsonb_object_agg(key, value)
                    FROM jsonb_each(NEW.emergency_contact)
                    WHERE NOT (OLD.emergency_contact ? key) OR
                          OLD.emergency_contact->key IS DISTINCT FROM NEW.emergency_contact->key
                )
            ),
            CASE
                WHEN OLD.emergency_contact IS NULL AND NEW.emergency_contact IS NOT NULL THEN 'INFO'
                WHEN OLD.emergency_contact IS NOT NULL AND NEW.emergency_contact IS NULL THEN 'WARNING'
                ELSE 'INFO'
            END,
            now()
        );
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error to a separate error_logs table if available
        -- For now, just raise the error
        RAISE EXCEPTION 'Error in audit_contact_changes: %', SQLERRM;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS audit_emergency_contact_changes ON profiles;

-- Create new trigger
CREATE TRIGGER audit_emergency_contact_changes
    AFTER UPDATE OF emergency_contact ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION audit_contact_changes();

-- Add helpful comments
COMMENT ON FUNCTION public.audit_contact_changes() IS 'Audits changes to emergency contact information with proper error handling';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.audit_contact_changes() TO authenticated;

-- Verify the setup
DO $$
BEGIN
    -- Verify column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'emergency_contact'
    ) THEN
        RAISE EXCEPTION 'Emergency contact column was not created successfully';
    END IF;

    -- Verify trigger exists
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'audit_emergency_contact_changes'
    ) THEN
        RAISE EXCEPTION 'Audit trigger was not created successfully';
    END IF;
END $$;