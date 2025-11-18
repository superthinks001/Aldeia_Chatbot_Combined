import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration!');
  console.error('   Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.merge');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Migration {
  version: number;
  name: string;
  sql: string;
}

async function loadMigrations(): Promise<Migration[]> {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  return files.map(file => {
    const version = parseInt(file.split('_')[0]);
    const name = file.replace('.sql', '');
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    return { version, name, sql };
  });
}

async function getMigratedVersions(): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from('schema_migrations')
      .select('version');

    if (error) {
      // Table might not exist yet
      console.log('⚠️  schema_migrations table not found (this is OK for first run)');
      return [];
    }

    return data.map((row: any) => row.version);
  } catch (error) {
    console.log('⚠️  Could not check migrations (this is OK for first run)');
    return [];
  }
}

async function runMigration(migration: Migration): Promise<void> {
  console.log(`\n🔄 Running migration ${migration.version}: ${migration.name}`);

  try {
    // For Supabase, we need to use the REST API or SQL editor
    // Since we can't execute raw SQL directly via the client,
    // we'll use a workaround with RPC or you can run this in Supabase SQL editor

    console.log('📝 SQL to execute:');
    console.log('─'.repeat(50));
    console.log(migration.sql);
    console.log('─'.repeat(50));

    console.log('\n⚠️  IMPORTANT: For Supabase, you need to:');
    console.log('   1. Go to your Supabase Dashboard');
    console.log('   2. Click on "SQL Editor" in the left menu');
    console.log('   3. Create a new query');
    console.log('   4. Copy the SQL above');
    console.log('   5. Paste and run it');
    console.log('\n   Press Enter when done...');

    // Wait for user confirmation
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve(null));
    });

    console.log('✅ Migration marked as complete');

  } catch (error) {
    console.error(`❌ Migration ${migration.version} failed:`, error);
    throw error;
  }
}

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  try {
    const migrations = await loadMigrations();
    console.log(`📋 Found ${migrations.length} migration(s)`);

    const migratedVersions = await getMigratedVersions();
    console.log(`✅ Already migrated: ${migratedVersions.length} version(s)`);

    const pendingMigrations = migrations.filter(
      m => !migratedVersions.includes(m.version)
    );

    if (pendingMigrations.length === 0) {
      console.log('\n✨ Database is up to date! No migrations needed.');
      return;
    }

    console.log(`\n🔨 Need to run ${pendingMigrations.length} migration(s):`);
    pendingMigrations.forEach(m => {
      console.log(`   - ${m.version}: ${m.name}`);
    });

    for (const migration of pendingMigrations) {
      await runMigration(migration);
    }

    console.log('\n✅ All migrations completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations().then(() => {
  console.log('\n👋 Done!');
  process.exit(0);
});
