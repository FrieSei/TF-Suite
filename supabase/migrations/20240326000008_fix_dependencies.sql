-- Drop dependent triggers and functions with CASCADE
DROP TRIGGER IF EXISTS check_emergency_contact ON profiles;
DROP TRIGGER IF EXISTS enforce_emergency_contact ON surgeries;
DROP FUNCTION IF EXISTS public.validate_emergency_contact() CASCADE;

-- Recreate function with explicit search path
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
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and re-raise
        RAISE EXCEPTION 'Error validating emergency contact: %', SQLERRM;
END;
$$;

-- Recreate triggers
CREATE TRIGGER check_emergency_contact
    BEFORE INSERT OR UPDATE OF emergency_contact ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION validate_emergency_contact();

CREATE TRIGGER enforce_emergency_contact
    BEFORE INSERT OR UPDATE OF emergency_contact ON surgeries
    FOR EACH ROW
    EXECUTE FUNCTION validate_emergency_contact();

-- Add helpful comments
COMMENT ON FUNCTION public.validate_emergency_contact() IS 'Validates emergency contact information with secure search path';
COMMENT ON TRIGGER check_emergency_contact ON profiles IS 'Enforces emergency contact validation on profiles';
COMMENT ON TRIGGER enforce_emergency_contact ON surgeries IS 'Enforces emergency contact validation on surgeries';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.validate_emergency_contact() TO authenticated;

-- Verify function security and dependencies
DO $$
BEGIN
    -- Verify function exists with SECURITY DEFINER
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'validate_emergency_contact'
        AND p.prosecdef = true
    ) THEN
        RAISE EXCEPTION 'Function not properly secured';
    END IF;

    -- Verify search_path is set
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'validate_emergency_contact'
        AND p.proconfig @> ARRAY['search_path=public, extensions']
    ) THEN
        RAISE EXCEPTION 'Search path not properly set';
    END IF;

    -- Verify triggers exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname IN ('check_emergency_contact', 'enforce_emergency_contact')
    ) THEN
        RAISE EXCEPTION 'Triggers not properly recreated';
    END IF;
END $$;