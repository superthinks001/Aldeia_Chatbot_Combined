-- ============================================================================
-- ALDEIA CHATBOT: MANUAL DATABASE MIGRATION
-- ============================================================================
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Select your project: oniivrremprhonwmmbaq
-- 3. Navigate to: SQL Editor (left sidebar)
-- 4. Create a "New Query"
-- 5. Copy and paste this ENTIRE file into the query editor
-- 6. Click "Run" or press Cmd+Enter (Mac) / Ctrl+Enter (Windows)
-- 7. Wait for completion (should take 10-30 seconds)
-- 8. Verify success by checking the "Tables" section in the Table Editor
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PART 1: FIX USERS TABLE (Add Missing Columns)
-- ============================================================================

-- Add password_hash column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
        RAISE NOTICE 'Added password_hash column to users table';
    ELSE
        RAISE NOTICE 'password_hash column already exists';
    END IF;
END $$;

-- Add role column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        RAISE NOTICE 'Added role column to users table';
    ELSE
        RAISE NOTICE 'role column already exists';
    END IF;
END $$;

-- Add is_active column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
        CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
        RAISE NOTICE 'Added is_active column to users table';
    ELSE
        RAISE NOTICE 'is_active column already exists';
    END IF;
END $$;

-- Update existing users to have default values
UPDATE users SET role = 'user' WHERE role IS NULL;
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- ============================================================================
-- PART 2: CREATE MISSING TABLES
-- ============================================================================

-- Sessions table for JWT refresh tokens
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(500) UNIQUE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_conversation_id ON analytics_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);

-- ============================================================================
-- PART 3: PHASE 5 - BILLING AND MULTI-TENANCY TABLES
-- ============================================================================

-- Organizations table (Multi-tenancy)
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  api_key VARCHAR(255) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_api_key ON organizations(api_key);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);

-- Organization members table
CREATE TABLE IF NOT EXISTS organization_members (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);

-- Subscriptions table (Stripe Billing)
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  tier VARCHAR(50) NOT NULL DEFAULT 'free',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);

-- Usage quotas table
CREATE TABLE IF NOT EXISTS usage_quotas (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  messages_used INTEGER DEFAULT 0,
  messages_limit INTEGER NOT NULL,
  voice_requests_used INTEGER DEFAULT 0,
  voice_requests_limit INTEGER DEFAULT -1,
  api_calls_used INTEGER DEFAULT 0,
  api_calls_limit INTEGER DEFAULT -1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_quotas_user_id ON usage_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_quotas_period_start ON usage_quotas(period_start);

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  last4 VARCHAR(4),
  brand VARCHAR(50),
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_payment_method_id ON payment_methods(stripe_payment_method_id);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
  amount_due INTEGER NOT NULL,
  amount_paid INTEGER DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(50) NOT NULL,
  invoice_pdf VARCHAR(500),
  hosted_invoice_url VARCHAR(500),
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ============================================================================
-- PART 4: ADD ORGANIZATION_ID TO EXISTING TABLES
-- ============================================================================

-- Add organization_id to conversations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE conversations ADD COLUMN organization_id INTEGER REFERENCES organizations(id);
        CREATE INDEX idx_conversations_organization_id ON conversations(organization_id);
    END IF;
END $$;

-- Add organization_id to analytics_events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'analytics_events' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE analytics_events ADD COLUMN organization_id INTEGER REFERENCES organizations(id);
        CREATE INDEX idx_analytics_events_organization_id ON analytics_events(organization_id);
    END IF;
END $$;

-- Add stripe_customer_id to users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255) UNIQUE;
        CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);
    END IF;
END $$;

-- ============================================================================
-- PART 5: DATABASE FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_conversations_updated_at') THEN
        CREATE TRIGGER update_conversations_updated_at
        BEFORE UPDATE ON conversations
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organizations_updated_at') THEN
        CREATE TRIGGER update_organizations_updated_at
        BEFORE UPDATE ON organizations
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscriptions_updated_at') THEN
        CREATE TRIGGER update_subscriptions_updated_at
        BEFORE UPDATE ON subscriptions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_usage_quotas_updated_at') THEN
        CREATE TRIGGER update_usage_quotas_updated_at
        BEFORE UPDATE ON usage_quotas
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Function to increment message usage
CREATE OR REPLACE FUNCTION increment_message_usage(
  p_user_id INTEGER,
  p_period_start TIMESTAMP,
  p_period_end TIMESTAMP,
  p_messages_limit INTEGER
)
RETURNS void AS $$
BEGIN
  INSERT INTO usage_quotas (
    user_id,
    period_start,
    period_end,
    messages_used,
    messages_limit
  )
  VALUES (
    p_user_id,
    p_period_start::DATE,
    p_period_end::DATE,
    1,
    p_messages_limit
  )
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET
    messages_used = usage_quotas.messages_used + 1,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can send message
CREATE OR REPLACE FUNCTION can_user_send_message(p_user_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_messages_used INTEGER;
  v_messages_limit INTEGER;
BEGIN
  SELECT messages_used, messages_limit
  INTO v_messages_used, v_messages_limit
  FROM usage_quotas
  WHERE user_id = p_user_id
    AND period_start <= CURRENT_DATE
    AND period_end > CURRENT_DATE;

  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  IF v_messages_limit = -1 THEN
    RETURN TRUE;
  END IF;

  RETURN v_messages_used < v_messages_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 6: SEED DEFAULT DATA
-- ============================================================================

-- Create default subscriptions for existing users
INSERT INTO subscriptions (user_id, tier, status)
SELECT id, 'free', 'active'
FROM users
WHERE id NOT IN (SELECT user_id FROM subscriptions)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅✅✅ MIGRATION COMPLETE ✅✅✅';
    RAISE NOTICE '';
    RAISE NOTICE 'Successfully applied:';
    RAISE NOTICE '  ✅ Fixed users table (added password_hash, role, is_active)';
    RAISE NOTICE '  ✅ Created sessions table';
    RAISE NOTICE '  ✅ Created conversations table';
    RAISE NOTICE '  ✅ Created analytics_events table';
    RAISE NOTICE '  ✅ Created organizations table (multi-tenancy)';
    RAISE NOTICE '  ✅ Created organization_members table';
    RAISE NOTICE '  ✅ Created subscriptions table (billing)';
    RAISE NOTICE '  ✅ Created usage_quotas table';
    RAISE NOTICE '  ✅ Created payment_methods table';
    RAISE NOTICE '  ✅ Created invoices table';
    RAISE NOTICE '  ✅ Added database functions and triggers';
    RAISE NOTICE '  ✅ Seeded default subscriptions';
    RAISE NOTICE '';
    RAISE NOTICE 'Your Aldeia Chatbot database is now ready for Phase 6 testing!';
END $$;
