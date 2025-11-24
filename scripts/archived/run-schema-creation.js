#!/usr/bin/env node
/**
 * Run Schema Creation on Supabase
 */

require('dotenv').config({ path: 'apps/backend/.env' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('Creating PostgreSQL Schema on Supabase');
console.log('='.repeat(60));

async function runSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('\n📋 Reading schema file...');
    const schemaPath = path.join(__dirname, 'migrations', '001_create_schema_simple.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log(`  ✅ Loaded ${schemaPath}`);
    console.log(`  📊 File size: ${(schema.length / 1024).toFixed(2)} KB`);

    console.log('\n🔌 Connecting to database...');
    const client = await pool.connect();
    console.log('  ✅ Connected to PostgreSQL');

    console.log('\n🚀 Executing schema creation...');
    console.log('  (This may take a few moments)');

    await client.query(schema);

    console.log('  ✅ Schema created successfully!');

    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`  ✅ Created ${result.rows.length} tables:`);
    result.rows.forEach(row => {
      console.log(`     - ${row.table_name}`);
    });

    // Verify indexes
    console.log('\n🔍 Verifying indexes...');
    const indexResult = await client.query(`
      SELECT
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    console.log(`  ✅ Created ${indexResult.rows.length} indexes`);

    // Verify triggers
    console.log('\n🔍 Verifying triggers...');
    const triggerResult = await client.query(`
      SELECT
        trigger_name,
        event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name
    `);

    console.log(`  ✅ Created ${triggerResult.rows.length} triggers`);
    triggerResult.rows.forEach(row => {
      console.log(`     - ${row.trigger_name} on ${row.event_object_table}`);
    });

    client.release();
    await pool.end();

    console.log('\n' + '='.repeat(60));
    console.log('✅ Schema Creation Complete!');
    console.log('='.repeat(60));
    console.log('\nDatabase is ready for data migration.');
    console.log('\n📝 Next step:');
    console.log('  node migrations/migrate-from-sqlite.js');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
    await pool.end();
    process.exit(1);
  }
}

runSchema();
