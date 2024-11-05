-- Add comments table for appointments
CREATE TABLE IF NOT EXISTS public.appointment_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    appointment_id UUID REFERENCES appointments(id) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE appointment_comments ENABLE ROW LEVEL SECURITY;

-- Add update trigger
CREATE TRIGGER update_appointment_comments_updated_at
    BEFORE UPDATE ON appointment_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
CREATE POLICY "Staff can view all comments" ON appointment_comments
    FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('surgeon', 'staff')
    ));

CREATE POLICY "Staff can manage comments" ON appointment_comments
    FOR ALL
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('surgeon', 'staff')
    ));