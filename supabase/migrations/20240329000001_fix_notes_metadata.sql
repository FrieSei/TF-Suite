-- Add metadata column to patient_clinical_notes
ALTER TABLE patient_clinical_notes
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for metadata search
CREATE INDEX IF NOT EXISTS idx_notes_metadata 
ON patient_clinical_notes USING gin(metadata);

-- Update search function to include metadata
CREATE OR REPLACE FUNCTION generate_note_search_text()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
DECLARE
    metadata_text TEXT;
BEGIN
    -- Extract searchable text from metadata
    metadata_text := COALESCE(
        NEW.metadata->>'visitType', ''
    ) || ' ' || COALESCE(
        NEW.metadata->>'tags', ''
    ) || ' ' || COALESCE(
        NEW.metadata->>'surgeryType', ''
    );

    -- Create search document
    NEW.search_text := to_tsvector('english',
        COALESCE(NEW.decrypted_content, '') || ' ' ||
        metadata_text
    );

    RETURN NEW;
END;
$$;

-- Add helpful comments
COMMENT ON COLUMN patient_clinical_notes.metadata IS 'JSON metadata for the note including tags, visit type, and other attributes';

-- Verify setup
DO $$
BEGIN
    -- Verify column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'patient_clinical_notes' 
        AND column_name = 'metadata'
    ) THEN
        RAISE EXCEPTION 'metadata column was not created successfully';
    END IF;

    -- Verify index exists
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'patient_clinical_notes'
        AND indexname = 'idx_notes_metadata'
    ) THEN
        RAISE EXCEPTION 'Metadata index was not created successfully';
    END IF;
END $$;