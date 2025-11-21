"use strict";
/**
 * Database Client
 *
 * Provides high-level database operations for the application
 * PostgreSQL-based implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseType = exports.isPostgres = exports.withTransaction = exports.execute = exports.queryOne = exports.query = void 0;
exports.initDb = initDb;
exports.addOrUpdateUser = addOrUpdateUser;
exports.logAnalytics = logAnalytics;
exports.getAnalyticsSummary = getAnalyticsSummary;
exports.getUsers = getUsers;
exports.getUserById = getUserById;
exports.getUserByEmail = getUserByEmail;
exports.getAnalyticsByUser = getAnalyticsByUser;
exports.getAnalyticsByConversation = getAnalyticsByConversation;
exports.deleteUser = deleteUser;
exports.updateUser = updateUser;
exports.getRecentAnalytics = getRecentAnalytics;
exports.countAnalyticsByType = countAnalyticsByType;
const connection_1 = require("./connection");
/**
 * Initialize database schema
 * Creates tables if they don't exist
 */
async function initDb() {
    // PostgreSQL schema should be created via migrations
    // This is a safety check to ensure basic tables exist
    await (0, connection_1.execute)(`
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
    await (0, connection_1.execute)(`
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
async function addOrUpdateUser(profile) {
    if (!profile.email) {
        throw new Error('Email required for user record');
    }
    // Check if user exists
    const existingUser = await (0, connection_1.queryOne)('SELECT id FROM users WHERE email = $1', [profile.email]);
    if (existingUser) {
        // Update existing user
        await (0, connection_1.execute)('UPDATE users SET name = $1, county = $2, language = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4', [profile.name, profile.county, profile.language, existingUser.id]);
        return existingUser.id;
    }
    else {
        // Insert new user
        const result = await (0, connection_1.queryOne)('INSERT INTO users (name, county, email, language) VALUES ($1, $2, $3, $4) RETURNING id', [profile.name, profile.county, profile.email, profile.language]);
        return result.id;
    }
}
/**
 * Log an analytics event
 */
async function logAnalytics(event) {
    const metaValue = event.meta ? JSON.stringify(event.meta) : null;
    await (0, connection_1.execute)('INSERT INTO analytics (user_id, conversation_id, event_type, message, meta) VALUES ($1, $2, $3, $4, $5::jsonb)', [
        event.user_id || null,
        event.conversation_id || null,
        event.event_type,
        event.message || null,
        metaValue
    ]);
}
/**
 * Get analytics summary grouped by event type
 */
async function getAnalyticsSummary() {
    return await (0, connection_1.query)('SELECT event_type, COUNT(*) as count FROM analytics GROUP BY event_type');
}
/**
 * Get all users
 */
async function getUsers() {
    return await (0, connection_1.query)('SELECT * FROM users ORDER BY created_at DESC');
}
/**
 * Get user by ID
 */
async function getUserById(id) {
    return await (0, connection_1.queryOne)('SELECT * FROM users WHERE id = $1', [id]);
}
/**
 * Get user by email
 */
async function getUserByEmail(email) {
    return await (0, connection_1.queryOne)('SELECT * FROM users WHERE email = $1', [email]);
}
/**
 * Get analytics by user ID
 */
async function getAnalyticsByUser(userId, limit = 100) {
    return await (0, connection_1.query)('SELECT * FROM analytics WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2', [userId, limit]);
}
/**
 * Get analytics by conversation ID
 */
async function getAnalyticsByConversation(conversationId, limit = 100) {
    return await (0, connection_1.query)('SELECT * FROM analytics WHERE conversation_id = $1 ORDER BY timestamp ASC LIMIT $2', [conversationId, limit]);
}
/**
 * Delete user by ID
 */
async function deleteUser(id) {
    await (0, connection_1.execute)('DELETE FROM users WHERE id = $1', [id]);
}
/**
 * Update user by ID
 */
async function updateUser(id, updates) {
    const fields = [];
    const values = [];
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
    await (0, connection_1.execute)(sql, values);
}
/**
 * Get recent analytics (last N records)
 */
async function getRecentAnalytics(limit = 50) {
    return await (0, connection_1.query)('SELECT * FROM analytics ORDER BY timestamp DESC LIMIT $1', [limit]);
}
/**
 * Count analytics by event type within a date range
 */
async function countAnalyticsByType(eventType, startDate, endDate) {
    let sql = 'SELECT COUNT(*) as count FROM analytics WHERE event_type = $1';
    const params = [eventType];
    if (startDate) {
        sql += ' AND timestamp >= $2';
        params.push(startDate.toISOString());
    }
    if (endDate) {
        sql += ` AND timestamp <= $${params.length + 1}`;
        params.push(endDate.toISOString());
    }
    const result = await (0, connection_1.queryOne)(sql, params);
    return result?.count || 0;
}
// Re-export connection utilities for advanced usage
var connection_2 = require("./connection");
Object.defineProperty(exports, "query", { enumerable: true, get: function () { return connection_2.query; } });
Object.defineProperty(exports, "queryOne", { enumerable: true, get: function () { return connection_2.queryOne; } });
Object.defineProperty(exports, "execute", { enumerable: true, get: function () { return connection_2.execute; } });
Object.defineProperty(exports, "withTransaction", { enumerable: true, get: function () { return connection_2.withTransaction; } });
var config_1 = require("./config");
Object.defineProperty(exports, "isPostgres", { enumerable: true, get: function () { return config_1.isPostgres; } });
Object.defineProperty(exports, "getDatabaseType", { enumerable: true, get: function () { return config_1.getDatabaseType; } });
