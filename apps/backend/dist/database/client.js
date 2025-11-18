"use strict";
/**
 * Database Client
 *
 * Provides high-level database operations for the application
 * PostgreSQL-based implementation
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
function initDb() {
    return __awaiter(this, void 0, void 0, function* () {
        // PostgreSQL schema should be created via migrations
        // This is a safety check to ensure basic tables exist
        yield (0, connection_1.execute)(`
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
        yield (0, connection_1.execute)(`
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
    });
}
/**
 * Add or update a user
 */
function addOrUpdateUser(profile) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!profile.email) {
            throw new Error('Email required for user record');
        }
        // Check if user exists
        const existingUser = yield (0, connection_1.queryOne)('SELECT id FROM users WHERE email = $1', [profile.email]);
        if (existingUser) {
            // Update existing user
            yield (0, connection_1.execute)('UPDATE users SET name = $1, county = $2, language = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4', [profile.name, profile.county, profile.language, existingUser.id]);
            return existingUser.id;
        }
        else {
            // Insert new user
            const result = yield (0, connection_1.queryOne)('INSERT INTO users (name, county, email, language) VALUES ($1, $2, $3, $4) RETURNING id', [profile.name, profile.county, profile.email, profile.language]);
            return result.id;
        }
    });
}
/**
 * Log an analytics event
 */
function logAnalytics(event) {
    return __awaiter(this, void 0, void 0, function* () {
        const metaValue = event.meta ? JSON.stringify(event.meta) : null;
        yield (0, connection_1.execute)('INSERT INTO analytics (user_id, conversation_id, event_type, message, meta) VALUES ($1, $2, $3, $4, $5::jsonb)', [
            event.user_id || null,
            event.conversation_id || null,
            event.event_type,
            event.message || null,
            metaValue
        ]);
    });
}
/**
 * Get analytics summary grouped by event type
 */
function getAnalyticsSummary() {
    return __awaiter(this, void 0, void 0, function* () {
        return yield (0, connection_1.query)('SELECT event_type, COUNT(*) as count FROM analytics GROUP BY event_type');
    });
}
/**
 * Get all users
 */
function getUsers() {
    return __awaiter(this, void 0, void 0, function* () {
        return yield (0, connection_1.query)('SELECT * FROM users ORDER BY created_at DESC');
    });
}
/**
 * Get user by ID
 */
function getUserById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield (0, connection_1.queryOne)('SELECT * FROM users WHERE id = $1', [id]);
    });
}
/**
 * Get user by email
 */
function getUserByEmail(email) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield (0, connection_1.queryOne)('SELECT * FROM users WHERE email = $1', [email]);
    });
}
/**
 * Get analytics by user ID
 */
function getAnalyticsByUser(userId_1) {
    return __awaiter(this, arguments, void 0, function* (userId, limit = 100) {
        return yield (0, connection_1.query)('SELECT * FROM analytics WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2', [userId, limit]);
    });
}
/**
 * Get analytics by conversation ID
 */
function getAnalyticsByConversation(conversationId_1) {
    return __awaiter(this, arguments, void 0, function* (conversationId, limit = 100) {
        return yield (0, connection_1.query)('SELECT * FROM analytics WHERE conversation_id = $1 ORDER BY timestamp ASC LIMIT $2', [conversationId, limit]);
    });
}
/**
 * Delete user by ID
 */
function deleteUser(id) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, connection_1.execute)('DELETE FROM users WHERE id = $1', [id]);
    });
}
/**
 * Update user by ID
 */
function updateUser(id, updates) {
    return __awaiter(this, void 0, void 0, function* () {
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
        yield (0, connection_1.execute)(sql, values);
    });
}
/**
 * Get recent analytics (last N records)
 */
function getRecentAnalytics() {
    return __awaiter(this, arguments, void 0, function* (limit = 50) {
        return yield (0, connection_1.query)('SELECT * FROM analytics ORDER BY timestamp DESC LIMIT $1', [limit]);
    });
}
/**
 * Count analytics by event type within a date range
 */
function countAnalyticsByType(eventType, startDate, endDate) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const result = yield (0, connection_1.queryOne)(sql, params);
        return (result === null || result === void 0 ? void 0 : result.count) || 0;
    });
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
