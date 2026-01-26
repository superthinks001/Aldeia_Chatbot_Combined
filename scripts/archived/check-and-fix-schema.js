const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFixSchema() {
  console.log('🔍 Checking current database schema...\n');

  try {
    // Check users table structure
    console.log('1️⃣ Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (usersError) {
      console.log('   ❌ Users table error:', usersError.message);
    } else {
      console.log('   ✅ Users table exists');
      if (users && users.length > 0) {
        console.log('   📋 Columns found:', Object.keys(users[0]).join(', '));
      } else {
        console.log('   📋 Table exists but is empty, trying to query column info...');
      }
    }

    // Check if is_active column exists
    const { data: testUser, error: testError } = await supabase
      .from('users')
      .select('is_active')
      .limit(1);

    if (testError && testError.message.includes('is_active')) {
      console.log('\n❌ ISSUE FOUND: is_active column is missing from users table');
      console.log('   This column should have been created by migration 001_create_schema_simple.sql');
      console.log('\n💡 SOLUTION: Need to add is_active column to users table');

      console.log('\n🔧 Attempting to add is_active column...');

      // Since we can't execute raw SQL directly via Supabase client,
      // we'll need to use the SQL editor in Supabase dashboard
      console.log('\n📝 Please run this SQL in your Supabase SQL Editor:');
      console.log('═'.repeat(60));
      console.log(`
-- Add is_active column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add index for is_active
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'is_active';
      `);
      console.log('═'.repeat(60));
    } else {
      console.log('   ✅ is_active column exists');
    }

    // Check subscriptions table
    console.log('\n2️⃣ Checking subscriptions table...');
    const { data: subs, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .limit(1);

    if (subsError) {
      console.log('   ❌ Subscriptions table does not exist');
      console.log('   This table should be created by migration 004_add_billing_and_tenancy.sql');
    } else {
      console.log('   ✅ Subscriptions table exists');
    }

    // Check organizations table
    console.log('\n3️⃣ Checking organizations table...');
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);

    if (orgsError) {
      console.log('   ❌ Organizations table does not exist');
      console.log('   This table should be created by migration 004_add_billing_and_tenancy.sql');
    } else {
      console.log('   ✅ Organizations table exists');
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📊 Schema Check Complete');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAndFixSchema();
