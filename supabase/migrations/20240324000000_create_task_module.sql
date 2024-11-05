-- Create task-related enums
CREATE TYPE task_type AS ENUM (
  'CONSULTATION',
  'BLOODWORK',
  'EQUIPMENT_CHECK',
  'PRESCRIPTIONS',
  'PATIENT_INSTRUCTIONS',
  'ANESTHESIA_CLEARANCE',
  'SURGICAL_PLANNING'
);

CREATE TYPE task_status AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'BLOCKED',
  'OVERDUE'
);

CREATE TYPE task_priority AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
);

-- Create surgery tasks table
CREATE TABLE IF NOT EXISTS public.surgery_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    surgery_id UUID REFERENCES surgeries(id) NOT NULL,
    type task_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    status task_status NOT NULL DEFAULT 'PENDING',
    priority task_priority NOT NULL,
    assigned_to UUID REFERENCES profiles(id),
    dependencies task_type[] DEFAULT '{}',
    notifications JSONB DEFAULT '[]',
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create task status logs table
CREATE TABLE IF NOT EXISTS public.task_status_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES surgery_tasks(id) NOT NULL,
    previous_status task_status,
    new_status task_status NOT NULL,
    changed_by UUID REFERENCES profiles(id) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_surgery_tasks_surgery ON surgery_tasks(surgery_id);
CREATE INDEX idx_surgery_tasks_status ON surgery_tasks(status);
CREATE INDEX idx_surgery_tasks_due_date ON surgery_tasks(due_date);
CREATE INDEX idx_surgery_tasks_assigned ON surgery_tasks(assigned_to);
CREATE INDEX idx_task_logs_task ON task_status_logs(task_id);

-- Add trigger for updating updated_at
CREATE TRIGGER update_surgery_tasks_timestamp
    BEFORE UPDATE ON surgery_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for logging status changes
CREATE OR REPLACE FUNCTION log_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO task_status_logs (
            task_id,
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_task_status
    AFTER UPDATE ON surgery_tasks
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION log_task_status_change();

-- Enable RLS
ALTER TABLE surgery_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_status_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view all tasks" ON surgery_tasks
    FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('surgeon', 'staff')
    ));

CREATE POLICY "Staff can manage tasks" ON surgery_tasks
    FOR ALL
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'staff'
    ));

CREATE POLICY "Assigned users can update their tasks" ON surgery_tasks
    FOR UPDATE
    USING (auth.uid() = assigned_to);

CREATE POLICY "Staff can view task logs" ON task_status_logs
    FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('surgeon', 'staff')
    ));