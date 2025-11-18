/**
 * Database Configuration
 *
 * Handles configuration for PostgreSQL database
 * Uses environment variables to configure connection
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../../.env.merge') });

export interface DatabaseConfig {
  type: 'postgres';
  postgres: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl: boolean;
    max: number; // Max pool connections
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
}

/**
 * Get database configuration based on environment variables
 */
export function getDatabaseConfig(): DatabaseConfig {
  // Parse PostgreSQL connection string if provided
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  if (databaseUrl) {
    return parsePostgresUrl(databaseUrl);
  }

  // Manual PostgreSQL configuration
  return {
    type: 'postgres',
    postgres: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true',
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10)
    }
  };
}

/**
 * Parse PostgreSQL connection URL
 * Format: postgresql://user:password@host:port/database?options
 */
function parsePostgresUrl(url: string): DatabaseConfig {
  try {
    const parsed = new URL(url);

    return {
      type: 'postgres',
      postgres: {
        host: parsed.hostname,
        port: parseInt(parsed.port || '5432', 10),
        database: parsed.pathname.slice(1) || 'postgres',
        user: parsed.username || 'postgres',
        password: parsed.password || '',
        ssl: parsed.searchParams.get('sslmode') !== 'disable',
        max: parseInt(process.env.DB_POOL_MAX || '20', 10),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10)
      }
    };
  } catch (error) {
    console.error('Error parsing DATABASE_URL:', error);
    throw new Error('Invalid DATABASE_URL format');
  }
}

/**
 * Validate database configuration
 */
export function validateConfig(config: DatabaseConfig): boolean {
  const pg = config.postgres;
  return !!(pg?.host && pg?.port && pg?.database && pg?.user);
}

/**
 * Get current database type
 */
export function getDatabaseType(): 'postgres' {
  return 'postgres';
}

/**
 * Check if using PostgreSQL
 */
export function isPostgres(): boolean {
  return true;
}

export default getDatabaseConfig();
