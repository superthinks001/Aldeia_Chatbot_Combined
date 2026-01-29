# How to Create SQL Migration Files in AWS (Supabase/PostgreSQL)

This guide provides step-by-step instructions for creating and applying SQL migration files in AWS using Supabase (PostgreSQL).

---

## 📋 Overview

Migration files are located in the `/migrations/` directory and follow a numbered naming convention:
- `000_fix_users_schema.sql`
- `001_create_schema.sql`
- `002_migrate_sqlite_data.sql`
- `003_add_conversation_messages.sql`
- `004_add_billing_and_tenancy.sql`
- etc.

---

## 🚀 Step-by-Step Guide

### Step 1: Determine the Next Migration Number

Check existing migrations to determine the next number:

```bash
cd /Users/gverma/Desktop/SuperThinks/Aldeia_chatbot_Combined
ls -la migrations/*.sql | tail -5
```

**Example output:**
```
006_search_path_and_duplicate_policies.sql
005_set_RLS.sql
004_add_billing_and_tenancy.sql
```

**Next migration would be:** `007_your_migration_name.sql`

---

### Step 2: Create the Migration File

Create a new SQL file in the migrations directory:

```bash
cd migrations
touch 007_your_migration_name.sql
```

**Naming Convention:**
- Format: `NNN_descriptive_name.sql`
- Use 3-digit numbers (007, 008, 009, etc.)
- Use lowercase with underscores
- Be descriptive: `007_add_user_preferences.sql` not `007_update.sql`

---

### Step 3: Write the Migration SQL

Open the file in your editor:

```bash
nano 007_your_migration_name.sql
# or
code 007_your_migration_name.sql
```

**Template Structure:**

```sql
-- ============================================
-- Migration: 007_your_migration_name.sql
-- Description: Brief description of what this migration does
-- Date: YYYY-MM-DD
-- Author: Your Name
-- ============================================

-- ============================================
-- SECTION 1: PRE-MIGRATION CHECKS (Optional)
-- ============================================

-- Check if column/table exists before creating
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'new_column'
    ) THEN
        -- Migration code here
    END IF;
END $$;

-- ============================================
-- SECTION 2: CREATE TABLES (if needed)
-- ============================================

CREATE TABLE IF NOT EXISTS your_new_table (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    column_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SECTION 3: ALTER EXISTING TABLES
-- ============================================

-- Add new column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);

-- Modify existing column
ALTER TABLE users 
ALTER COLUMN email TYPE VARCHAR(320);

-- Add constraint
ALTER TABLE users 
ADD CONSTRAINT unique_email UNIQUE (email);

-- ============================================
-- SECTION 4: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ============================================
-- SECTION 5: CREATE FUNCTIONS/TRIGGERS (if needed)
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SECTION 6: DATA MIGRATIONS (if needed)
-- ============================================

-- Update existing data
UPDATE users 
SET new_column = 'default_value' 
WHERE new_column IS NULL;

-- Insert default data
INSERT INTO your_table (column1, column2)
VALUES ('value1', 'value2')
ON CONFLICT DO NOTHING;

-- ============================================
-- SECTION 7: GRANT PERMISSIONS (if needed)
-- ============================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON your_table TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE your_table_id_seq TO authenticated;

-- ============================================
-- SECTION 8: VERIFICATION (Optional)
-- ============================================

-- Verify migration completed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'your_new_table'
    ) THEN
        RAISE EXCEPTION 'Migration failed: table not created';
    END IF;
END $$;

-- ============================================
-- ROLLBACK SECTION (Optional - for documentation)
-- ============================================

-- To rollback this migration, run:
-- DROP TABLE IF EXISTS your_new_table;
-- ALTER TABLE users DROP COLUMN IF EXISTS new_column;
-- DROP INDEX IF EXISTS idx_users_email;
```

---

### Step 4: Test the Migration Locally (Recommended)

Before applying to AWS, test locally:

#### Option A: Using psql (if you have local PostgreSQL)

```bash
# Load environment variables
export DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Test the migration
psql $DATABASE_URL -f migrations/007_your_migration_name.sql
```

#### Option B: Using Supabase Local Development

