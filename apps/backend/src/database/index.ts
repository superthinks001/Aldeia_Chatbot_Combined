/**
 * Database Module - Main Entry Point
 *
 * This module provides a database interface for PostgreSQL.
 *
 * Usage:
 *   import { initDb, addOrUpdateUser, logAnalytics } from './database';
 *
 * Configuration:
 *   Set DATABASE_URL or SUPABASE_DB_URL for PostgreSQL connection
 */

// Export database client functions
export {
  initDb,
  addOrUpdateUser,
  logAnalytics,
  getAnalyticsSummary,
  getUsers,
  getUserById,
  getUserByEmail,
  getAnalyticsByUser,
  getAnalyticsByConversation,
  deleteUser,
  updateUser,
  getRecentAnalytics,
  countAnalyticsByType,
  query,
  queryOne,
  execute,
  withTransaction,
  isPostgres,
  getDatabaseType
} from './client';

// Export configuration utilities
export {
  getDatabaseConfig,
  validateConfig,
  type DatabaseConfig
} from './config';

// Export connection utilities
export {
  initConnection,
  closeConnection,
  healthCheck
} from './connection';
