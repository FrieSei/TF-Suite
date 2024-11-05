-- Drop existing functions first
DROP FUNCTION IF EXISTS public.validate_emergency_contact CASCADE;

-- Recreate function with secure search path
CREATE OR REPLACE FUNCTION public.validate_emergency_contact()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    -- Ensure emergency contact is not the patient themselves
    IF NEW.emergency_contact->>'email' = (
        SELECT email FROM profiles WHERE id = NEW.id
    ) THEN
        RAISE EXCEPTION 'Emergency contact cannot be the patient themselves';
    END IF;

    -- Ensure phone number is provided
    IF (NEW.emergency_contact->>'phone') IS NULL OR (NEW.emergency_contact->>'phone') = '' THEN
        RAISE EXCEPTION 'Emergency contact must have a phone number';
    END IF;

    -- Ensure relationship is provided
    IF (NEW.emergency_contact->>'relationship') IS NULL OR (NEW.emergency_contact->>'relationship') = '' THEN
        RAISE EXCEPTION 'Emergency contact must specify relationship';
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

-- Add comment explaining security measures
COMMENT ON FUNCTION public.validate_emergency_contact() IS 'Validates emergency contact information with secure search path and SECURITY DEFINER';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.validate_emergency_contact() TO authenticated;

-- Create helper function for emergency contact validation
CREATE OR REPLACE FUNCTION public.validate_contact_info(contact jsonb)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    RETURN (
        contact ? 'name' AND
        contact ? 'phone' AND
        contact ? 'relationship' AND
        length(contact->>'phone') >= 10 AND
        length(contact->>'name') >= 2
    );
END;
$$;

-- Add comment explaining helper function
COMMENT ON FUNCTION public.validate_contact_info(jsonb) IS 'Helper function to validate contact information structure';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.validate_contact_info(jsonb) TO authenticated;