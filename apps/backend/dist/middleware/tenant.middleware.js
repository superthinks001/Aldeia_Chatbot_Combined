"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTenantAccess = exports.applyTenantFilter = exports.getTenantId = exports.requireTenant = exports.tenantMiddleware = void 0;
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
/**
 * Tenant middleware - extracts and validates tenant information
 * Supports two modes:
 * 1. API Key authentication (X-API-Key header)
 * 2. User-based tenant (via authenticated user's organization)
 */
const tenantMiddleware = async (req, res, next) => {
    try {
        // Check for API key in header
        const apiKey = req.headers['x-api-key'];
        if (apiKey) {
            // API key based tenant lookup
            const { data: tenant, error } = await database_1.supabase
                .from('tenants')
                .select('*')
                .eq('api_key', apiKey)
                .eq('is_active', true)
                .single();
            if (error || !tenant) {
                logger_1.logger.warn(`Invalid or inactive API key: ${apiKey}`);
                res.status(401).json({ error: 'Invalid or inactive API key' });
                return;
            }
            req.tenant = tenant;
            req.tenantId = tenant.id;
            logger_1.logger.info(`Tenant identified via API key: ${tenant.slug}`);
            return next();
        }
        // If user is authenticated, try to get tenant from organization membership
        if (req.user) {
            const userId = parseInt(req.user.userId);
            // Get user's organization
            const { data: membership, error } = await database_1.supabase
                .from('organization_members')
                .select(`
          organization_id,
          organizations (
            id,
            name,
            slug,
            settings
          )
        `)
                .eq('user_id', userId)
                .single();
            if (!error && membership && membership.organizations) {
                const org = Array.isArray(membership.organizations)
                    ? membership.organizations[0]
                    : membership.organizations;
                req.tenant = {
                    id: org.id,
                    name: org.name,
                    slug: org.slug,
                    settings: org.settings,
                };
                req.tenantId = org.id;
                logger_1.logger.info(`Tenant identified via user org: ${org.slug}`);
            }
        }
        // Continue without tenant (single-tenant mode or default tenant)
        next();
    }
    catch (error) {
        logger_1.logger.error('Tenant middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.tenantMiddleware = tenantMiddleware;
/**
 * Require tenant middleware - ensures request has valid tenant
 */
const requireTenant = (req, res, next) => {
    if (!req.tenant && !req.tenantId) {
        logger_1.logger.warn('Request missing required tenant information');
        res.status(403).json({
            error: 'Tenant information required',
            message: 'Please provide a valid X-API-Key header or authenticate with an organization',
        });
        return;
    }
    next();
};
exports.requireTenant = requireTenant;
/**
 * Get tenant ID from request (utility function)
 */
const getTenantId = (req) => {
    return req.tenantId || null;
};
exports.getTenantId = getTenantId;
/**
 * Add tenant filter to Supabase query
 * Usage: applyTenantFilter(query, req)
 */
const applyTenantFilter = (query, req) => {
    const tenantId = (0, exports.getTenantId)(req);
    if (tenantId) {
        return query.eq('organization_id', tenantId);
    }
    return query;
};
exports.applyTenantFilter = applyTenantFilter;
/**
 * Validate tenant access to resource
 */
const validateTenantAccess = async (req, table, resourceId) => {
    const tenantId = (0, exports.getTenantId)(req);
    if (!tenantId) {
        // No tenant restriction
        return true;
    }
    try {
        const { data, error } = await database_1.supabase
            .from(table)
            .select('organization_id')
            .eq('id', resourceId)
            .single();
        if (error || !data) {
            return false;
        }
        return data.organization_id === tenantId;
    }
    catch (error) {
        logger_1.logger.error('Error validating tenant access:', error);
        return false;
    }
};
exports.validateTenantAccess = validateTenantAccess;
exports.default = {
    tenantMiddleware: exports.tenantMiddleware,
    requireTenant: exports.requireTenant,
    getTenantId: exports.getTenantId,
    applyTenantFilter: exports.applyTenantFilter,
    validateTenantAccess: exports.validateTenantAccess,
};
