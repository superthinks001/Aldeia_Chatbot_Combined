"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRolePermissions = exports.hasPermission = exports.requireSelfOrAdmin = exports.requireAllPermissions = exports.requireAnyPermission = exports.requirePermission = exports.requireRole = void 0;
const auth_types_1 = require("../../types/auth.types");
// ============================================
// ROLE-BASED ACCESS CONTROL (RBAC)
// ============================================
/**
 * Role hierarchy for authorization checks
 * Higher roles inherit permissions from lower roles
 */
const ROLE_HIERARCHY = {
    [auth_types_1.UserRole.VIEWER]: 1,
    [auth_types_1.UserRole.USER]: 2,
    [auth_types_1.UserRole.MODERATOR]: 3,
    [auth_types_1.UserRole.ADMIN]: 4
};
/**
 * Permission mappings for each role
 * Defines which permissions each role has access to
 */
const ROLE_PERMISSIONS = {
    [auth_types_1.UserRole.VIEWER]: [
        auth_types_1.Permission.READ_USER,
        auth_types_1.Permission.READ_CONVERSATION,
        auth_types_1.Permission.READ_ANALYTICS,
        auth_types_1.Permission.API_ACCESS
    ],
    [auth_types_1.UserRole.USER]: [
        auth_types_1.Permission.READ_USER,
        auth_types_1.Permission.CREATE_CONVERSATION,
        auth_types_1.Permission.READ_CONVERSATION,
        auth_types_1.Permission.DELETE_CONVERSATION,
        auth_types_1.Permission.READ_ANALYTICS,
        auth_types_1.Permission.API_ACCESS
    ],
    [auth_types_1.UserRole.MODERATOR]: [
        auth_types_1.Permission.READ_USER,
        auth_types_1.Permission.CREATE_CONVERSATION,
        auth_types_1.Permission.READ_CONVERSATION,
        auth_types_1.Permission.DELETE_CONVERSATION,
        auth_types_1.Permission.READ_ANALYTICS,
        auth_types_1.Permission.READ_ADVANCED_ANALYTICS,
        auth_types_1.Permission.EXPORT_DATA,
        auth_types_1.Permission.MODERATE_CONTENT,
        auth_types_1.Permission.MANAGE_CONTENT,
        auth_types_1.Permission.API_ACCESS
    ],
    [auth_types_1.UserRole.ADMIN]: [
        auth_types_1.Permission.CREATE_USER,
        auth_types_1.Permission.READ_USER,
        auth_types_1.Permission.UPDATE_USER,
        auth_types_1.Permission.DELETE_USER,
        auth_types_1.Permission.CREATE_CONVERSATION,
        auth_types_1.Permission.READ_CONVERSATION,
        auth_types_1.Permission.DELETE_CONVERSATION,
        auth_types_1.Permission.READ_ANALYTICS,
        auth_types_1.Permission.READ_ADVANCED_ANALYTICS,
        auth_types_1.Permission.EXPORT_DATA,
        auth_types_1.Permission.MANAGE_SYSTEM,
        auth_types_1.Permission.VIEW_SYSTEM_LOGS,
        auth_types_1.Permission.MANAGE_PERMISSIONS,
        auth_types_1.Permission.MANAGE_CONTENT,
        auth_types_1.Permission.MODERATE_CONTENT,
        auth_types_1.Permission.API_ACCESS,
        auth_types_1.Permission.ADMIN_API_ACCESS
    ]
};
// ============================================
// AUTHORIZATION MIDDLEWARE
// ============================================
/**
 * Middleware to check if user has required role
 * @param requiredRole - Minimum role required to access the route
 */
const requireRole = (requiredRole) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
            return;
        }
        const userRole = req.user.role;
        const userRoleLevel = ROLE_HIERARCHY[userRole];
        const requiredRoleLevel = ROLE_HIERARCHY[requiredRole];
        if (userRoleLevel < requiredRoleLevel) {
            res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                details: `Requires ${requiredRole} role or higher`
            });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
/**
 * Middleware to check if user has specific permission
 * @param requiredPermission - Permission required to access the route
 */
const requirePermission = (requiredPermission) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
            return;
        }
        const userRole = req.user.role;
        const userPermissions = ROLE_PERMISSIONS[userRole];
        if (!userPermissions.includes(requiredPermission)) {
            res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                details: `Requires ${requiredPermission} permission`
            });
            return;
        }
        next();
    };
};
exports.requirePermission = requirePermission;
/**
 * Middleware to check if user has any of the specified permissions
 * @param permissions - Array of permissions (user needs at least one)
 */
const requireAnyPermission = (permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
            return;
        }
        const userRole = req.user.role;
        const userPermissions = ROLE_PERMISSIONS[userRole];
        const hasPermission = permissions.some(permission => userPermissions.includes(permission));
        if (!hasPermission) {
            res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                details: `Requires one of: ${permissions.join(', ')}`
            });
            return;
        }
        next();
    };
};
exports.requireAnyPermission = requireAnyPermission;
/**
 * Middleware to check if user has all of the specified permissions
 * @param permissions - Array of permissions (user needs all of them)
 */
const requireAllPermissions = (permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
            return;
        }
        const userRole = req.user.role;
        const userPermissions = ROLE_PERMISSIONS[userRole];
        const hasAllPermissions = permissions.every(permission => userPermissions.includes(permission));
        if (!hasAllPermissions) {
            res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                details: `Requires all of: ${permissions.join(', ')}`
            });
            return;
        }
        next();
    };
};
exports.requireAllPermissions = requireAllPermissions;
/**
 * Middleware to check if user is accessing their own resource
 * @param userIdParam - Name of the route parameter containing user ID (default: 'userId')
 */
const requireSelfOrAdmin = (userIdParam = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
            return;
        }
        const requestedUserId = req.params[userIdParam];
        const isAdmin = req.user.role === auth_types_1.UserRole.ADMIN;
        const isSelf = req.user.userId === requestedUserId;
        if (!isSelf && !isAdmin) {
            res.status(403).json({
                success: false,
                error: 'Access denied',
                details: 'You can only access your own resources'
            });
            return;
        }
        next();
    };
};
exports.requireSelfOrAdmin = requireSelfOrAdmin;
/**
 * Helper function to check if a user has a specific permission
 * @param role - User's role
 * @param permission - Permission to check
 * @returns boolean indicating if user has permission
 */
const hasPermission = (role, permission) => {
    return ROLE_PERMISSIONS[role]?.includes(permission) || false;
};
exports.hasPermission = hasPermission;
/**
 * Helper function to get all permissions for a role
 * @param role - User's role
 * @returns Array of permissions
 */
const getRolePermissions = (role) => {
    return ROLE_PERMISSIONS[role] || [];
};
exports.getRolePermissions = getRolePermissions;
exports.default = {
    requireRole: exports.requireRole,
    requirePermission: exports.requirePermission,
    requireAnyPermission: exports.requireAnyPermission,
    requireAllPermissions: exports.requireAllPermissions,
    requireSelfOrAdmin: exports.requireSelfOrAdmin,
    hasPermission: exports.hasPermission,
    getRolePermissions: exports.getRolePermissions
};