If using Supabase CLI:

```bash
supabase db reset
supabase migration new your_migration_name
# Copy your SQL into the generated file
supabase db push
```

---

### Step 5: Apply Migration in AWS (Supabase)

You have **three options** to apply migrations in AWS:

#### **Option 1: Supabase SQL Editor (Recommended for Manual Migrations)**

1. **Log into Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Copy and Paste Migration**
   - Open your migration file: `migrations/007_your_migration_name.sql`
   - Copy the entire contents
   - Paste into the SQL Editor

4. **Run the Migration**
   - Click **Run** button (or press Cmd/Ctrl + Enter)
   - Wait for execution to complete
   - Check for success messages or errors

5. **Verify Results**
   - Check the output panel for any errors
   - Use the Table Editor to verify changes
   - Run verification queries if included in migration

#### **Option 2: Using psql from EC2 Instance**

If you have SSH access to your EC2 instance:

```bash
# SSH into EC2
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip

# Install psql if not already installed
sudo apt-get update
sudo apt-get install postgresql-client

# Connect to Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  -f /path/to/migrations/007_your_migration_name.sql
```

**Get connection string from Supabase:**
- Go to **Settings** → **Database**
- Copy the **Connection string** (URI format)
- Replace `[YOUR-PASSWORD]` with your database password

#### **Option 3: Using Node.js Migration Script**

Create a script to run migrations programmatically:

```bash
# From project root
cd apps/backend
npm run db:migrate:supabase
```

Or create a custom script:

```javascript
// run-migration.js
require('dotenv').config({ path: '../../.env.merge' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration(migrationFile) {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../migrations', migrationFile),
    'utf8'
  );
  
  try {
    await pool.query(sql);
    console.log(`✅ Migration ${migrationFile} completed successfully`);
  } catch (error) {
    console.error(`❌ Migration ${migrationFile} failed:`, error.message);
    throw error;
  }
}

// Run specific migration
runMigration('007_your_migration_name.sql')
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
```

Run it:
```bash
node run-migration.js
```

---

### Step 6: Track Migration in Database (Optional)

To track which migrations have been applied, create a migrations table:

```sql
-- Create migrations tracking table (run once)
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- After running a migration, record it
INSERT INTO schema_migrations (version, name)
VALUES ('007', 'your_migration_name')
ON CONFLICT (version) DO NOTHING;
```

---

### Step 7: Verify Migration Success

After applying the migration, verify it worked:

```sql
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'your_new_table';

-- Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'new_column';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users';

-- Check data
SELECT COUNT(*) FROM your_new_table;
```

---

## 📝 Best Practices

### 1. **Idempotency**
Always make migrations idempotent (safe to run multiple times):

```sql
-- ✅ Good: Uses IF NOT EXISTS
CREATE TABLE IF NOT EXISTS users (...);
ALTER TABLE users ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);

-- ❌ Bad: Will fail if run twice
CREATE TABLE users (...);
ALTER TABLE users ADD COLUMN new_column VARCHAR(255);
```

### 2. **Transaction Safety**
Wrap migrations in transactions when possible:

```sql
BEGIN;

-- Your migration code here

COMMIT;
-- Or ROLLBACK; if something goes wrong
```

### 3. **Backward Compatibility**
Consider backward compatibility:

```sql
-- Add column as nullable first
ALTER TABLE users ADD COLUMN new_column VARCHAR(255);

-- Migrate data
UPDATE users SET new_column = 'default' WHERE new_column IS NULL;

-- Then make it NOT NULL if needed
ALTER TABLE users ALTER COLUMN new_column SET NOT NULL;
```

### 4. **Documentation**
Always include:
- Migration number and name
- Description of what it does
- Date created
- Author name
- Rollback instructions (if applicable)

### 5. **Testing**
- Test migrations on a development/staging database first
- Test rollback procedures
- Verify data integrity after migration

---

## 🔄 Rollback Procedures

### Create Rollback Migration

For complex migrations, create a rollback file:

```bash
touch migrations/007_your_migration_name_rollback.sql
```

**Rollback SQL Example:**

