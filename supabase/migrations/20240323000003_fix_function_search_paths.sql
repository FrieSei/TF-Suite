-- Create a dedicated schema for extensions if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Update all functions with explicit search paths and security definer
CREATE OR REPLACE FUNCTION public.validate_consultation_date()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
DECLARE
    surgery_date TIMESTAMPTZ;
BEGIN
    SELECT s.surgery_date INTO surgery_date
    FROM surgeries s
    WHERE s.id = NEW.surgery_id;

    IF NEW.scheduled_date >= surgery_date THEN
        RAISE EXCEPTION 'Consultation must be scheduled before surgery date';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_surgeries_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_surgery_status_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    IF (OLD.current_status IS DISTINCT FROM NEW.current_status) THEN
        INSERT INTO surgery_status_logs (
            surgery_id,
            previous_status,
            new_status,
            changed_by,
            timestamp
        ) VALUES (
            NEW.id,
            OLD.current_status,
            NEW.current_status,
            auth.uid(),
            now()
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_surgery_status_transition()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.current_status IN ('COMPLETED'::surgery_status, 'CANCELLED'::surgery_status) THEN
        RAISE EXCEPTION 'Cannot modify completed or cancelled surgeries';
    END IF;

    IF NOT (
        (OLD.current_status = 'SCHEDULED'::surgery_status AND NEW.current_status IN ('IN_PREPARATION'::surgery_status, 'CANCELLED'::surgery_status)) OR
        (OLD.current_status = 'IN_PREPARATION'::surgery_status AND NEW.current_status IN ('READY'::surgery_status, 'BLOCKED'::surgery_status, 'CANCELLED'::surgery_status)) OR
        (OLD.current_status = 'READY'::surgery_status AND NEW.current_status IN ('COMPLETED'::surgery_status, 'BLOCKED'::surgery_status, 'CANCELLED'::surgery_status)) OR
        (OLD.current_status = 'BLOCKED'::surgery_status AND NEW.current_status IN ('READY'::surgery_status, 'CANCELLED'::surgery_status))
    ) THEN
        RAISE EXCEPTION 'Invalid surgery status transition from % to %', OLD.current_status, NEW.current_status;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_consultations_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_consultation_status_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO consultation_logs (
            consultation_id,
            previous_status,
            new_status,
            changed_by,
            notes
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            auth.uid(),
            NEW.notes
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_consultation_requirement(surgery_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
DECLARE
    surgery_date DATE;
    consultation_complete BOOLEAN;
BEGIN
    SELECT surgery_date::DATE INTO surgery_date
    FROM surgeries
    WHERE id = surgery_id;

    SELECT EXISTS (
        SELECT 1
        FROM consultations
        WHERE surgery_id = surgery_id
        AND status = 'COMPLETED'
        AND completed_date < (surgery_date - INTERVAL '3 days')
    ) INTO consultation_complete;

    RETURN consultation_complete;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_surgery_consultation_status()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'COMPLETED' THEN
        UPDATE surgeries
        SET current_status = 
            CASE 
                WHEN current_status = 'BLOCKED' THEN 'READY'
                ELSE current_status
            END
        WHERE id = NEW.surgery_id;
    END IF;

    IF NEW.status = 'CANCELLED' AND 
       EXISTS (
           SELECT 1 
           FROM surgeries 
           WHERE id = NEW.surgery_id 
           AND surgery_date <= (CURRENT_DATE + INTERVAL '3 days')
       ) 
    THEN
        UPDATE surgeries
        SET current_status = 'BLOCKED'
        WHERE id = NEW.surgery_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_checklist_status()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
DECLARE
    all_verified BOOLEAN;
    any_verified BOOLEAN;
BEGIN
    SELECT 
        COALESCE(bool_and(verified), false),
        COALESCE(bool_or(verified), false)
    INTO all_verified, any_verified
    FROM surgery_equipment_verifications
    WHERE checklist_id = NEW.checklist_id;

    UPDATE surgery_equipment_checklists
    SET 
        status = CASE
            WHEN all_verified THEN 'VERIFIED'::equipment_verification_status
            WHEN any_verified THEN 'IN_PROGRESS'::equipment_verification_status
            ELSE 'NOT_STARTED'::equipment_verification_status
        END,
        last_verified = CASE
            WHEN NEW.verified THEN NEW.verified_at
            ELSE last_verified
        END,
        updated_at = now()
    WHERE id = NEW.checklist_id;

    RETURN NEW;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO public;
GRANT SELECT ON ALL TABLES IN SCHEMA extensions TO public;