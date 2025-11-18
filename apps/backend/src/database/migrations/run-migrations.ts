#!/usr/bin/env ts-node
/**
 * Migration Runner
 *
 * Runs SQL migration files against PostgreSQL database
 *
 * Usage:
 *   ts-node run-migrations.ts
 *   npm run migrate
 */

import fs from 'fs';
import path from 'path';
import { getPool } from '../connection';

const MIGRATIONS_DIR = path.join(__dirname, '../../../..', 'migrations');

interface Migration {
  filename: string;
  sql: string;
}

/**
 * Load migration files from disk
 */
function loadMigrations(): Migration[] {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  return files.map(filename => ({
    filename,
    sql: fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8')
  }));
}

/**
 * Execute a migration on PostgreSQL
 */
async function runPostgresMigration(migration: Migration): Promise<void> {
  const pool = getPool();
  console.log(`\n📝 Running migration: ${migration.filename}`);

  try {
    await pool.query(migration.sql);
    console.log(`✅ ${migration.filename} completed successfully`);
  } catch (error: any) {
    console.error(`❌ ${migration.filename} failed:`, error.message);
    throw error;
  }
}

/**
 * Main migration runner
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Database Migration Runner');
  console.log('='.repeat(60));
  console.log(`Database type: PostgreSQL`);
  console.log(`Migrations directory: ${MIGRATIONS_DIR}`);
  console.log('='.repeat(60));

  try {
    const migrations = loadMigrations();

    if (migrations.length === 0) {
      console.log('⚠️  No migration files found');
      return;
    }

    console.log(`\nFound ${migrations.length} migration(s):`);
    migrations.forEach(m => console.log(`  - ${m.filename}`));

    console.log('\nStarting migrations...');

    for (const migration of migrations) {
      await runPostgresMigration(migration);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All migrations completed successfully!');
    console.log('='.repeat(60));
  } catch (error: any) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Migration failed:', error.message);
    console.error('='.repeat(60));
    process.exit(1);
  }
}

// Run migrations
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { main as runMigrations };
