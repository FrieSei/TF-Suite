-- Create audit function for contact changes
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
                'previous', OLD.emergency_contact,
                'new', NEW.emergency_contact
            ),
            'INFO',
            now()
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for auditing
DROP TRIGGER IF EXISTS audit_emergency_contact_changes ON profiles;
CREATE TRIGGER audit_emergency_contact_changes
    AFTER UPDATE OF emergency_contact ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION audit_contact_changes();

-- Add comment explaining audit function
COMMENT ON FUNCTION public.audit_contact_changes() IS 'Audits changes to emergency contact information';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.audit_contact_changes() TO authenticated;