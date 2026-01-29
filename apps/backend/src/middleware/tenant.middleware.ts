import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/database';
import { logger } from '../utils/logger';

export interface TenantInfo {
  id: number;
  name: string;
  slug: string;
  api_key?: string;
  settings?: Record<string, any>;
}

// Extend Express Request to include tenant information
declare global {
  namespace Express {
    interface Request {
      tenant?: TenantInfo;
      tenantId?: number;
    }
  }
}

/**
 * Tenant middleware - extracts and validates tenant information
 * Supports two modes:
 * 1. API Key authentication (X-API-Key header)
 * 2. User-based tenant (via authenticated user's organization)
 */
export const tenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip tenant lookup if Supabase is not available (test mode)
    if (!supabase) {
      return next();
    }

    // Check for API key in header
    const apiKey = req.headers['x-api-key'] as string;

    if (apiKey) {
      // API key based tenant lookup
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('api_key', apiKey)
        .eq('is_active', true)
        .single();

      if (error || !tenant) {
        logger.warn(`Invalid or inactive API key: ${apiKey}`);
        res.status(401).json({ error: 'Invalid or inactive API key' });
        return;
      }

      req.tenant = tenant;
      req.tenantId = tenant.id;

      logger.info(`Tenant identified via API key: ${tenant.slug}`);
      return next();
    }

    // If user is authenticated, try to get tenant from organization membership
    if (req.user) {
      const userId = parseInt(req.user.userId);

      // Get user's organization
      const { data: membership, error } = await supabase
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

        logger.info(`Tenant identified via user org: ${org.slug}`);
      }
    }

    // Continue without tenant (single-tenant mode or default tenant)
    next();
  } catch (error) {
    logger.error('Tenant middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Require tenant middleware - ensures request has valid tenant
 */
export const requireTenant = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.tenant && !req.tenantId) {
    logger.warn('Request missing required tenant information');
    res.status(403).json({
      error: 'Tenant information required',
      message: 'Please provide a valid X-API-Key header or authenticate with an organization',
    });
    return;
  }

  next();
};

/**
 * Get tenant ID from request (utility function)
 */
export const getTenantId = (req: Request): number | null => {
  return req.tenantId || null;
};

/**
 * Add tenant filter to Supabase query
 * Usage: applyTenantFilter(query, req)
 */
export const applyTenantFilter = (query: any, req: Request): any => {
  const tenantId = getTenantId(req);

  if (tenantId) {
    return query.eq('organization_id', tenantId);
  }

  return query;
};

/**
 * Validate tenant access to resource
 */
export const validateTenantAccess = async (
  req: Request,
  table: string,
  resourceId: number | string
): Promise<boolean> => {
  // Skip validation if Supabase is not available (test mode)
  if (!supabase) {
    return true;
  }

  const tenantId = getTenantId(req);

  if (!tenantId) {
    // No tenant restriction
    return true;
  }

  try {
    const { data, error } = await supabase
      .from(table)
      .select('organization_id')
      .eq('id', resourceId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.organization_id === tenantId;
  } catch (error) {
    logger.error('Error validating tenant access:', error);
    return false;
  }
};

export default {
  tenantMiddleware,
  requireTenant,
  getTenantId,
  applyTenantFilter,
  validateTenantAccess,
};