```sql
-- Rollback for 007_your_migration_name.sql

-- Drop table
DROP TABLE IF EXISTS your_new_table;

-- Remove column
ALTER TABLE users DROP COLUMN IF EXISTS new_column;

-- Drop index
DROP INDEX IF EXISTS idx_users_email;

-- Drop function/trigger
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at_column();
```

---

## 🚨 Common Issues and Solutions

### Issue 1: Migration Fails with "Already Exists"

**Solution:** Use `IF NOT EXISTS` clauses:

```sql
CREATE TABLE IF NOT EXISTS ...
CREATE INDEX IF NOT EXISTS ...
ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
```

### Issue 2: Foreign Key Constraint Violations

**Solution:** Check dependencies and order:

```sql
-- Drop foreign key first
ALTER TABLE child_table DROP CONSTRAINT IF EXISTS fk_parent;

-- Make changes
ALTER TABLE parent_table ...

-- Re-add foreign key
ALTER TABLE child_table 
ADD CONSTRAINT fk_parent 
FOREIGN KEY (parent_id) REFERENCES parent_table(id);
```

### Issue 3: Permission Denied

**Solution:** Grant necessary permissions:

```sql
GRANT ALL ON TABLE your_table TO postgres;
GRANT USAGE, SELECT ON SEQUENCE your_table_id_seq TO postgres;
```

### Issue 4: Timeout on Large Data Migrations

**Solution:** Break into smaller batches:

```sql
-- Process in batches
DO $$
DECLARE
    batch_size INTEGER := 1000;
    offset_val INTEGER := 0;
BEGIN
    LOOP
        UPDATE your_table 
        SET column = 'value'
        WHERE id BETWEEN offset_val AND offset_val + batch_size
          AND column IS NULL;
        
        EXIT WHEN NOT FOUND;
        offset_val := offset_val + batch_size;
        COMMIT;
    END LOOP;
END $$;
```

---

## 📚 Example Migration Files

### Example 1: Adding a New Table

```sql
-- Migration: 007_add_user_preferences.sql
-- Description: Add user preferences table
-- Date: 2025-12-12

CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
ON user_preferences(user_id);

-- Auto-update updated_at
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Example 2: Adding Columns to Existing Table

```sql
-- Migration: 008_add_user_profile_fields.sql
-- Description: Add profile fields to users table
-- Date: 2025-12-12

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(50),
ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10);

CREATE INDEX IF NOT EXISTS idx_users_zip_code ON users(zip_code);
```

### Example 3: Data Migration

```sql
-- Migration: 009_migrate_legacy_data.sql
-- Description: Migrate data from old format to new format
-- Date: 2025-12-12

-- Update existing records
UPDATE users 
SET phone = CONCAT('+1', phone)
WHERE phone IS NOT NULL 
  AND phone NOT LIKE '+1%'
  AND LENGTH(phone) = 10;

-- Set defaults for NULL values
UPDATE users 
SET language = 'en'
WHERE language IS NULL;
```

---

## ✅ Checklist

Before creating a migration:

- [ ] Checked existing migrations for next number
- [ ] Named file with proper format: `NNN_descriptive_name.sql`
- [ ] Added header with description and date
- [ ] Made migration idempotent (IF NOT EXISTS, etc.)
- [ ] Tested locally (if possible)
- [ ] Documented rollback procedure
- [ ] Verified SQL syntax
- [ ] Considered backward compatibility
- [ ] Added appropriate indexes
- [ ] Set up proper foreign keys and constraints

After applying migration:

- [ ] Verified migration ran successfully
- [ ] Checked tables/columns were created/modified
- [ ] Verified data integrity
- [ ] Tested application functionality
- [ ] Documented in migration tracking table (if used)
- [ ] Updated documentation if needed

---

## 🔗 Additional Resources

- [Supabase SQL Editor Guide](https://supabase.com/docs/guides/database/tables)
- [PostgreSQL ALTER TABLE Documentation](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Supabase Migrations Best Practices](https://supabase.com/docs/guides/database/migrations)
- [PostgreSQL Indexes Guide](https://www.postgresql.org/docs/current/indexes.html)

---

**Questions?** Check the main [migrations README.md](./README.md) for more information.

