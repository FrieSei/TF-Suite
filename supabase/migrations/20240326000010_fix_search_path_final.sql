-- Drop all dependent objects first
DROP TRIGGER IF EXISTS check_emergency_contact ON profiles CASCADE;
DROP TRIGGER IF EXISTS enforce_emergency_contact ON surgeries CASCADE;
DROP TRIGGER IF EXISTS audit_emergency_contact_changes ON profiles CASCADE;
DROP TRIGGER IF EXISTS audit_surgery_emergency_contact_changes ON surgeries CASCADE;
DROP FUNCTION IF EXISTS public.validate_emergency_contact() CASCADE;
DROP FUNCTION IF EXISTS public.audit_contact_changes() CASCADE;
DROP FUNCTION IF EXISTS public.audit_surgery_contact_changes() CASCADE;

-- Recreate the validation function with immutable search path
CREATE OR REPLACE FUNCTION public.validate_emergency_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
STABLE AS $$
DECLARE
    _name text;
    _phone text;
    _relationship text;
BEGIN
    -- Use COALESCE to handle NULL values
    _name := COALESCE(NEW.emergency_contact->>'name', '');
    _phone := COALESCE(NEW.emergency_contact->>'phone', '');
    _relationship := COALESCE(NEW.emergency_contact->>'relationship', '');

    -- Validate required fields
    IF NOT (
        NEW.emergency_contact ? 'name' AND
        NEW.emergency_contact ? 'phone' AND
        NEW.emergency_contact ? 'relationship'
    ) THEN
        RAISE EXCEPTION 'Emergency contact must include name, phone, and relationship';
    END IF;

    -- Validate field lengths using variables
    IF length(trim(_name)) < 2 THEN
        RAISE EXCEPTION 'Emergency contact name must be at least 2 characters';
    END IF;

    IF length(trim(_phone)) < 10 THEN
        RAISE EXCEPTION 'Emergency contact phone must be at least 10 characters';
    END IF;

    IF length(trim(_relationship)) < 2 THEN
        RAISE EXCEPTION 'Emergency contact relationship must be at least 2 characters';
    END IF;

    -- Validate phone number format using variable
    IF NOT (_phone ~ '^\+?[0-9]{10,}$') THEN
        RAISE EXCEPTION 'Invalid phone number format';
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error validating emergency contact: %', SQLERRM;
END;
$$;

-- Rest of the file remains exactly the same...