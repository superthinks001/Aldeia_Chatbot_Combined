#!/usr/bin/env node
/**
 * SQLite to PostgreSQL Migration Script
 *
 * Migrates data from SQLite (aldeia.db) to PostgreSQL/Supabase
 *
 * Usage:
 *   node migrate-from-sqlite.js
 *
 * Prerequisites:
 *   - ../apps/backend/.env file configured with DATABASE_URL
 *   - Schema already created (run 001_create_schema.sql first)
 *   - SQLite database exists at ./aldeia.db
 */

const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '../apps/backend/.env' });

// Configuration
const SQLITE_DB_PATH = './aldeia.db';
const DEFAULT_PASSWORD = 'TestPassword123!';  // Default password for migrated users
const BCRYPT_ROUNDS = 10;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// SQLite connection
const db = new sqlite3.Database(SQLITE_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('❌ Error opening SQLite database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

/**
 * Migrate users from SQLite to PostgreSQL
 */
async function migrateUsers() {
  return new Promise((resolve, reject) => {
    console.log('\n📦 Migrating users...');

    db.all('SELECT * FROM users', async (err, rows) => {
      if (err) {
        return reject(err);
      }

      console.log(`Found ${rows.length} users in SQLite`);

      for (const row of rows) {
        try {
          // Hash the default password
          const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

          // Determine role based on name (if name is "Admin", make them admin)
          const role = row.name?.toLowerCase() === 'admin' ? 'admin' : 'user';

          // Insert into PostgreSQL
          const query = `
            INSERT INTO users (id, name, county, email, language, password_hash, role, is_active, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (email) DO UPDATE SET
              name = EXCLUDED.name,
              county = EXCLUDED.county,
              language = EXCLUDED.language,
              role = EXCLUDED.role,
              updated_at = CURRENT_TIMESTAMP
            RETURNING id, email, role
          `;

          const values = [
            row.id,
            row.name,
            row.county,
            row.email,
            row.language || 'en',
            passwordHash,
            role,
            true,  // is_active
            row.created_at
          ];

          const result = await pool.query(query, values);
          console.log(`  ✅ Migrated user: ${result.rows[0].email} (role: ${result.rows[0].role})`);
        } catch (error) {
          console.error(`  ❌ Error migrating user ${row.email}:`, error.message);
        }
      }

      // Reset sequence
      try {
        await pool.query("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users) + 1)");
        console.log('  ✅ Reset users sequence');
      } catch (error) {
        console.warn('  ⚠️  Warning: Could not reset users sequence:', error.message);
      }

      resolve(rows.length);
    });
  });
}

/**
 * Migrate analytics from SQLite to PostgreSQL
 */
async function migrateAnalytics() {
  return new Promise((resolve, reject) => {
    console.log('\n📊 Migrating analytics...');

    db.all('SELECT * FROM analytics ORDER BY id', async (err, rows) => {
      if (err) {
        return reject(err);
      }

      console.log(`Found ${rows.length} analytics records in SQLite`);

      let migrated = 0;
      let skipped = 0;

      for (const row of rows) {
        try {
          const query = `
            INSERT INTO analytics (user_id, conversation_id, event_type, message, meta, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
          `;

          // Parse meta if it's a JSON string
          let meta = null;
          if (row.meta) {
            try {
              meta = typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta;
            } catch (e) {
              console.warn(`  ⚠️  Could not parse meta for analytics ${row.id}, storing as null`);
            }
          }

          const values = [
            row.user_id,
            null,  // conversation_id set to NULL (old data doesn't have valid conversation references)
            row.event_type,
            row.message,
            meta ? JSON.stringify(meta) : null,
            row.timestamp
          ];

          await pool.query(query, values);
          migrated++;
        } catch (error) {
          console.error(`  ❌ Error migrating analytics ${row.id}:`, error.message);
          skipped++;
        }
      }

      console.log(`  ✅ Migrated ${migrated} analytics records (${skipped} skipped)`);
      resolve(migrated);
    });
  });
}

/**
 * Verify migration results
 */
async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');

  try {
    // Count users
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const usersCount = parseInt(usersResult.rows[0].count);
    console.log(`  Users in PostgreSQL: ${usersCount}`);

    // Count analytics
    const analyticsResult = await pool.query('SELECT COUNT(*) as count FROM analytics');
    const analyticsCount = parseInt(analyticsResult.rows[0].count);
    console.log(`  Analytics in PostgreSQL: ${analyticsCount}`);

    // Get analytics by event type
    const eventTypesResult = await pool.query(`
      SELECT event_type, COUNT(*) as count
      FROM analytics
      GROUP BY event_type
      ORDER BY count DESC
    `);

    console.log('\n  Analytics by event type:');
    eventTypesResult.rows.forEach(row => {
      console.log(`    - ${row.event_type}: ${row.count}`);
    });

    // List migrated users
    const usersListResult = await pool.query(`
      SELECT id, name, email, role, created_at
      FROM users
      ORDER BY id
    `);

    console.log('\n  Migrated users:');
    usersListResult.rows.forEach(row => {
      console.log(`    - ${row.name} (${row.email}) - Role: ${row.role}`);
      console.log(`      Default password: ${DEFAULT_PASSWORD}`);
    });

    return {
      usersCount,
      analyticsCount,
      success: usersCount > 0 && analyticsCount > 0
    };
  } catch (error) {
    console.error('  ❌ Verification error:', error.message);
    return { success: false };
  }
}

/**
 * Main migration function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('SQLite to PostgreSQL Migration');
  console.log('='.repeat(60));
  console.log(`SQLite database: ${SQLITE_DB_PATH}`);
  console.log(`PostgreSQL: ${process.env.DATABASE_URL?.split('@')[1] || 'configured'}`);
  console.log('='.repeat(60));

  try {
    // Test PostgreSQL connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL');

    // Run migrations
    const usersCount = await migrateUsers();
    const analyticsCount = await migrateAnalytics();

    // Verify
    const verification = await verifyMigration();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Migration Summary');
    console.log('='.repeat(60));
    console.log(`Users migrated: ${usersCount}`);
    console.log(`Analytics migrated: ${analyticsCount}`);
    console.log(`Status: ${verification.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log('='.repeat(60));

    if (verification.success) {
      console.log('\n✅ Migration completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('  1. Test user login with credentials:');
      console.log(`     Email: test@test.com`);
      console.log(`     Password: ${DEFAULT_PASSWORD}`);
      console.log('  2. Update .env to set USE_SQLITE=false');
      console.log('  3. Test backend with PostgreSQL');
      console.log('  4. Archive SQLite database files\n');
    } else {
      console.error('\n❌ Migration completed with errors. Please review the logs above.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close connections
    db.close();
    await pool.end();
  }
}

// Run migration
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { migrateUsers, migrateAnalytics, verifyMigration };
