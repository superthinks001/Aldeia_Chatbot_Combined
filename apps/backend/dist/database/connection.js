"use strict";
/**
 * Database Connection Manager
 *
 * Handles connection pooling for PostgreSQL database connections
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPostgres = void 0;
exports.initConnection = initConnection;
exports.getPool = getPool;
exports.query = query;
exports.queryOne = queryOne;
exports.execute = execute;
exports.beginTransaction = beginTransaction;
exports.commitTransaction = commitTransaction;
exports.rollbackTransaction = rollbackTransaction;
exports.withTransaction = withTransaction;
exports.closeConnection = closeConnection;
exports.healthCheck = healthCheck;
const pg_1 = require("pg");
const config_1 = require("./config");
// Re-export for convenience
var config_2 = require("./config");
Object.defineProperty(exports, "isPostgres", { enumerable: true, get: function () { return config_2.isPostgres; } });
let pgPool = null;
/**
 * Initialize database connection
 */
async function initConnection() {
    const config = (0, config_1.getDatabaseConfig)();
    if (!pgPool) {
        // Use connection string if DATABASE_URL is available (better handling of special chars)
        const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
        if (connectionString) {
            pgPool = new pg_1.Pool({
                connectionString,
                ssl: { rejectUnauthorized: false },
                max: config.postgres.max,
                idleTimeoutMillis: config.postgres.idleTimeoutMillis,
                connectionTimeoutMillis: config.postgres.connectionTimeoutMillis
            });
        }
        else {
            pgPool = new pg_1.Pool({
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
        }
        catch (error) {
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
function getPool() {
    if (!pgPool) {
        throw new Error('PostgreSQL pool not initialized. Call initConnection() first.');
    }
    return pgPool;
}
/**
 * Execute a query
 */
async function query(text, params = []) {
    const result = await pgPool.query(text, params);
    return result.rows;
}
/**
 * Execute a query and return a single row
 */
async function queryOne(text, params = []) {
    const result = await pgPool.query(text, params);
    return result.rows[0] || null;
}
/**
 * Execute a query that modifies data (INSERT, UPDATE, DELETE)
 */
async function execute(text, params = []) {
    const result = await pgPool.query(text, params);
    return {
        rowCount: result.rowCount || 0
    };
}
/**
 * Begin a transaction
 */
async function beginTransaction() {
    const client = await pgPool.connect();
    await client.query('BEGIN');
    return client;
}
/**
 * Commit a transaction
 */
async function commitTransaction(client) {
    await client.query('COMMIT');
    client.release();
}
/**
 * Rollback a transaction
 */
async function rollbackTransaction(client) {
    await client.query('ROLLBACK');
    client.release();
}
/**
 * Execute a function within a transaction
 */
async function withTransaction(fn) {
    const client = await beginTransaction();
    try {
        const result = await fn(client);
        await commitTransaction(client);
        return result;
    }
    catch (error) {
        await rollbackTransaction(client);
        throw error;
    }
}
/**
 * Close database connections
 */
async function closeConnection() {
    if (pgPool) {
        await pgPool.end();
        console.log('PostgreSQL pool closed');
        pgPool = null;
    }
}
/**
 * Health check - verify database connection is working
 */
async function healthCheck() {
    try {
        await query('SELECT NOW()');
        return true;
    }
    catch (error) {
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
