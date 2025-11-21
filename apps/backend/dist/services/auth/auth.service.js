"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../../config/database");
const auth_types_1 = require("../../types/auth.types");
class AuthService {
    // ============================================
    // USER REGISTRATION
    // ============================================
    static async registerUser(email, password, name, county) {
        try {
            // Check if user already exists
            const { data: existingUser } = await database_1.supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .single();
            if (existingUser) {
                throw new Error('User with this email already exists');
            }
            // Hash password
            const passwordHash = await bcryptjs_1.default.hash(password, 12);
            // Create user in database
            const { data: user, error } = await database_1.supabase
                .from('users')
                .insert({
                email,
                password_hash: passwordHash,
                name,
                county: county || null,
                role: auth_types_1.UserRole.USER,
                is_active: true
            })
                .select()
                .single();
            if (error) {
                console.error('Registration error:', error);
                throw new Error('Failed to create user');
            }
            return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                created_at: user.created_at
            };
        }
        catch (error) {
            throw new Error(error.message || 'Registration failed');
        }
    }
    // ============================================
    // USER AUTHENTICATION
    // ============================================
    static async authenticateUser(email, password) {
        try {
            // Get user from database
            const { data: user, error } = await database_1.supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();
            if (error || !user) {
                return null;
            }
            // Check if user is active
            if (!user.is_active) {
                throw new Error('Account is deactivated');
            }
            // Verify password
            const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
            if (!isValidPassword) {
                return null;
            }
            // Generate tokens
            const accessToken = this.generateAccessToken(user);
            const refreshToken = this.generateRefreshToken(user);
            // Store refresh token in database
            await this.storeRefreshToken(user.id, refreshToken);
            // Update last login
            await database_1.supabase
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', user.id);
            return {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    created_at: user.created_at
                },
                tokens: {
                    accessToken,
                    refreshToken
                }
            };
        }
        catch (error) {
            throw new Error(error.message || 'Authentication failed');
        }
    }
    // ============================================
    // TOKEN GENERATION
    // ============================================
    static generateAccessToken(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role
        };
        return jsonwebtoken_1.default.sign(payload, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRATION });
    }
    static generateRefreshToken(user) {
        return jsonwebtoken_1.default.sign({ userId: user.id }, this.JWT_REFRESH_SECRET, { expiresIn: this.JWT_REFRESH_EXPIRATION });
    }
    // ============================================
    // TOKEN VERIFICATION
    // ============================================
    static async verifyAccessToken(token) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, this.JWT_SECRET);
            return payload;
        }
        catch (error) {
            return null;
        }
    }
    static async verifyRefreshToken(token) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, this.JWT_REFRESH_SECRET);
            return payload;
        }
        catch (error) {
            return null;
        }
    }
    // ============================================
    // REFRESH TOKEN MANAGEMENT
    // ============================================
    static async storeRefreshToken(userId, token, ipAddress, userAgent) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now
        await database_1.supabase.from('sessions').insert({
            user_id: userId,
            refresh_token: token,
            expires_at: expiresAt.toISOString(),
            ip_address: ipAddress,
            user_agent: userAgent
        });
    }
    static async refreshAccessToken(refreshToken) {
        try {
            // Verify refresh token
            const payload = await this.verifyRefreshToken(refreshToken);
            if (!payload) {
                return null;
            }
            // Check if refresh token exists and is active
            const { data: session } = await database_1.supabase
                .from('sessions')
                .select('*')
                .eq('refresh_token', refreshToken)
                .single();
            if (!session) {
                return null;
            }
            // Check if token expired
            if (new Date(session.expires_at) < new Date()) {
                await this.invalidateRefreshToken(refreshToken);
                return null;
            }
            // Get user
            const { data: user, error } = await database_1.supabase
                .from('users')
                .select('*')
                .eq('id', payload.userId)
                .single();
            if (error || !user || !user.is_active) {
                return null;
            }
            // Generate new tokens
            const newAccessToken = this.generateAccessToken(user);
            const newRefreshToken = this.generateRefreshToken(user);
            // Invalidate old refresh token
            await this.invalidateRefreshToken(refreshToken);
            // Store new refresh token
            await this.storeRefreshToken(user.id, newRefreshToken);
            return {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    created_at: user.created_at
                },
                tokens: {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken
                }
            };
        }
        catch (error) {
            return null;
        }
    }
    static async invalidateRefreshToken(token) {
        await database_1.supabase
            .from('sessions')
            .delete()
            .eq('refresh_token', token);
    }
    // ============================================
    // LOGOUT
    // ============================================
    static async logout(refreshToken) {
        await this.invalidateRefreshToken(refreshToken);
    }
    static async logoutAllSessions(userId) {
        await database_1.supabase
            .from('sessions')
            .delete()
            .eq('user_id', userId);
    }
    // ============================================
    // PASSWORD MANAGEMENT
    // ============================================
    static async changePassword(userId, currentPassword, newPassword) {
        try {
            // Get user
            const { data: user } = await database_1.supabase
                .from('users')
                .select('password_hash')
                .eq('id', userId)
                .single();
            if (!user) {
                return false;
            }
            // Verify current password
            const isValid = await bcryptjs_1.default.compare(currentPassword, user.password_hash);
            if (!isValid) {
                return false;
            }
            // Hash new password
            const newPasswordHash = await bcryptjs_1.default.hash(newPassword, 12);
            // Update password
            const { error } = await database_1.supabase
                .from('users')
                .update({ password_hash: newPasswordHash })
                .eq('id', userId);
            if (error) {
                return false;
            }
            // Invalidate all sessions (force re-login)
            await this.logoutAllSessions(userId);
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.AuthService = AuthService;
AuthService.JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
AuthService.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
AuthService.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';
AuthService.JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || '30d';
exports.default = AuthService;
