/**
 * Database Interface
 *
 * Database interface for PostgreSQL
 * Uses async/await functions from './database/client'
 */

// Export the modern async API
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
} from './database/client';
