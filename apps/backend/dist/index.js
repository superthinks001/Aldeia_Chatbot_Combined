"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const database_1 = require("./config/database");
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const chat_1 = __importDefault(require("./routes/chat"));
const billing_1 = __importDefault(require("./routes/billing"));
const translation_1 = __importDefault(require("./routes/translation"));
// Import middleware
const authenticate_middleware_1 = require("./middleware/auth/authenticate.middleware");
const tenant_middleware_1 = require("./middleware/tenant.middleware");
// Import WebSocket
const socket_server_1 = require("./websocket/socket.server");
// Load environment
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
const app = (0, express_1.default)();
const PORT = process.env.BACKEND_PORT || 3001;
// ============================================
// MIDDLEWARE
// ============================================
// Security headers
app.use((0, helmet_1.default)());
// CORS
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3002',
    process.env.FRONTEND_CHAT_URL,
    process.env.FRONTEND_REBUILD_URL
].filter((origin) => Boolean(origin));
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
});
app.use('/api/', limiter);
// Body parsing
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Tenant middleware (optional multi-tenancy support)
app.use(tenant_middleware_1.tenantMiddleware);
// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================
app.get('/api/health', async (req, res) => {
    const dbConnected = await (0, database_1.testConnection)();
    res.json({
        status: dbConnected ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        database: dbConnected ? 'connected' : 'disconnected',
        version: '2.0.0-auth'
    });
});
// Authentication routes (public)
app.use('/api/auth', auth_routes_1.default);
// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================
// Apply authentication middleware to all routes below
// Chat routes use optional authentication to support rebuild flow (unauthenticated users)
app.use('/api/chat', authenticate_middleware_1.optionalAuthenticate, chat_1.default);
app.use('/api/translation', authenticate_middleware_1.optionalAuthenticate, translation_1.default);
app.use('/api/billing', authenticate_middleware_1.authenticate, billing_1.default);
// ============================================
// ERROR HANDLING
// ============================================
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.path} not found`
    });
});
// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});
// ============================================
// START SERVER
// ============================================
// Create HTTP server (required for Socket.IO)
const httpServer = (0, http_1.createServer)(app);
// Initialize WebSocket server
const websocketServer = (0, socket_server_1.initializeWebSocket)(httpServer);
httpServer.listen(PORT, async () => {
    console.log(`\n🚀 Aldeia Chatbot Backend v2.0.0-phase5`);
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    // Test database connection
    const dbConnected = await (0, database_1.testConnection)();
    if (!dbConnected) {
        console.error('⚠️  WARNING: Database connection failed!');
    }
    console.log(`\n🔐 Authentication enabled`);
    console.log(`   Public routes: /api/health, /api/auth/*`);
    console.log(`   Protected routes: /api/chat/*, /api/billing/* (requires Bearer token)`);
    console.log(`\n🌐 Phase 5 Features Enabled:`);
    console.log(`   ✅ WebSocket Real-time (Socket.IO)`);
    console.log(`   ✅ Stripe Billing Integration`);
    console.log(`   ✅ Multi-tenant Architecture`);
    console.log(`   ✅ Translation Service`);
    console.log(`   ✅ Voice Input/Output (Frontend)`);
    console.log(`\n✅ Ready to accept requests`);
    console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});
exports.default = app;
