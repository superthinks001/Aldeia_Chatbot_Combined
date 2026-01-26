-- Migration: 007_add_session_tracking_and_demographics.sql
-- Description: Add session tracking and user demographics for advanced analytics
-- Date: January 25, 2026

-- ==============================================================================
-- USER SESSIONS TABLE
-- ==============================================================================
-- Track user sessions for analytics (session duration, messages per session, etc.)

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INTEGER, -- Calculated duration
  message_count INTEGER DEFAULT 0,
  device_type VARCHAR(50), -- mobile, tablet, desktop
  user_agent TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_conversation_id ON user_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON user_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_device_type ON user_sessions(device_type);

COMMENT ON TABLE user_sessions IS 'User session tracking for analytics (duration, message count, device type)';

-- ==============================================================================
-- USER DEMOGRAPHICS TABLE
-- ==============================================================================
-- Store user demographic data for analytics

CREATE TABLE IF NOT EXISTS user_demographics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  age_group VARCHAR(20), -- 18-24, 25-34, 35-44, 45-54, 55-64, 65+
  location VARCHAR(255), -- City/County
  income_level VARCHAR(20), -- low, medium, high
  insurance_status VARCHAR(50), -- insured, uninsured, partial
  device_preference VARCHAR(50), -- mobile, tablet, desktop
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_demographics_user_id ON user_demographics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_demographics_age_group ON user_demographics(age_group);
CREATE INDEX IF NOT EXISTS idx_user_demographics_location ON user_demographics(location);
CREATE INDEX IF NOT EXISTS idx_user_demographics_income_level ON user_demographics(income_level);

COMMENT ON TABLE user_demographics IS 'User demographic data for analytics and bias detection';

-- ==============================================================================
-- USER FEEDBACK TABLE
-- ==============================================================================
-- Store user satisfaction feedback for conversation quality metrics

CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  satisfaction_score INTEGER CHECK (satisfaction_score >= 0 AND satisfaction_score <= 100),
  feedback_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_conversation_id ON user_feedback(conversation_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at);

COMMENT ON TABLE user_feedback IS 'User satisfaction feedback for conversation quality metrics';

-- ==============================================================================
-- HANDOFF RESOLUTION TRACKING
-- ==============================================================================
-- Track handoff resolution times for analytics

ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS handoff_resolution_time INTEGER; -- minutes

COMMENT ON COLUMN audit_trail.handoff_resolution_time IS 'Time taken to resolve handoff in minutes';
