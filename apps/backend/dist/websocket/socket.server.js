"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketServer = void 0;
exports.initializeWebSocket = initializeWebSocket;
exports.getWebSocketServer = getWebSocketServer;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../utils/logger");
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
class WebSocketServer {
    constructor(httpServer) {
        this.connectedUsers = new Map(); // userId -> array of socket IDs
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: ['http://localhost:3000', 'http://localhost:4000', 'http://localhost:8080'],
                methods: ['GET', 'POST'],
                credentials: true,
            },
            pingTimeout: 60000,
            pingInterval: 25000,
        });
        this.setupMiddleware();
        this.setupEventHandlers();
    }
    /**
     * Setup authentication middleware for WebSocket connections
     */
    setupMiddleware() {
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
                if (!token) {
                    return next(new Error('Authentication token required'));
                }
                // Verify JWT token
                const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
                // Attach user info to socket
                socket.userId = parseInt(decoded.userId);
                socket.userEmail = decoded.email;
                logger_1.logger.info(`WebSocket authenticated: User ${socket.userId} (${socket.userEmail})`);
                next();
            }
            catch (error) {
                logger_1.logger.error('WebSocket authentication error:', error);
                next(new Error('Invalid authentication token'));
            }
        });
    }
    /**
     * Setup WebSocket event handlers
     */
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            logger_1.logger.info(`Client connected: ${socket.id} (User: ${socket.userId})`);
            // Track connected users
            this.trackUser(socket);
            // Handle user joining a conversation room
            socket.on('join_conversation', (conversationId) => {
                this.handleJoinConversation(socket, conversationId);
            });
            // Handle user leaving a conversation room
            socket.on('leave_conversation', (conversationId) => {
                this.handleLeaveConversation(socket, conversationId);
            });
            // Handle typing indicator
            socket.on('typing_start', (data) => {
                this.handleTypingStart(socket, data.conversationId);
            });
            socket.on('typing_stop', (data) => {
                this.handleTypingStop(socket, data.conversationId);
            });
            // Handle message acknowledgment
            socket.on('message_read', (data) => {
                this.handleMessageRead(socket, data);
            });
            // Handle disconnection
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });
            // Handle errors
            socket.on('error', (error) => {
                logger_1.logger.error(`Socket error for user ${socket.userId}:`, error);
            });
        });
    }
    /**
     * Track user connection
     */
    trackUser(socket) {
        if (!socket.userId)
            return;
        const existingSockets = this.connectedUsers.get(socket.userId) || [];
        existingSockets.push(socket.id);
        this.connectedUsers.set(socket.userId, existingSockets);
        // Emit user online status to relevant users
        this.io.emit('user_status', {
            userId: socket.userId,
            status: 'online',
        });
    }
    /**
     * Handle user joining a conversation room
     */
    handleJoinConversation(socket, conversationId) {
        socket.conversationId = conversationId;
        socket.join(`conversation:${conversationId}`);
        logger_1.logger.info(`User ${socket.userId} joined conversation ${conversationId}`);
        // Notify other users in the conversation
        socket.to(`conversation:${conversationId}`).emit('user_joined', {
            userId: socket.userId,
            userEmail: socket.userEmail,
            conversationId,
        });
    }
    /**
     * Handle user leaving a conversation room
     */
    handleLeaveConversation(socket, conversationId) {
        socket.leave(`conversation:${conversationId}`);
        logger_1.logger.info(`User ${socket.userId} left conversation ${conversationId}`);
        // Notify other users in the conversation
        socket.to(`conversation:${conversationId}`).emit('user_left', {
            userId: socket.userId,
            conversationId,
        });
    }
    /**
     * Handle typing start indicator
     */
    handleTypingStart(socket, conversationId) {
        socket.to(`conversation:${conversationId}`).emit('user_typing', {
            userId: socket.userId,
            userEmail: socket.userEmail,
            conversationId,
            isTyping: true,
        });
    }
    /**
     * Handle typing stop indicator
     */
    handleTypingStop(socket, conversationId) {
        socket.to(`conversation:${conversationId}`).emit('user_typing', {
            userId: socket.userId,
            userEmail: socket.userEmail,
            conversationId,
            isTyping: false,
        });
    }
    /**
     * Handle message read acknowledgment
     */
    handleMessageRead(socket, data) {
        socket.to(`conversation:${data.conversationId}`).emit('message_read', {
            messageId: data.messageId,
            userId: socket.userId,
            conversationId: data.conversationId,
        });
    }
    /**
     * Handle client disconnection
     */
    handleDisconnect(socket) {
        logger_1.logger.info(`Client disconnected: ${socket.id} (User: ${socket.userId})`);
        if (!socket.userId)
            return;
        // Remove socket from user's connections
        const userSockets = this.connectedUsers.get(socket.userId) || [];
        const updatedSockets = userSockets.filter((id) => id !== socket.id);
        if (updatedSockets.length === 0) {
            // User has no more active connections
            this.connectedUsers.delete(socket.userId);
            // Emit user offline status
            this.io.emit('user_status', {
                userId: socket.userId,
                status: 'offline',
            });
        }
        else {
            this.connectedUsers.set(socket.userId, updatedSockets);
        }
    }
    /**
     * Emit a new message to all users in a conversation
     */
    emitNewMessage(conversationId, message) {
        this.io.to(`conversation:${conversationId}`).emit('new_message', {
            conversationId,
            message,
        });
    }
    /**
     * Emit a conversation update
     */
    emitConversationUpdate(conversationId, update) {
        this.io.to(`conversation:${conversationId}`).emit('conversation_updated', {
            conversationId,
            update,
        });
    }
    /**
     * Send a direct message to a specific user
     */
    sendToUser(userId, event, data) {
        const socketIds = this.connectedUsers.get(userId);
        if (socketIds) {
            socketIds.forEach((socketId) => {
                this.io.to(socketId).emit(event, data);
            });
        }
    }
    /**
     * Broadcast admin message to all connected users
     */
    broadcastAdminMessage(message) {
        this.io.emit('admin_broadcast', {
            message,
            timestamp: new Date(),
        });
    }
    /**
     * Get number of connected users
     */
    getConnectedUsersCount() {
        return this.connectedUsers.size;
    }
    /**
     * Check if a user is online
     */
    isUserOnline(userId) {
        return this.connectedUsers.has(userId);
    }
    /**
     * Get all online users
     */
    getOnlineUsers() {
        return Array.from(this.connectedUsers.keys());
    }
    /**
     * Get the Socket.IO server instance
     */
    getIO() {
        return this.io;
    }
}
exports.WebSocketServer = WebSocketServer;
// Singleton instance
let websocketServer = null;
function initializeWebSocket(httpServer) {
    if (!websocketServer) {
        websocketServer = new WebSocketServer(httpServer);
        logger_1.logger.info('WebSocket server initialized');
    }
    return websocketServer;
}
function getWebSocketServer() {
    return websocketServer;
}
exports.default = { initializeWebSocket, getWebSocketServer, WebSocketServer };
