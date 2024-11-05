-- Create patient requirements table
CREATE TABLE IF NOT EXISTS public.patient_requirements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    surgery_id UUID REFERENCES surgeries(id) NOT NULL,
    patient_id UUID REFERENCES profiles(id) NOT NULL,
    bloodwork JSONB NOT NULL DEFAULT '{
      "status": "PENDING",
      "dueDate": null
    }',
    ecg JSONB NOT NULL DEFAULT '{
      "status": "PENDING",
      "dueDate": null
    }',
    medications JSONB NOT NULL DEFAULT '{
      "status": "NONE",
      "currentMedications": []
    }',
    instructions JSONB NOT NULL DEFAULT '{
      "status": "NOT_SENT",
      "documents": []
    }',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT unique_patient_surgery 
      UNIQUE(patient_id, surgery_id)
);

-- Add indexes
CREATE INDEX idx_patient_requirements_surgery 
  ON patient_requirements(surgery_id);
CREATE INDEX idx_patient_requirements_patient 
  ON patient_requirements(patient_id);

-- Add update trigger
CREATE TRIGGER update_patient_requirements_timestamp
    BEFORE UPDATE ON patient_requirements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE patient_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view all requirements" ON patient_requirements
    FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('surgeon', 'staff')
    ));

CREATE POLICY "Staff can manage requirements" ON patient_requirements
    FOR ALL
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'staff'
    ));