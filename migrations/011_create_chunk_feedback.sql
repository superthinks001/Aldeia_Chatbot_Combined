-- Migration: Create chunk_feedback table for per-chunk feedback weights
-- This enables community learning: feedback on specific document chunks
-- adjusts their ranking in future retrievals.

CREATE TABLE IF NOT EXISTS chunk_feedback (
  id SERIAL PRIMARY KEY,
  chunk_id VARCHAR(255) NOT NULL,
  source VARCHAR(255) NOT NULL,
  chunk_index INTEGER NOT NULL,
  feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('helpful', 'not_helpful', 'flagged')),
  user_id INTEGER REFERENCES users(id),
  conversation_id VARCHAR(255),
  message_text TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chunk_feedback_chunk_id ON chunk_feedback(chunk_id);
CREATE INDEX IF NOT EXISTS idx_chunk_feedback_source ON chunk_feedback(source, chunk_index);
CREATE INDEX IF NOT EXISTS idx_chunk_feedback_created_at ON chunk_feedback(created_at);
