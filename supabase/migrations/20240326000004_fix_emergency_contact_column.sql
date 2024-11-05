-- First check if the column exists
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
        ADD COLUMN emergency_contact JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Now we can safely proceed with the updates
UPDATE profiles 
SET emergency_contact = '{}'::jsonb 
WHERE emergency_contact IS NULL;

-- Update any invalid emergency_contact entries to include required fields
UPDATE profiles 
SET emergency_contact = jsonb_build_object(
    'name', COALESCE(emergency_contact->>'name', 'Unknown'),
    'phone', COALESCE(emergency_contact->>'phone', 'Not provided'),
    'relationship', COALESCE(emergency_contact->>'relationship', 'Not specified')
)
WHERE emergency_contact IS NOT NULL 
AND (
    NOT emergency_contact ? 'name' OR 
    NOT emergency_contact ? 'phone' OR 
    NOT emergency_contact ? 'relationship'
);

-- Drop existing constraint if it exists
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS valid_emergency_contact;

-- Add the constraint
ALTER TABLE profiles
ADD CONSTRAINT valid_emergency_contact CHECK (
    emergency_contact IS NOT NULL AND
    emergency_contact ? 'name' AND
    emergency_contact ? 'phone' AND
    emergency_contact ? 'relationship' AND
    length(emergency_contact->>'name') >= 2 AND
    length(emergency_contact->>'phone') >= 10 AND
    length(emergency_contact->>'relationship') >= 2
);

-- Recreate index
DROP INDEX IF EXISTS idx_profiles_emergency_contact;
CREATE INDEX idx_profiles_emergency_contact 
ON profiles USING gin (emergency_contact);

-- Update the validation function
CREATE OR REPLACE FUNCTION public.validate_emergency_contact()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    -- Ensure emergency_contact is not null
    IF NEW.emergency_contact IS NULL THEN
        NEW.emergency_contact := '{}'::jsonb;
    END IF;

    -- Validate required fields
    IF NOT (
        NEW.emergency_contact ? 'name' AND
        NEW.emergency_contact ? 'phone' AND
        NEW.emergency_contact ? 'relationship'
    ) THEN
        RAISE EXCEPTION 'Emergency contact must include name, phone, and relationship';
    END IF;

    -- Validate field lengths
    IF length(trim(NEW.emergency_contact->>'name')) < 2 THEN
        RAISE EXCEPTION 'Emergency contact name must be at least 2 characters';
    END IF;

    IF length(trim(NEW.emergency_contact->>'phone')) < 10 THEN
        RAISE EXCEPTION 'Emergency contact phone must be at least 10 characters';
    END IF;

    IF length(trim(NEW.emergency_contact->>'relationship')) < 2 THEN
        RAISE EXCEPTION 'Emergency contact relationship must be at least 2 characters';
    END IF;

    -- Validate phone number format
    IF NOT (NEW.emergency_contact->>'phone' ~ '^\+?[0-9]{10,}$') THEN
        RAISE EXCEPTION 'Invalid phone number format';
    END IF;

    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS check_emergency_contact ON profiles;
CREATE TRIGGER check_emergency_contact
    BEFORE INSERT OR UPDATE OF emergency_contact ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION validate_emergency_contact();

-- Add audit logging for the data cleanup
DO $$ 
BEGIN
    -- Only insert audit logs if the audit_logs table exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'audit_logs'
    ) THEN
        INSERT INTO audit_logs (
            operation,
            user_id,
            metadata,
            severity,
            timestamp
        )
        SELECT 
            'EMERGENCY_CONTACT_CLEANUP',
            auth.uid(),
            jsonb_build_object(
                'profile_id', id,
                'previous', emergency_contact,
                'action', 'Data normalization'
            ),
            'INFO',
            now()
        FROM profiles
        WHERE emergency_contact != '{}'::jsonb;
    END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN profiles.emergency_contact IS 'JSON object containing emergency contact information';
COMMENT ON CONSTRAINT valid_emergency_contact ON profiles IS 'Ensures emergency contact contains required fields with valid formats';
COMMENT ON FUNCTION public.validate_emergency_contact() IS 'Validates emergency contact information including field presence and format';