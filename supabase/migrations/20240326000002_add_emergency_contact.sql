-- Add emergency_contact column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}'::jsonb;

-- Add constraint to ensure emergency_contact has required fields
ALTER TABLE profiles
ADD CONSTRAINT valid_emergency_contact CHECK (
    emergency_contact IS NULL OR (
        emergency_contact ? 'name' AND
        emergency_contact ? 'phone' AND
        emergency_contact ? 'relationship'
    )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_emergency_contact 
ON profiles USING gin (emergency_contact);

-- Update function with proper error handling
CREATE OR REPLACE FUNCTION public.validate_emergency_contact()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    -- Skip validation if emergency_contact is null
    IF NEW.emergency_contact IS NULL THEN
        RETURN NEW;
    END IF;

    -- Validate required fields
    IF NOT (
        NEW.emergency_contact ? 'name' AND
        NEW.emergency_contact ? 'phone' AND
        NEW.emergency_contact ? 'relationship'
    ) THEN
        RAISE EXCEPTION 'Emergency contact must include name, phone, and relationship';
    END IF;

    -- Validate phone number format (basic validation)
    IF NOT (NEW.emergency_contact->>'phone' ~ '^\+?[0-9]{10,}$') THEN
        RAISE EXCEPTION 'Invalid phone number format';
    END IF;

    -- Ensure name is not empty
    IF length(trim(NEW.emergency_contact->>'name')) < 2 THEN
        RAISE EXCEPTION 'Emergency contact name must be at least 2 characters';
    END IF;

    -- Ensure relationship is not empty
    IF length(trim(NEW.emergency_contact->>'relationship')) < 2 THEN
        RAISE EXCEPTION 'Relationship must be specified';
    END IF;

    RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS check_emergency_contact ON profiles;
CREATE TRIGGER check_emergency_contact
    BEFORE INSERT OR UPDATE OF emergency_contact ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION validate_emergency_contact();

-- Update audit function to handle NULL values
CREATE OR REPLACE FUNCTION public.audit_contact_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.emergency_contact IS DISTINCT FROM NEW.emergency_contact THEN
        INSERT INTO audit_logs (
            operation,
            user_id,
            metadata,
            severity,
            timestamp
        ) VALUES (
            'EMERGENCY_CONTACT_UPDATE',
            auth.uid(),
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
END;
$$;

-- Recreate audit trigger
DROP TRIGGER IF EXISTS audit_emergency_contact_changes ON profiles;
CREATE TRIGGER audit_emergency_contact_changes
    AFTER UPDATE OF emergency_contact ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION audit_contact_changes();

-- Add helpful comments
COMMENT ON COLUMN profiles.emergency_contact IS 'JSON object containing emergency contact information';
COMMENT ON CONSTRAINT valid_emergency_contact ON profiles IS 'Ensures emergency contact has required fields';
COMMENT ON FUNCTION public.validate_emergency_contact() IS 'Validates emergency contact information structure and content';
COMMENT ON FUNCTION public.audit_contact_changes() IS 'Tracks changes to emergency contact information with detailed change logging';