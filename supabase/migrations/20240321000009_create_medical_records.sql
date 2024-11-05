-- Create medical records table
CREATE TABLE IF NOT EXISTS public.medical_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES profiles(id) NOT NULL,
    record_type record_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    date TIMESTAMPTZ NOT NULL,
    surgeon_id UUID REFERENCES doctors(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

-- Add update trigger
CREATE TRIGGER update_medical_records_updated_at
    BEFORE UPDATE ON medical_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
CREATE POLICY "Surgeons can view their patients' records" ON medical_records
    FOR SELECT
    USING (
        surgeon_id = auth.uid() OR
        patient_id IN (
            SELECT patient_id FROM appointments WHERE surgeon_id = auth.uid()
        )
    );

CREATE POLICY "Staff can view all records" ON medical_records
    FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'staff'
    ));

CREATE POLICY "Staff can manage records" ON medical_records
    FOR ALL
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'staff'
    ));