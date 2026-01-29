-- Migration: 008_create_audit_trail.sql
-- Description: Create audit_trail table for comprehensive logging of AI decisions, bias corrections, handoffs, and user interactions
-- Date: January 25, 2026

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- AUDIT_TRAIL TABLE
-- ==============================================================================
-- Complete logging of all AI decisions, bias corrections, handoffs, and user interactions
-- for compliance, governance, and system improvement.

CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  message TEXT NOT NULL,
  details JSONB, -- Event-specific data stored as JSON
  ai_decision JSONB, -- AI decision tracking (model, confidence, reasoning, alternatives)
  user_impact VARCHAR(20) CHECK (user_impact IN ('low', 'medium', 'high', 'critical')),
  system_impact VARCHAR(20) CHECK (system_impact IN ('low', 'medium', 'high', 'critical')),
  compliance_flags TEXT[], -- Array of compliance flag strings
  review_required BOOLEAN DEFAULT false,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  metadata JSONB, -- Additional metadata stored as JSON
  handoff_resolution_time INTEGER, -- Time taken to resolve handoff in minutes (added in migration 007)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit trail table indexes
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_trail_event_type ON audit_trail(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_severity ON audit_trail(severity);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_id ON audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_conversation_id ON audit_trail(conversation_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_session_id ON audit_trail(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_review_required ON audit_trail(review_required);
CREATE INDEX IF NOT EXISTS idx_audit_trail_reviewed_by ON audit_trail(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON audit_trail(created_at);

-- GIN indexes for JSONB columns (for efficient JSON queries)
CREATE INDEX IF NOT EXISTS idx_audit_trail_details ON audit_trail USING GIN(details);
CREATE INDEX IF NOT EXISTS idx_audit_trail_ai_decision ON audit_trail USING GIN(ai_decision);
CREATE INDEX IF NOT EXISTS idx_audit_trail_metadata ON audit_trail USING GIN(metadata);

-- Table and column comments
COMMENT ON TABLE audit_trail IS 'Complete audit log of all AI decisions, bias corrections, handoffs, and user interactions for compliance and governance';
COMMENT ON COLUMN audit_trail.event_type IS 'Event types: intent_classification, bias_detection, bias_correction, fact_check, hallucination_detected, handoff_triggered, handoff_completed, handoff_cancelled, user_message, bot_response, clarification_requested, notification_sent, suggestion_displayed, suggestion_clicked, error_occurred, warning_triggered, config_changed';
COMMENT ON COLUMN audit_trail.severity IS 'Severity level: info, warning, error, critical';
COMMENT ON COLUMN audit_trail.details IS 'Event-specific data stored as JSONB for flexible querying';
COMMENT ON COLUMN audit_trail.ai_decision IS 'AI decision tracking including model, confidence, reasoning, and alternatives';
COMMENT ON COLUMN audit_trail.user_impact IS 'Impact level on user: low, medium, high, critical';
COMMENT ON COLUMN audit_trail.system_impact IS 'Impact level on system: low, medium, high, critical';
COMMENT ON COLUMN audit_trail.compliance_flags IS 'Array of compliance flags for regulatory tracking';
COMMENT ON COLUMN audit_trail.review_required IS 'Whether this event requires manual review';
COMMENT ON COLUMN audit_trail.handoff_resolution_time IS 'Time taken to resolve handoff in minutes (for analytics)';

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Enable RLS
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own audit events, admins can view all
CREATE POLICY audit_trail_select ON audit_trail
  FOR SELECT
  USING (
    user_id = (SELECT id FROM users WHERE email = current_user)::integer OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE email = current_user 
      AND role = 'admin'
    )
  );

-- Policy: Service role can insert audit events
CREATE POLICY audit_trail_insert ON audit_trail
  FOR INSERT
  WITH CHECK (true); -- Service role can insert any audit event

-- Policy: Only admins can update audit events (for review purposes)
CREATE POLICY audit_trail_update ON audit_trail
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE email = current_user 
      AND role = 'admin'
    )
  );

-- Policy: Only admins can delete audit events
CREATE POLICY audit_trail_delete ON audit_trail
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE email = current_user 
      AND role = 'admin'
    )
  );

