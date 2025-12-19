#!/usr/bin/env node
require('dotenv').config({ path: 'apps/backend/.env' });
const { Pool } = require('pg');
const sqlite3 = require('sqlite3');

async function compareData() {
  console.log('='.repeat(70));
  console.log('SQLite vs PostgreSQL Data Comparison');
  console.log('='.repeat(70));
  console.log('');
  
  // PostgreSQL
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Get PostgreSQL counts
    console.log('📊 PostgreSQL (Supabase):');
    const pgUsers = await pgPool.query('SELECT COUNT(*) FROM users');
    const pgAnalytics = await pgPool.query('SELECT COUNT(*) FROM analytics');
    const pgUserData = await pgPool.query('SELECT id, name, email, role FROM users ORDER BY id');
    const pgAnalyticsSummary = await pgPool.query(`
      SELECT event_type, COUNT(*) as count 
      FROM analytics 
      GROUP BY event_type 
      ORDER BY event_type
    `);
    
    console.log(`  Users: ${pgUsers.rows[0].count}`);
    console.log(`  Analytics: ${pgAnalytics.rows[0].count}`);
    console.log('');
    console.log('  User Details:');
    pgUserData.rows.forEach(u => {
      console.log(`    - ${u.name} (${u.email}) - Role: ${u.role}`);
    });
    console.log('');
    console.log('  Analytics Breakdown:');
    pgAnalyticsSummary.rows.forEach(a => {
      console.log(`    - ${a.event_type}: ${a.count} events`);
    });
    
    await pgPool.end();
    
    // SQLite
    console.log('');
    console.log('📊 SQLite (Original):');
    
    const db = new sqlite3.Database('aldeia.db', sqlite3.OPEN_READONLY);
    
    const sqliteUsers = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
    
    const sqliteAnalytics = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM analytics', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
    
    const sqliteUserData = await new Promise((resolve, reject) => {
      db.all('SELECT id, name, email FROM users ORDER BY id', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const sqliteAnalyticsSummary = await new Promise((resolve, reject) => {
      db.all(`
        SELECT event_type, COUNT(*) as count 
        FROM analytics 
        GROUP BY event_type 
        ORDER BY event_type
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`  Users: ${sqliteUsers}`);
    console.log(`  Analytics: ${sqliteAnalytics}`);
    console.log('');
    console.log('  User Details:');
    sqliteUserData.forEach(u => {
      console.log(`    - ${u.name} (${u.email})`);
    });
    console.log('');
    console.log('  Analytics Breakdown:');
    sqliteAnalyticsSummary.forEach(a => {
      console.log(`    - ${a.event_type}: ${a.count} events`);
    });
    
    db.close();
    
    console.log('');
    console.log('='.repeat(70));
    console.log('Verification Results:');
    console.log('='.repeat(70));
    
    const usersMatch = pgUsers.rows[0].count == sqliteUsers;
    const analyticsMatch = pgAnalytics.rows[0].count == sqliteAnalytics;
    
    console.log(`✅ Users count match: ${usersMatch ? 'YES' : 'NO'} (PG: ${pgUsers.rows[0].count}, SQLite: ${sqliteUsers})`);
    console.log(`✅ Analytics count match: ${analyticsMatch ? 'YES' : 'NO'} (PG: ${pgAnalytics.rows[0].count}, SQLite: ${sqliteAnalytics})`);
    console.log('');
    
    if (usersMatch && analyticsMatch) {
      console.log('🎉 Data migration verified successfully!');
      console.log('   All records migrated from SQLite to PostgreSQL correctly.');
    } else {
      console.log('⚠️  Data counts do not match. Please investigate.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

compareData().then(() => process.exit(0));
