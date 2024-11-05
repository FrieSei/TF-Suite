-- Create doctors table
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    role doctor_role NOT NULL,
    calendar_id TEXT NOT NULL,
    default_location location_type NOT NULL,
    specializations TEXT[] DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT unique_calendar_id UNIQUE (calendar_id)
);

-- Enable RLS
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

-- Add update trigger
CREATE TRIGGER update_doctors_updated_at
    BEFORE UPDATE ON doctors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
CREATE POLICY "Public doctors are viewable by everyone" ON doctors
    FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own doctor profile" ON doctors
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_doctors_role_location ON doctors(role, default_location)
WHERE active = true;