/**
 * Database Client
 *
 * Provides high-level database operations for the application
 * PostgreSQL-based implementation
 */

import { query, queryOne, execute, withTransaction } from './connection';

/**
 * Initialize database schema
 * Creates tables if they don't exist
 */
export async function initDb(): Promise<void> {
  // PostgreSQL schema should be created via migrations
  // This is a safety check to ensure basic tables exist
  await execute(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      county VARCHAR(100),
      email VARCHAR(255) UNIQUE NOT NULL,
      language VARCHAR(10) DEFAULT 'en',
      password_hash VARCHAR(255),
      role VARCHAR(50) DEFAULT 'user',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS analytics (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      conversation_id UUID,
      event_type VARCHAR(50) NOT NULL,
      message TEXT,
      meta JSONB,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ PostgreSQL schema initialized');
}

/**
 * Add or update a user
 */
export async function addOrUpdateUser(profile: {
  name?: string;
  county?: string;
  email?: string;
  language?: string;
}): Promise<number> {
  if (!profile.email) {
    throw new Error('Email required for user record');
  }

  // Check if user exists
  const existingUser = await queryOne<{ id: number }>(
    'SELECT id FROM users WHERE email = $1',
    [profile.email]
  );

  if (existingUser) {
    // Update existing user
    await execute(
      'UPDATE users SET name = $1, county = $2, language = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
      [profile.name, profile.county, profile.language, existingUser.id]
    );
    return existingUser.id;
  } else {
    // Insert new user
    const result = await queryOne<{ id: number }>(
      'INSERT INTO users (name, county, email, language) VALUES ($1, $2, $3, $4) RETURNING id',
      [profile.name, profile.county, profile.email, profile.language]
    );
    return result!.id;
  }
}

/**
 * Log an analytics event
 */
export async function logAnalytics(event: {
  user_id?: number;
  conversation_id?: string;
  event_type: string;
  message?: string;
  meta?: any;
}): Promise<void> {
  const metaValue = event.meta ? JSON.stringify(event.meta) : null;

  await execute(
    'INSERT INTO analytics (user_id, conversation_id, event_type, message, meta) VALUES ($1, $2, $3, $4, $5::jsonb)',
    [
      event.user_id || null,
      event.conversation_id || null,
      event.event_type,
      event.message || null,
      metaValue
    ]
  );
}

/**
 * Get analytics summary grouped by event type
 */
export async function getAnalyticsSummary(): Promise<
  Array<{ event_type: string; count: number }>
> {
  return await query(
    'SELECT event_type, COUNT(*) as count FROM analytics GROUP BY event_type'
  );
}

/**
 * Get all users
 */
export async function getUsers(): Promise<any[]> {
  return await query('SELECT * FROM users ORDER BY created_at DESC');
}

/**
 * Get user by ID
 */
export async function getUserById(id: number): Promise<any | null> {
  return await queryOne('SELECT * FROM users WHERE id = $1', [id]);
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<any | null> {
  return await queryOne('SELECT * FROM users WHERE email = $1', [email]);
}

/**
 * Get analytics by user ID
 */
export async function getAnalyticsByUser(
  userId: number,
  limit: number = 100
): Promise<any[]> {
  return await query(
    'SELECT * FROM analytics WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2',
    [userId, limit]
  );
}

/**
 * Get analytics by conversation ID
 */
export async function getAnalyticsByConversation(
  conversationId: string,
  limit: number = 100
): Promise<any[]> {
  return await query(
    'SELECT * FROM analytics WHERE conversation_id = $1 ORDER BY timestamp ASC LIMIT $2',
    [conversationId, limit]
  );
}

/**
 * Delete user by ID
 */
export async function deleteUser(id: number): Promise<void> {
  await execute('DELETE FROM users WHERE id = $1', [id]);
}

/**
 * Update user by ID
 */
export async function updateUser(
  id: number,
  updates: {
    name?: string;
    county?: string;
    email?: string;
    language?: string;
  }
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.county !== undefined) {
    fields.push(`county = $${paramIndex++}`);
    values.push(updates.county);
  }
  if (updates.email !== undefined) {
    fields.push(`email = $${paramIndex++}`);
    values.push(updates.email);
  }
  if (updates.language !== undefined) {
    fields.push(`language = $${paramIndex++}`);
    values.push(updates.language);
  }

  if (fields.length === 0) {
    return; // Nothing to update
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}`;
  await execute(sql, values);
}

/**
 * Get recent analytics (last N records)
 */
export async function getRecentAnalytics(limit: number = 50): Promise<any[]> {
  return await query(
    'SELECT * FROM analytics ORDER BY timestamp DESC LIMIT $1',
    [limit]
  );
}

/**
 * Count analytics by event type within a date range
 */
export async function countAnalyticsByType(
  eventType: string,
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  let sql = 'SELECT COUNT(*) as count FROM analytics WHERE event_type = $1';
  const params: any[] = [eventType];

  if (startDate) {
    sql += ' AND timestamp >= $2';
    params.push(startDate.toISOString());
  }

  if (endDate) {
    sql += ` AND timestamp <= $${params.length + 1}`;
    params.push(endDate.toISOString());
  }

  const result = await queryOne<{ count: number }>(sql, params);
  return result?.count || 0;
}

// Re-export connection utilities for advanced usage
export { query, queryOne, execute, withTransaction } from './connection';
export { isPostgres, getDatabaseType } from './config';
