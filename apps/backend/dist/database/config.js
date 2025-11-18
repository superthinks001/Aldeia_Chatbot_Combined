"use strict";
/**
 * Database Configuration
 *
 * Handles configuration for PostgreSQL database
 * Uses environment variables to configure connection
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseConfig = getDatabaseConfig;
exports.validateConfig = validateConfig;
exports.getDatabaseType = getDatabaseType;
exports.isPostgres = isPostgres;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../../.env') });
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../../../.env.merge') });
/**
 * Get database configuration based on environment variables
 */
function getDatabaseConfig() {
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
function parsePostgresUrl(url) {
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
    }
    catch (error) {
        console.error('Error parsing DATABASE_URL:', error);
        throw new Error('Invalid DATABASE_URL format');
    }
}
/**
 * Validate database configuration
 */
function validateConfig(config) {
    const pg = config.postgres;
    return !!((pg === null || pg === void 0 ? void 0 : pg.host) && (pg === null || pg === void 0 ? void 0 : pg.port) && (pg === null || pg === void 0 ? void 0 : pg.database) && (pg === null || pg === void 0 ? void 0 : pg.user));
}
/**
 * Get current database type
 */
function getDatabaseType() {
    return 'postgres';
}
/**
 * Check if using PostgreSQL
 */
function isPostgres() {
    return true;
}
exports.default = getDatabaseConfig();
