-- Create custom types if they don't exist
DO $$ BEGIN
    -- Create location_type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'location_type') THEN
        CREATE TYPE location_type AS ENUM ('Vienna', 'Linz', 'Munich');
    END IF;

    -- Create appointment_type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_type') THEN
        CREATE TYPE appointment_type AS ENUM ('surgery', 'consultation', 'general');
    END IF;

    -- Create appointment_status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
        CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled');
    END IF;

    -- Create waiting_room_status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'waiting_room_status') THEN
        CREATE TYPE waiting_room_status AS ENUM ('not_arrived', 'checked_in', 'in_preparation', 'with_doctor', 'completed');
    END IF;

    -- Create doctor_role
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doctor_role') THEN
        CREATE TYPE doctor_role AS ENUM ('SURGEON', 'ANESTHESIOLOGIST');
    END IF;

    -- Create equipment_status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'equipment_status') THEN
        CREATE TYPE equipment_status AS ENUM ('operational', 'maintenance_needed', 'maintenance_scheduled', 'out_of_service');
    END IF;

    -- Create maintenance_status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_status') THEN
        CREATE TYPE maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
    END IF;

    -- Create record_type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'record_type') THEN
        CREATE TYPE record_type AS ENUM ('procedure', 'consultation', 'medication', 'note');
    END IF;

    -- Create schedule_type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_type') THEN
        CREATE TYPE schedule_type AS ENUM ('regular', 'on_call', 'surgery', 'consultation');
    END IF;
END $$;