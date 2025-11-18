/**
 * Database Connection Manager
 *
 * Handles connection pooling for PostgreSQL database connections
 */

import { Pool, PoolClient } from 'pg';
import { getDatabaseConfig } from './config';

// Re-export for convenience
export { isPostgres } from './config';

let pgPool: Pool | null = null;

/**
 * Initialize database connection
 */
export async function initConnection(): Promise<void> {
  const config = getDatabaseConfig();

  if (!pgPool) {
    // Use connection string if DATABASE_URL is available (better handling of special chars)
    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

    if (connectionString) {
      pgPool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: config.postgres.max,
        idleTimeoutMillis: config.postgres.idleTimeoutMillis,
        connectionTimeoutMillis: config.postgres.connectionTimeoutMillis
      });
    } else {
      pgPool = new Pool({
        host: config.postgres.host,
        port: config.postgres.port,
        database: config.postgres.database,
        user: config.postgres.user,
        password: config.postgres.password,
        ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false,
        max: config.postgres.max,
        idleTimeoutMillis: config.postgres.idleTimeoutMillis,
        connectionTimeoutMillis: config.postgres.connectionTimeoutMillis
      });
    }

    // Test connection
    try {
      const client = await pgPool.connect();
      console.log('✅ Connected to PostgreSQL database');
      client.release();
    } catch (error) {
      console.error('❌ Failed to connect to PostgreSQL:', error);
      throw error;
    }

    // Error handling
    pgPool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err);
    });
  }
}

/**
 * Get PostgreSQL pool
 */
export function getPool(): Pool {
  if (!pgPool) {
    throw new Error('PostgreSQL pool not initialized. Call initConnection() first.');
  }
  return pgPool;
}

/**
 * Execute a query
 */
export async function query<T = any>(
  text: string,
  params: any[] = []
): Promise<T[]> {
  const result = await pgPool!.query(text, params);
  return result.rows as T[];
}

/**
 * Execute a query and return a single row
 */
export async function queryOne<T = any>(
  text: string,
  params: any[] = []
): Promise<T | null> {
  const result = await pgPool!.query(text, params);
  return result.rows[0] || null;
}

/**
 * Execute a query that modifies data (INSERT, UPDATE, DELETE)
 */
export async function execute(
  text: string,
  params: any[] = []
): Promise<{ rowCount: number }> {
  const result = await pgPool!.query(text, params);
  return {
    rowCount: result.rowCount || 0
  };
}

/**
 * Begin a transaction
 */
export async function beginTransaction(): Promise<PoolClient> {
  const client = await pgPool!.connect();
  await client.query('BEGIN');
  return client;
}

/**
 * Commit a transaction
 */
export async function commitTransaction(client: PoolClient): Promise<void> {
  await client.query('COMMIT');
  client.release();
}

/**
 * Rollback a transaction
 */
export async function rollbackTransaction(client: PoolClient): Promise<void> {
  await client.query('ROLLBACK');
  client.release();
}

/**
 * Execute a function within a transaction
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await beginTransaction();
  try {
    const result = await fn(client);
    await commitTransaction(client);
    return result;
  } catch (error) {
    await rollbackTransaction(client);
    throw error;
  }
}

/**
 * Close database connections
 */
export async function closeConnection(): Promise<void> {
  if (pgPool) {
    await pgPool.end();
    console.log('PostgreSQL pool closed');
    pgPool = null;
  }
}

/**
 * Health check - verify database connection is working
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT NOW()');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Initialize connection when module is loaded
initConnection().catch((error) => {
  console.error('Failed to initialize database connection:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});
