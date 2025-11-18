"use strict";
/**
 * Database Connection Manager
 *
 * Handles connection pooling for PostgreSQL database connections
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
function initConnection() {
    return __awaiter(this, void 0, void 0, function* () {
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
                const client = yield pgPool.connect();
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
    });
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
function query(text_1) {
    return __awaiter(this, arguments, void 0, function* (text, params = []) {
        const result = yield pgPool.query(text, params);
        return result.rows;
    });
}
/**
 * Execute a query and return a single row
 */
function queryOne(text_1) {
    return __awaiter(this, arguments, void 0, function* (text, params = []) {
        const result = yield pgPool.query(text, params);
        return result.rows[0] || null;
    });
}
/**
 * Execute a query that modifies data (INSERT, UPDATE, DELETE)
 */
function execute(text_1) {
    return __awaiter(this, arguments, void 0, function* (text, params = []) {
        const result = yield pgPool.query(text, params);
        return {
            rowCount: result.rowCount || 0
        };
    });
}
/**
 * Begin a transaction
 */
function beginTransaction() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield pgPool.connect();
        yield client.query('BEGIN');
        return client;
    });
}
/**
 * Commit a transaction
 */
function commitTransaction(client) {
    return __awaiter(this, void 0, void 0, function* () {
        yield client.query('COMMIT');
        client.release();
    });
}
/**
 * Rollback a transaction
 */
function rollbackTransaction(client) {
    return __awaiter(this, void 0, void 0, function* () {
        yield client.query('ROLLBACK');
        client.release();
    });
}
/**
 * Execute a function within a transaction
 */
function withTransaction(fn) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield beginTransaction();
        try {
            const result = yield fn(client);
            yield commitTransaction(client);
            return result;
        }
        catch (error) {
            yield rollbackTransaction(client);
            throw error;
        }
    });
}
/**
 * Close database connections
 */
function closeConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        if (pgPool) {
            yield pgPool.end();
            console.log('PostgreSQL pool closed');
            pgPool = null;
        }
    });
}
/**
 * Health check - verify database connection is working
 */
function healthCheck() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield query('SELECT NOW()');
            return true;
        }
        catch (error) {
            console.error('Database health check failed:', error);
            return false;
        }
    });
}
// Initialize connection when module is loaded
initConnection().catch((error) => {
    console.error('Failed to initialize database connection:', error);
    process.exit(1);
});
// Graceful shutdown
process.on('SIGTERM', () => __awaiter(void 0, void 0, void 0, function* () {
    yield closeConnection();
    process.exit(0);
}));
process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
    yield closeConnection();
    process.exit(0);
}));
