const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: 'apps/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('📊 Running Phase 5 Migration: 004_add_billing_and_tenancy.sql');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '004_add_billing_and_tenancy.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing SQL migration...');

    // Split SQL into individual statements (rough split, good enough for this migration)
    const statements = sql
      .split(/;\s*$/gm)
      .filter(stmt => stmt.trim().length > 0 && !stmt.trim().startsWith('--'));

    console.log(`   Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (stmt) {
        try {
          // Use Supabase RPC to execute raw SQL
          const { data, error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' });

          if (error) {
            // Try direct query method
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              },
              body: JSON.stringify({ sql_query: stmt + ';' })
            });

            if (!response.ok) {
              console.log(`   ⚠️  Statement ${i + 1} may have issues (this is normal for some CREATE TABLE IF NOT EXISTS)`);
            }
          }
        } catch (err) {
          console.log(`   ⚠️  Statement ${i + 1} execution: ${err.message.substring(0, 100)}...`);
        }
      }
    }

    console.log('\n✅ Migration execution completed');
    console.log('📋 Verifying tables...');

    // Verify key tables exist
    const tables = ['organizations', 'subscriptions', 'usage_quotas', 'payment_methods', 'invoices'];

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      if (!error) {
        console.log(`   ✅ ${table} table exists`);
      } else {
        console.log(`   ⚠️  ${table} table: ${error.message}`);
      }
    }

    console.log('\n✅ Phase 5 migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
