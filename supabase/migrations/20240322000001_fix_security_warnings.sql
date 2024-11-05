-- Create a dedicated schema for extensions if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Update function search paths without touching btree_gist
CREATE OR REPLACE FUNCTION public.validate_consultation_date()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM ptl_surgeries s
        WHERE s.id = NEW.surgery_id
        AND NEW.scheduled_date >= s.surgery_date
    ) THEN
        RAISE EXCEPTION 'Consultation must be scheduled before surgery date';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_ptl_surgery_status()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
BEGIN
    -- If consultation is completed, update surgery status
    IF NEW.consultation_status = 'COMPLETED' THEN
        NEW.surgery_status = 'CONSULTATION_COMPLETED';
    END IF;

    -- Block surgery if consultation not completed within 3 days of surgery
    IF NEW.consultation_status != 'COMPLETED' AND 
       NEW.surgery_date <= (CURRENT_TIMESTAMP + INTERVAL '3 days') THEN
        NEW.surgery_status = 'BLOCKED';
    END IF;

    RETURN NEW;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO public;
GRANT SELECT ON ALL TABLES IN SCHEMA extensions TO public;

-- Comment explaining why btree_gist remains in public schema
COMMENT ON EXTENSION btree_gist IS 'Extension remains in public schema due to existing dependencies. Moving it would require rebuilding all dependent objects.';