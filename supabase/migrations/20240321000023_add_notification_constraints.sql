-- Add constraints to ensure proper notification handling
ALTER TABLE notification_rules
ADD CONSTRAINT unique_notification_rule 
UNIQUE (event_type, template_id);

-- Add indexes for faster notification processing
CREATE INDEX idx_notification_rules_lookup 
ON notification_rules(event_type, priority DESC);

-- Add trigger to validate notification rules
CREATE OR REPLACE FUNCTION validate_notification_rule()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure template exists
    IF NOT EXISTS (
        SELECT 1 FROM notification_templates 
        WHERE id = NEW.template_id
    ) THEN
        RAISE EXCEPTION 'Template does not exist';
    END IF;

    -- Ensure hours is positive
    IF NEW.hours <= 0 THEN
        RAISE EXCEPTION 'Hours must be positive';
    END IF;

    -- Ensure at least one channel is specified
    IF array_length(NEW.channels, 1) IS NULL THEN
        RAISE EXCEPTION 'At least one notification channel must be specified';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_notification_rule
    BEFORE INSERT OR UPDATE ON notification_rules
    FOR EACH ROW
    EXECUTE FUNCTION validate_notification_rule();