-- Enable the pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a function to generate searchable text from encrypted content
CREATE OR REPLACE FUNCTION generate_note_search_text()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql AS $$
DECLARE
    decrypted_content TEXT;
    metadata_text TEXT;
BEGIN
    -- Extract searchable text from metadata
    metadata_text := COALESCE(
        NEW.metadata->>'visitType', ''
    ) || ' ' || COALESCE(
        NEW.metadata->>'tags', ''
    );

    -- Create search document
    NEW.search_text := to_tsvector('english',
        COALESCE(NEW.decrypted_content, '') || ' ' ||
        metadata_text
    );

    RETURN NEW;
END;
$$;

-- Add search columns to clinical notes
ALTER TABLE patient_clinical_notes
ADD COLUMN IF NOT EXISTS search_text tsvector,
ADD COLUMN IF NOT EXISTS decrypted_content TEXT;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_notes_search 
ON patient_clinical_notes USING GIN(search_text);

-- Create trigger to update search text
CREATE TRIGGER update_note_search_text
    BEFORE INSERT OR UPDATE OF decrypted_content, metadata
    ON patient_clinical_notes
    FOR EACH ROW
    EXECUTE FUNCTION generate_note_search_text();

-- Create function for searching notes
CREATE OR REPLACE FUNCTION search_clinical_notes(
    search_query TEXT,
    p_surgeon_id UUID,
    p_patient_id UUID DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_date_from TIMESTAMPTZ DEFAULT NULL,
    p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    patient_id UUID,
    surgeon_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    metadata JSONB,
    decrypted_content TEXT,
    rank REAL
)
SECURITY DEFINER
SET search_path = public, extensions
STABLE
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.patient_id,
        n.surgeon_id,
        n.created_at,
        n.updated_at,
        n.metadata,
        n.decrypted_content,
        ts_rank(n.search_text, to_tsquery('english', search_query)) as rank
    FROM patient_clinical_notes n
    WHERE
        n.surgeon_id = p_surgeon_id
        AND n.search_text @@ to_tsquery('english', search_query)
        AND (p_patient_id IS NULL OR n.patient_id = p_patient_id)
        AND (p_tags IS NULL OR n.metadata->>'tags' ?| p_tags)
        AND (
            p_date_from IS NULL OR
            n.created_at >= p_date_from
        )
        AND (
            p_date_to IS NULL OR
            n.created_at <= p_date_to
        )
        AND n.deleted_at IS NULL
    ORDER BY rank DESC;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION search_clinical_notes TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION search_clinical_notes IS 'Search clinical notes with full-text search and filtering';
COMMENT ON COLUMN patient_clinical_notes.search_text IS 'Searchable text vector for full-text search';
COMMENT ON COLUMN patient_clinical_notes.decrypted_content IS 'Temporary storage for searchable content';