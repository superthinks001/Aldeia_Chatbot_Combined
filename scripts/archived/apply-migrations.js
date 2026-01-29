const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Supabase PostgreSQL connection details (Updated)
// Password special characters properly URL-encoded: !#$Ald3!a!#$ -> %21%23%24Ald3%21a%21%23%24
const connectionString = 'postgresql://postgres:%21%23%24Ald3%21a%21%23%24@db.ldogkuurhpyiiolbovuq.supabase.co:5432/postgres';

async function applyMigrations() {
  const client = new Client({ connectionString });

  console.log('🔌 Connecting to Supabase PostgreSQL...\n');

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Migration 000: Fix users schema
    console.log('📝 Applying Migration 000: Fix users schema...');
    const migration000 = fs.readFileSync(
      path.join(__dirname, 'migrations', '000_fix_users_schema.sql'),
      'utf8'
    );

    await client.query(migration000);
    console.log('✅ Migration 000 applied successfully\n');

    // Migration 004: Add billing and tenancy
    console.log('📝 Applying Migration 004: Add billing and tenancy...');
    const migration004 = fs.readFileSync(
      path.join(__dirname, 'migrations', '004_add_billing_and_tenancy.sql'),
      'utf8'
    );

    await client.query(migration004);
    console.log('✅ Migration 004 applied successfully\n');

    // Verify tables exist
    console.log('🔍 Verifying database schema...\n');

    const tables = [
      'users',
      'sessions',
      'conversations',
      'subscriptions',
      'organizations',
      'usage_quotas',
      'payment_methods',
      'invoices'
    ];

    for (const table of tables) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = $1
        )`,
        [table]
      );

      if (result.rows[0].exists) {
        console.log(`   ✅ ${table} table exists`);
      } else {
        console.log(`   ❌ ${table} table missing`);
      }
    }

    // Verify users table columns
    console.log('\n🔍 Verifying users table columns...\n');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.log('   Users table columns:');
    columnsResult.rows.forEach(row => {
      console.log(`     - ${row.column_name} (${row.data_type})`);
    });

    console.log('\n✅ All migrations applied successfully!');
    console.log('✅ Database schema is ready for Phase 6 testing\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Connection closed');
  }
}

applyMigrations();
