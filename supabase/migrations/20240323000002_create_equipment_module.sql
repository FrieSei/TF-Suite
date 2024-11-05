-- Function to update checklist status based on verifications
CREATE OR REPLACE FUNCTION update_checklist_status()
RETURNS TRIGGER AS $$
DECLARE
    all_verified BOOLEAN;
    any_verified BOOLEAN;
BEGIN
    -- Check if all items are verified and if any items are verified
    SELECT 
        COALESCE(bool_and(verified), false),
        COALESCE(bool_or(verified), false)
    INTO all_verified, any_verified
    FROM surgery_equipment_verifications
    WHERE checklist_id = NEW.checklist_id;

    -- Update the checklist status
    UPDATE surgery_equipment_checklists
    SET 
        status = CASE
            WHEN all_verified THEN 'VERIFIED'::equipment_verification_status
            WHEN any_verified THEN 'IN_PROGRESS'::equipment_verification_status
            ELSE 'NOT_STARTED'::equipment_verification_status
        END,
        last_verified = CASE
            WHEN NEW.verified THEN NEW.verified_at
            ELSE last_verified
        END,
        updated_at = now()
    WHERE id = NEW.checklist_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;