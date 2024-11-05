-- First add emergency_contact column to surgeries table
ALTER TABLE surgeries
ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}'::jsonb NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_surgeries_emergency_contact 
ON surgeries USING gin (emergency_contact);

-- Add constraint to ensure emergency_contact has required fields
ALTER TABLE surgeries
ADD CONSTRAINT valid_surgery_emergency_contact CHECK (
    emergency_contact IS NOT NULL AND
    emergency_contact ? 'name' AND
    emergency_contact ? 'phone' AND
    emergency_contact ? 'relationship' AND
    length(emergency_contact->>'name') >= 2 AND
    length(emergency_contact->>'phone') >= 10 AND
    length(emergency_contact->>'relationship') >= 2
);

-- Drop and recreate the trigger with proper error handling
DROP TRIGGER IF EXISTS enforce_emergency_contact ON surgeries;
CREATE TRIGGER enforce_emergency_contact
    BEFORE INSERT OR UPDATE OF emergency_contact ON surgeries
    FOR EACH ROW
    EXECUTE FUNCTION validate_emergency_contact();

-- Add audit logging for surgeries emergency contacts
CREATE OR REPLACE FUNCTION public.audit_surgery_contact_changes()
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
        SELECT id INTO current_user_id
        FROM auth.users
        WHERE email = 'system@clinicflow.internal'
        LIMIT 1;
        
        IF current_user_id IS NULL THEN
            RAISE EXCEPTION 'No authenticated user or system user found';
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.emergency_contact IS DISTINCT FROM NEW.emergency_contact THEN
        INSERT INTO audit_logs (
            operation,
            user_id,
            metadata,
            severity,
            timestamp
        ) VALUES (
            'SURGERY_EMERGENCY_CONTACT_UPDATE',
            current_user_id,
            jsonb_build_object(
                'surgery_id', NEW.id,
                'previous', COALESCE(OLD.emergency_contact, '{}'::jsonb),
                'new', COALESCE(NEW.emergency_contact, '{}'::jsonb),
                'changed_fields', (
                    SELECT jsonb_object_agg(key, value)
                    FROM jsonb_each(NEW.emergency_contact)
                    WHERE NOT (OLD.emergency_contact ? key) OR
                          OLD.emergency_contact->key IS DISTINCT FROM NEW.emergency_contact->key
                )
            ),
            'INFO',
            now()
        );
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in audit_surgery_contact_changes: %', SQLERRM;
END;
$$;

-- Create trigger for surgery contact auditing
DROP TRIGGER IF EXISTS audit_surgery_emergency_contact_changes ON surgeries;
CREATE TRIGGER audit_surgery_emergency_contact_changes
    AFTER UPDATE OF emergency_contact ON surgeries
    FOR EACH ROW
    EXECUTE FUNCTION audit_surgery_contact_changes();

-- Add helpful comments
COMMENT ON COLUMN surgeries.emergency_contact IS 'JSON object containing emergency contact information for this specific surgery';
COMMENT ON CONSTRAINT valid_surgery_emergency_contact ON surgeries IS 'Ensures surgery emergency contact contains required fields with valid formats';
COMMENT ON FUNCTION public.audit_surgery_contact_changes() IS 'Audits changes to surgery emergency contact information';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.audit_surgery_contact_changes() TO authenticated;

-- Verify setup
DO $$
BEGIN
    -- Verify column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'surgeries' 
        AND column_name = 'emergency_contact'
    ) THEN
        RAISE EXCEPTION 'Emergency contact column was not created successfully in surgeries table';
    END IF;

    -- Verify triggers exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname IN ('enforce_emergency_contact', 'audit_surgery_emergency_contact_changes')
    ) THEN
        RAISE EXCEPTION 'Triggers were not created successfully for surgeries table';
    END IF;

    -- Verify constraint exists
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'valid_surgery_emergency_contact'
    ) THEN
        RAISE EXCEPTION 'Constraint was not created successfully for surgeries table';
    END IF;
END $$;