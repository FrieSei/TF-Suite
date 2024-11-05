-- Add waiting room status to appointments
ALTER TABLE appointments
    ADD COLUMN check_in_time TIMESTAMPTZ,
    ADD COLUMN waiting_room_status waiting_room_status DEFAULT 'not_arrived';

-- Add indexes for faster waiting room queries
CREATE INDEX idx_appointments_waiting_room ON appointments(start_time, waiting_room_status)
WHERE status = 'scheduled';

-- Add function to automatically update waiting room status
CREATE OR REPLACE FUNCTION update_waiting_room_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        NEW.waiting_room_status = 'completed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_waiting_room_status
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_waiting_room_status();