-- ==============================================================================
-- PERFORMANCE OPTIMIZATION TABLE (if not exists)
-- ==============================================================================
-- This table is referenced by performance-optimization.service.ts

CREATE TABLE IF NOT EXISTS performance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  operation VARCHAR(255) NOT NULL,
  duration INTEGER NOT NULL, -- milliseconds
  success BOOLEAN NOT NULL DEFAULT true,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB,
  cache_hit BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_performance_logs_timestamp ON performance_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_logs_operation ON performance_logs(operation);
CREATE INDEX IF NOT EXISTS idx_performance_logs_user_id ON performance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_logs_success ON performance_logs(success);
CREATE INDEX IF NOT EXISTS idx_performance_logs_cache_hit ON performance_logs(cache_hit);

COMMENT ON TABLE performance_logs IS 'Performance metrics logging for response times, cache hits, and operation tracking';

-- ==============================================================================
-- MONITORED DOCUMENTS TABLES (if not exists)
-- ==============================================================================
-- These tables are referenced by document-monitor.service.ts

CREATE TABLE IF NOT EXISTS monitored_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL,
  title VARCHAR(255) NOT NULL,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('pdf', 'html', 'gdoc', 'markdown')),
  category VARCHAR(100),
  last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  content_hash VARCHAR(64), -- SHA256 hash
  e_tag VARCHAR(255),
  last_modified_header VARCHAR(255),
  check_frequency VARCHAR(20) DEFAULT 'daily' CHECK (check_frequency IN ('hourly', 'daily', 'weekly', 'monthly')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_monitored_documents_url ON monitored_documents(url);
CREATE INDEX IF NOT EXISTS idx_monitored_documents_category ON monitored_documents(category);
CREATE INDEX IF NOT EXISTS idx_monitored_documents_priority ON monitored_documents(priority);
CREATE INDEX IF NOT EXISTS idx_monitored_documents_active ON monitored_documents(active);
CREATE INDEX IF NOT EXISTS idx_monitored_documents_last_checked ON monitored_documents(last_checked);

COMMENT ON TABLE monitored_documents IS 'Documents monitored for changes and automatic re-ingestion';

CREATE TABLE IF NOT EXISTS document_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES monitored_documents(id) ON DELETE CASCADE,
  detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('content_modified', 'metadata_changed', 'url_moved', 'document_deleted')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  previous_hash VARCHAR(64),
  new_hash VARCHAR(64),
  previous_url TEXT,
  new_url TEXT,
  description TEXT NOT NULL,
  reingestion_required BOOLEAN DEFAULT false,
  reingestion_status VARCHAR(20) DEFAULT 'pending' CHECK (reingestion_status IN ('pending', 'in_progress', 'completed', 'failed')),
  notification_sent BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_document_changes_document_id ON document_changes(document_id);
CREATE INDEX IF NOT EXISTS idx_document_changes_detected_at ON document_changes(detected_at);
CREATE INDEX IF NOT EXISTS idx_document_changes_change_type ON document_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_document_changes_severity ON document_changes(severity);
CREATE INDEX IF NOT EXISTS idx_document_changes_reingestion_status ON document_changes(reingestion_status);

COMMENT ON TABLE document_changes IS 'Log of document changes detected by monitoring service';

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES monitored_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changes_summary TEXT,
  vectors_stored BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_version_number ON document_versions(document_id, version_number);

COMMENT ON TABLE document_versions IS 'Version history of monitored documents';

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 008: audit_trail and related tables created successfully!';
  RAISE NOTICE 'Tables created/verified:';
  RAISE NOTICE '  - audit_trail';
  RAISE NOTICE '  - performance_logs';
  RAISE NOTICE '  - monitored_documents';
  RAISE NOTICE '  - document_changes';
  RAISE NOTICE '  - document_versions';
END $$;
