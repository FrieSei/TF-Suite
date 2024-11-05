-- Create a function to handle the audit logging with proper user_id handling
CREATE OR REPLACE FUNCTION public.log_emergency_contact_cleanup()
RETURNS void
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
DECLARE
    system_user UUID;
BEGIN
    -- Get or create a system user for automated operations
    SELECT id INTO system_user
    FROM auth.users
    WHERE email = 'system@clinicflow.internal'
    LIMIT 1;

    IF system_user IS NULL THEN
        -- Create system user if it doesn't exist
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at,
            phone,
            phone_confirmed_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            aud,
            role,
            last_sign_in_at
        ) VALUES (
            uuid_generate_v4(), -- Generate UUID for id
            '00000000-0000-0000-0000-000000000000', -- Default instance_id
            'system@clinicflow.internal',
            crypt('system', gen_salt('bf')),
            now(),
            '{"provider": "system", "providers": ["system"]}',
            '{"role": "service_account"}',
            false,
            now(),
            now(),
            null,
            null,
            null,
            null,
            null,
            null,
            'authenticated',
            'authenticated',
            now()
        )
        RETURNING id INTO system_user;
    END IF;

    -- Insert audit logs with system user
    INSERT INTO audit_logs (
        operation,
        user_id,
        metadata,
        severity,
        timestamp
    )
    SELECT 
        'EMERGENCY_CONTACT_CLEANUP',
        system_user,
        jsonb_build_object(
            'profile_id', id,
            'previous', emergency_contact,
            'action', 'Data normalization'
        ),
        'INFO',
        now()
    FROM profiles
    WHERE emergency_contact != '{}'::jsonb;
END;
$$;

-- Execute the function
SELECT public.log_emergency_contact_cleanup();

-- Drop the function after use
DROP FUNCTION public.log_emergency_contact_cleanup();

-- Update the audit_contact_changes function to handle NULL user_id
CREATE OR REPLACE FUNCTION public.audit_contact_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current user id, fallback to system user
    SELECT COALESCE(
        auth.uid(),
        (SELECT id FROM auth.users WHERE email = 'system@clinicflow.internal')
    ) INTO current_user_id;

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user or system user found';
    END IF;

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
END;
$$;

-- Add helpful comments
COMMENT ON FUNCTION public.audit_contact_changes() IS 'Audits emergency contact changes with proper user attribution';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.audit_contact_changes() TO authenticated;