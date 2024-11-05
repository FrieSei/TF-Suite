-- Create event_types table
CREATE TABLE IF NOT EXISTS public.event_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    category TEXT CHECK (category IN ('CONSULTATION', 'MINIMAL_INVASIVE', 'SURGICAL')) NOT NULL,
    description TEXT,
    possible_durations INTEGER[] NOT NULL,
    requires_anesthesiologist BOOLEAN NOT NULL DEFAULT false,
    color TEXT NOT NULL,
    calendar_type TEXT CHECK (calendar_type IN ('surgery', 'consultation', 'general')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_durations CHECK (array_length(possible_durations, 1) > 0)
);

-- Enable RLS
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Event types are viewable by everyone" ON event_types
    FOR SELECT
    USING (true);

-- Insert default event types
INSERT INTO event_types (name, code, category, description, possible_durations, requires_anesthesiologist, color, calendar_type) VALUES
    ('Telephone Consultation', 'TELE_CONSULT', 'CONSULTATION', 'Virtual consultation via telephone', ARRAY[15, 30], false, '#039BE5', 'consultation'),
    ('Aesthetic Medicine Consultation', 'AESTHETIC_CONSULT', 'CONSULTATION', 'In-person aesthetic medicine consultation', ARRAY[30, 45], false, '#7986CB', 'consultation'),
    ('Injectable Treatment', 'INJECTABLE', 'MINIMAL_INVASIVE', 'Botox and filler procedures', ARRAY[15, 30], false, '#33B679', 'general'),
    ('Facelift Surgery', 'FACELIFT', 'SURGICAL', 'Full facelift surgical procedure', ARRAY[180, 240], true, '#D50000', 'surgery'),
    ('Rhinoplasty', 'RHINOPLASTY', 'SURGICAL', 'Nose reshaping surgery', ARRAY[120, 180], true, '#E67C73', 'surgery'),
    ('Blepharoplasty', 'BLEPHAROPLASTY', 'SURGICAL', 'Eyelid surgery', ARRAY[90, 120], true, '#F4511E', 'surgery');