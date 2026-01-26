-- Migration: 009_create_corrections_table.sql
-- Description: Create corrections table for visible correction deployment
-- Date: January 25, 2026

-- ==============================================================================
-- CORRECTIONS TABLE
-- ==============================================================================
-- Stores visible corrections to flagged or incorrect responses

CREATE TABLE IF NOT EXISTS corrections (
  id VARCHAR(255) PRIMARY KEY,
  original_message_id VARCHAR(255) NOT NULL,
  original_text TEXT NOT NULL,
  corrected_text TEXT NOT NULL,
  reason TEXT NOT NULL,
  flagged_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  deployed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  visible BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_corrections_original_message_id ON corrections(original_message_id);
CREATE INDEX IF NOT EXISTS idx_corrections_visible ON corrections(visible);
CREATE INDEX IF NOT EXISTS idx_corrections_deployed_at ON corrections(deployed_at);
CREATE INDEX IF NOT EXISTS idx_corrections_flagged_by ON corrections(flagged_by);

-- GIN index for JSONB metadata
CREATE INDEX IF NOT EXISTS idx_corrections_metadata ON corrections USING GIN(metadata);

-- Table comment
COMMENT ON TABLE corrections IS 'Visible corrections deployed for flagged or incorrect responses';
COMMENT ON COLUMN corrections.original_message_id IS 'ID of the original message that was flagged';
COMMENT ON COLUMN corrections.corrected_text IS 'The corrected version of the response';
COMMENT ON COLUMN corrections.reason IS 'Reason for the correction';
COMMENT ON COLUMN corrections.visible IS 'Whether this correction is currently visible to users';

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 009: corrections table created successfully!';
END $$;
