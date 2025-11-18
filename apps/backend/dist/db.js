"use strict";
/**
 * Database Interface
 *
 * Database interface for PostgreSQL
 * Uses async/await functions from './database/client'
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseType = exports.isPostgres = exports.withTransaction = exports.execute = exports.queryOne = exports.query = exports.countAnalyticsByType = exports.getRecentAnalytics = exports.updateUser = exports.deleteUser = exports.getAnalyticsByConversation = exports.getAnalyticsByUser = exports.getUserByEmail = exports.getUserById = exports.getUsers = exports.getAnalyticsSummary = exports.logAnalytics = exports.addOrUpdateUser = exports.initDb = void 0;
// Export the modern async API
var client_1 = require("./database/client");
Object.defineProperty(exports, "initDb", { enumerable: true, get: function () { return client_1.initDb; } });
Object.defineProperty(exports, "addOrUpdateUser", { enumerable: true, get: function () { return client_1.addOrUpdateUser; } });
Object.defineProperty(exports, "logAnalytics", { enumerable: true, get: function () { return client_1.logAnalytics; } });
Object.defineProperty(exports, "getAnalyticsSummary", { enumerable: true, get: function () { return client_1.getAnalyticsSummary; } });
Object.defineProperty(exports, "getUsers", { enumerable: true, get: function () { return client_1.getUsers; } });
Object.defineProperty(exports, "getUserById", { enumerable: true, get: function () { return client_1.getUserById; } });
Object.defineProperty(exports, "getUserByEmail", { enumerable: true, get: function () { return client_1.getUserByEmail; } });
Object.defineProperty(exports, "getAnalyticsByUser", { enumerable: true, get: function () { return client_1.getAnalyticsByUser; } });
Object.defineProperty(exports, "getAnalyticsByConversation", { enumerable: true, get: function () { return client_1.getAnalyticsByConversation; } });
Object.defineProperty(exports, "deleteUser", { enumerable: true, get: function () { return client_1.deleteUser; } });
Object.defineProperty(exports, "updateUser", { enumerable: true, get: function () { return client_1.updateUser; } });
Object.defineProperty(exports, "getRecentAnalytics", { enumerable: true, get: function () { return client_1.getRecentAnalytics; } });
Object.defineProperty(exports, "countAnalyticsByType", { enumerable: true, get: function () { return client_1.countAnalyticsByType; } });
Object.defineProperty(exports, "query", { enumerable: true, get: function () { return client_1.query; } });
Object.defineProperty(exports, "queryOne", { enumerable: true, get: function () { return client_1.queryOne; } });
Object.defineProperty(exports, "execute", { enumerable: true, get: function () { return client_1.execute; } });
Object.defineProperty(exports, "withTransaction", { enumerable: true, get: function () { return client_1.withTransaction; } });
Object.defineProperty(exports, "isPostgres", { enumerable: true, get: function () { return client_1.isPostgres; } });
Object.defineProperty(exports, "getDatabaseType", { enumerable: true, get: function () { return client_1.getDatabaseType; } });
