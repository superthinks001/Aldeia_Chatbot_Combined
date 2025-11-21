"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_service_1 = require("../services/auth/auth.service");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, county } = req.body;
        // Validation
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and name are required'
            });
        }
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }
        // Password validation (minimum 8 characters)
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long'
            });
        }
        // Register user
        const user = await auth_service_1.AuthService.registerUser(email, password, name, county);
        // Generate tokens for auto-login after registration
        const tokens = {
            accessToken: auth_service_1.AuthService.generateAccessToken(user),
            refreshToken: auth_service_1.AuthService.generateRefreshToken(user)
        };
        // Store refresh token
        await auth_service_1.AuthService.storeRefreshToken(user.id, tokens.refreshToken, req.ip, req.headers['user-agent']);
        logger_1.logger.info(`New user registered: ${user.email}`);
        res.status(201).json({
            success: true,
            data: {
                user,
                tokens
            },
            message: 'User registered successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Registration error:', error);
        // Handle specific errors
        if (error.message.includes('already exists')) {
            return res.status(409).json({
                success: false,
                error: error.message
            });
        }
        res.status(500).json({
            success: false,
            error: 'Registration failed'
        });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        // Authenticate user
        const result = await auth_service_1.AuthService.authenticateUser(email, password);
        if (!result) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }
        logger_1.logger.info(`User logged in: ${result.user.email}`);
        res.json({
            success: true,
            data: result,
            message: 'Login successful'
        });
    }
    catch (error) {
        logger_1.logger.error('Login error:', error);
        // Handle specific errors
        if (error.message.includes('deactivated')) {
            return res.status(403).json({
                success: false,
                error: error.message
            });
        }
        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
});
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token is required'
            });
        }
        const result = await auth_service_1.AuthService.refreshAccessToken(refreshToken);
        if (!result) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired refresh token'
            });
        }
        logger_1.logger.info(`Token refreshed for user: ${result.user.email}`);
        res.json({
            success: true,
            data: result,
            message: 'Token refreshed successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh token'
        });
    }
});
// ====================================================================
// GET USER PROFILE (Protected)
// ====================================================================
router.get('/profile', auth_1.authenticate, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        res.json({
            success: true,
            data: {
                id: req.user.userId,
                email: req.user.email,
                role: req.user.role
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user profile'
        });
    }
});
router.post('/change-password', auth_1.authenticate, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const { currentPassword, newPassword } = req.body;
        // Validation
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current password and new password are required'
            });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 8 characters long'
            });
        }
        // Change password
        const success = await auth_service_1.AuthService.changePassword(req.user.userId, currentPassword, newPassword);
        if (!success) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }
        logger_1.logger.info(`Password changed for user: ${req.user.email}`);
        res.json({
            success: true,
            message: 'Password changed successfully. Please log in again.'
        });
    }
    catch (error) {
        logger_1.logger.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to change password'
        });
    }
});
router.post('/logout', auth_1.authenticate, async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await auth_service_1.AuthService.logout(refreshToken);
        }
        if (req.user) {
            logger_1.logger.info(`User logged out: ${req.user.email}`);
        }
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to logout'
        });
    }
});
// ====================================================================
// LOGOUT ALL SESSIONS (Protected)
// ====================================================================
router.post('/logout-all', auth_1.authenticate, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        await auth_service_1.AuthService.logoutAllSessions(req.user.userId);
        logger_1.logger.info(`All sessions logged out for user: ${req.user.email}`);
        res.json({
            success: true,
            message: 'Logged out from all sessions successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Logout all sessions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to logout from all sessions'
        });
    }
});
// ====================================================================
// VERIFY TOKEN (Utility endpoint for clients)
// ====================================================================
router.get('/verify', auth_1.authenticate, async (req, res) => {
    try {
        // If middleware passes, token is valid
        res.json({
            success: true,
            data: {
                valid: true,
                user: req.user
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Verify token error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify token'
        });
    }
});
exports.default = router;
