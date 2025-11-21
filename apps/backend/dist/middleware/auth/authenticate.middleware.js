"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthenticate = exports.authenticate = void 0;
const auth_service_1 = require("../../services/auth/auth.service");
// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
/**
 * Middleware to authenticate requests using JWT access tokens
 * Extracts token from Authorization header and verifies it
 * Adds user payload to request object if valid
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from Authorization header (Bearer TOKEN)
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Access token required'
            });
            return;
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        // Verify token
        const payload = await auth_service_1.AuthService.verifyAccessToken(token);
        if (!payload) {
            res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
            return;
        }
        // Attach user to request
        req.user = payload;
        next();
    }
    catch (error) {
        res.status(401).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};
exports.authenticate = authenticate;
/**
 * Optional authentication middleware
 * Adds user to request if token is valid, but doesn't block if invalid
 */
const optionalAuthenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = await auth_service_1.AuthService.verifyAccessToken(token);
            if (payload) {
                req.user = payload;
            }
        }
        next();
    }
    catch (error) {
        // Silently continue without authentication
        next();
    }
};
exports.optionalAuthenticate = optionalAuthenticate;
exports.default = exports.authenticate;
