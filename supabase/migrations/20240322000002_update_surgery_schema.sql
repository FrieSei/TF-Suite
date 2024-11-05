-- Update surgery status enum
ALTER TYPE surgery_status ADD VALUE IF NOT EXISTS 'SCHEDULED';
ALTER TYPE surgery_status ADD VALUE IF NOT EXISTS 'IN_PREPARATION';
ALTER TYPE surgery_status ADD VALUE IF NOT EXISTS 'READY';
ALTER TYPE surgery_status ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE surgery_status ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Update PTL type enum
ALTER TYPE ptl_type ADD VALUE IF NOT EXISTS 'TYPE_1';
ALTER TYPE ptl_type ADD VALUE IF NOT EXISTS 'TYPE_2';
ALTER TYPE ptl_type ADD VALUE IF NOT EXISTS 'TYPE_3';

-- Add new columns to ptl_surgeries table
ALTER TABLE ptl_surgeries
ADD COLUMN IF NOT EXISTS current_status surgery_status NOT NULL DEFAULT 'SCHEDULED',
ADD COLUMN IF NOT EXISTS surgeon_id UUID REFERENCES doctors(id),
ADD COLUMN IF NOT EXISTS anesthesiologist_id UUID REFERENCES doctors(id),
ADD COLUMN IF NOT EXISTS location location_type;

-- Create surgery status logs table
CREATE TABLE IF NOT EXISTS public.surgery_status_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    surgery_id UUID REFERENCES ptl_surgeries(id) NOT NULL,
    previous_status surgery_status NOT NULL,
    new_status surgery_status NOT NULL,
    changed_by UUID REFERENCES profiles(id) NOT NULL,
    reason TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on new table
ALTER TABLE surgery_status_logs ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for status logs
CREATE POLICY "Staff can view surgery status logs" ON surgery_status_logs
    FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('surgeon', 'staff')
    ));

CREATE POLICY "Staff can create surgery status logs" ON surgery_status_logs
    FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('surgeon', 'staff')
    ));