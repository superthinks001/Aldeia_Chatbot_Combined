/**
 * Performance Optimization Service
 *
 * Provides performance monitoring and optimization features:
 * - Response caching with TTL
 * - Query optimization and analysis
 * - Response time tracking
 * - Resource utilization monitoring
 * - Performance recommendations
 * - Cache warming and invalidation
 *
 * Sprint 5: Advanced Features & Analytics
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CacheEntry {
  key: string;
  value: any;
  createdAt: Date;
  expiresAt: Date;
  ttl: number; // seconds
  hitCount: number;
  size: number; // bytes
  category: 'response' | 'query' | 'document' | 'user' | 'analytics';
}

export interface PerformanceLog {
  id: string;
  timestamp: Date;
  operation: string;
  duration: number; // milliseconds
  success: boolean;
  userId?: number;
  metadata: any;
  cacheHit: boolean;
}

export interface QueryProfile {
  query: string;
  avgDuration: number;
  executions: number;
  lastExecuted: Date;
  slowest: number;
  fastest: number;
  cacheHitRate: number;
  optimizationSuggestions: string[];
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number; // bytes
  hitRate: number; // percentage
  missRate: number; // percentage
  evictions: number;
  byCategory: {
    [category: string]: {
      entries: number;
      size: number;
      hitRate: number;
    };
  };
  topEntries: Array<{
    key: string;
    hits: number;
    size: number;
  }>;
}

export interface PerformanceMetrics {
  responseTime: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
  throughput: {
    requestsPerMinute: number;
    requestsPerHour: number;
    peakRPM: number;
  };
  cache: CacheStats;
  queries: {
    totalQueries: number;
    avgQueryTime: number;
    slowQueries: QueryProfile[];
  };
  resources: {
    cacheMemoryUsage: number; // MB
    estimatedDBConnections: number;
  };
}

export interface OptimizationRecommendation {
  id: string;
  category: 'cache' | 'query' | 'api' | 'resource';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  impact: string;
  implementation: string;
  estimatedImprovement: string;
}

// ============================================================================
// In-Memory Cache (with LRU eviction)
// ============================================================================

class LRUCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number; // max entries
  private maxMemory: number; // max bytes

  constructor(maxSize: number = 1000, maxMemory: number = 100 * 1024 * 1024) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.maxMemory = maxMemory;
  }

  set(
    key: string,
    value: any,
    ttl: number = 300,
    category: 'response' | 'query' | 'document' | 'user' | 'analytics' = 'response'
  ): void {
    // Remove expired entries
    this.cleanupExpired();

    const now = new Date();
    const valueStr = JSON.stringify(value);
    const size = Buffer.byteLength(valueStr, 'utf8');

    const entry: CacheEntry = {
      key,
      value,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttl * 1000),
      ttl,
      hitCount: 0,
      size,
      category
    };

    // Check if we need to evict
    while (this.shouldEvict(size)) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count and move to end (most recently used)
    entry.hitCount++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  invalidateByPattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  private shouldEvict(newEntrySize: number): boolean {
    if (this.cache.size >= this.maxSize) return true;

    const currentMemory = this.getTotalSize();
    return currentMemory + newEntrySize > this.maxMemory;
  }

  private evictLRU(): void {
    // First entry is least recently used
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
    }
  }

  private cleanupExpired(): void {
    const now = new Date();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  getTotalSize(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size;
    }
    return total;
  }

  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, e) => sum + e.hitCount, 0);
    const totalRequests = totalHits + entries.length; // Approximation

    const byCategory: { [key: string]: any } = {};
    for (const entry of entries) {
      if (!byCategory[entry.category]) {
        byCategory[entry.category] = { entries: 0, size: 0, hits: 0, requests: 0 };
      }
      byCategory[entry.category].entries++;
      byCategory[entry.category].size += entry.size;
      byCategory[entry.category].hits += entry.hitCount;
      byCategory[entry.category].requests += entry.hitCount + 1;
    }

    // Calculate hit rates
    Object.keys(byCategory).forEach(cat => {
      byCategory[cat].hitRate = byCategory[cat].requests > 0
        ? (byCategory[cat].hits / byCategory[cat].requests) * 100
        : 0;
    });

    // Top entries by hit count
    const topEntries = entries
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, 10)
      .map(e => ({
        key: e.key,
        hits: e.hitCount,
        size: e.size
      }));

    return {
      totalEntries: this.cache.size,
      totalSize: this.getTotalSize(),
      hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
      missRate: totalRequests > 0 ? ((totalRequests - totalHits) / totalRequests) * 100 : 0,
      evictions: 0, // Would track this in production
      byCategory,
      topEntries
    };
  }
}

// Global cache instance
const cache = new LRUCache(2000, 150 * 1024 * 1024); // 2000 entries, 150MB max

// ============================================================================
// Cache Operations
// ============================================================================

export function getCached<T>(key: string): T | null {
  return cache.get(key);
}

export function setCached<T>(
  key: string,
  value: T,
  ttl: number = 300,
  category: 'response' | 'query' | 'document' | 'user' | 'analytics' = 'response'
): void {
  cache.set(key, value, ttl, category);
}

export function deleteCached(key: string): void {
  cache.delete(key);
}

export function clearCache(): void {
  cache.clear();
}

export function invalidateCachePattern(pattern: string | RegExp): number {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  return cache.invalidateByPattern(regex);
}

export function getCacheStats(): CacheStats {
  return cache.getStats();
}

// ============================================================================
// Cache Key Generation
// ============================================================================

export function generateCacheKey(
  operation: string,
  params: any
): string {
  const paramsStr = JSON.stringify(params, Object.keys(params).sort());
  return `${operation}:${crypto.createHash('md5').update(paramsStr).digest('hex')}`;
}

// ============================================================================
// Response Caching Middleware
// ============================================================================

export async function cachedOperation<T>(
  key: string,
  operation: () => Promise<T>,
  ttl: number = 300,
  category: 'response' | 'query' | 'document' | 'user' | 'analytics' = 'response'
): Promise<{ result: T; fromCache: boolean; duration: number }> {
  const startTime = Date.now();

  // Check cache
  const cached = getCached<T>(key);
  if (cached !== null) {
    const duration = Date.now() - startTime;
    await logPerformance({
      operation: key,
      duration,
      success: true,
      cacheHit: true,
      metadata: { category }
    });
    return { result: cached, fromCache: true, duration };
  }

  // Execute operation
  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    // Store in cache
    setCached(key, result, ttl, category);

    await logPerformance({
      operation: key,
      duration,
      success: true,
      cacheHit: false,
      metadata: { category }
    });

    return { result, fromCache: false, duration };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    await logPerformance({
      operation: key,
      duration,
      success: false,
      cacheHit: false,
      metadata: { category, error: error.message }
    });
    throw error;
  }
}

// ============================================================================
// Performance Logging
// ============================================================================

async function logPerformance(data: {
  operation: string;
  duration: number;
  success: boolean;
  userId?: number;
  cacheHit: boolean;
  metadata?: any;
}): Promise<void> {
  const log: PerformanceLog = {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    operation: data.operation,
    duration: data.duration,
    success: data.success,
    userId: data.userId,
    metadata: data.metadata || {},
    cacheHit: data.cacheHit
  };

  // Store in database (async, don't await to avoid slowing down requests)
  supabase.from('performance_logs').insert([{
    id: log.id,
    timestamp: log.timestamp.toISOString(),
    operation: log.operation,
    duration: log.duration,
    success: log.success,
    user_id: log.userId,
    metadata: JSON.stringify(log.metadata),
    cache_hit: log.cacheHit
  }]).then((result) => {
    if (result.error) {
      console.error('Failed to log performance:', result.error);
    }
  });
}

export async function trackOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  userId?: number
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    await logPerformance({
      operation,
      duration,
      success: true,
      userId,
      cacheHit: false
    });

    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    await logPerformance({
      operation,
      duration,
      success: false,
      userId,
      cacheHit: false,
      metadata: { error: error.message }
    });

    throw error;
  }
}

// ============================================================================
// Query Profiling
// ============================================================================

export async function getSlowQueries(limit: number = 20): Promise<QueryProfile[]> {
  // Get performance logs for database queries
  const { data: logs } = await supabase
    .from('performance_logs')
    .select('*')
    .like('operation', 'query:%')
    .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('duration', { ascending: false })
    .limit(1000);

  if (!logs || logs.length === 0) return [];

  // Group by operation
  const queryMap = new Map<string, {
    durations: number[];
    cacheHits: number;
    total: number;
    lastExecuted: Date;
  }>();

  logs.forEach(log => {
    const existing = queryMap.get(log.operation) || {
      durations: [],
      cacheHits: 0,
      total: 0,
      lastExecuted: new Date(log.timestamp)
    };

    existing.durations.push(log.duration);
    existing.total++;
    if (log.cache_hit) existing.cacheHits++;
    if (new Date(log.timestamp) > existing.lastExecuted) {
      existing.lastExecuted = new Date(log.timestamp);
    }

    queryMap.set(log.operation, existing);
  });

  // Build profiles
  const profiles: QueryProfile[] = [];

  queryMap.forEach((stats, query) => {
    const avgDuration = stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length;
    const slowest = Math.max(...stats.durations);
    const fastest = Math.min(...stats.durations);
    const cacheHitRate = (stats.cacheHits / stats.total) * 100;

    const suggestions: string[] = [];

    if (avgDuration > 1000) {
      suggestions.push('Consider adding indexes or optimizing query structure');
    }
    if (cacheHitRate < 30 && stats.total > 50) {
      suggestions.push('Increase cache TTL or implement query result caching');
    }
    if (slowest > avgDuration * 3) {
      suggestions.push('High variance in execution time - investigate query plan');
    }

    profiles.push({
      query,
      avgDuration: Math.round(avgDuration),
      executions: stats.total,
      lastExecuted: stats.lastExecuted,
      slowest: Math.round(slowest),
      fastest: Math.round(fastest),
      cacheHitRate: Math.round(cacheHitRate * 10) / 10,
      optimizationSuggestions: suggestions
    });
  });

  // Sort by average duration and return top N
  return profiles.sort((a, b) => b.avgDuration - a.avgDuration).slice(0, limit);
}

// ============================================================================
// Performance Metrics
// ============================================================================

export async function getPerformanceMetrics(filters: {
  startDate?: Date;
  endDate?: Date;
  operation?: string;
}): Promise<PerformanceMetrics> {
  const startDate = filters.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const endDate = filters.endDate || new Date();

  // Get performance logs
  let query = supabase
    .from('performance_logs')
    .select('*')
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString());

  if (filters.operation) {
    query = query.eq('operation', filters.operation);
  }

  const { data: logs } = await query.limit(10000);

  // Calculate response time metrics
  const durations = (logs || []).map(l => l.duration).sort((a, b) => a - b);
  const responseTime = {
    avg: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
    p50: durations[Math.floor(durations.length * 0.5)] || 0,
    p95: durations[Math.floor(durations.length * 0.95)] || 0,
    p99: durations[Math.floor(durations.length * 0.99)] || 0,
    min: durations[0] || 0,
    max: durations[durations.length - 1] || 0
  };

  // Calculate throughput
  const timeRangeHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  const totalRequests = logs?.length || 0;
  const throughput = {
    requestsPerMinute: timeRangeHours > 0 ? (totalRequests / (timeRangeHours * 60)) : 0,
    requestsPerHour: timeRangeHours > 0 ? (totalRequests / timeRangeHours) : 0,
    peakRPM: 0 // Would calculate from time-bucketed data in production
  };

  // Get cache stats
  const cacheStats = getCacheStats();

  // Get slow queries
  const slowQueries = await getSlowQueries(10);

  const queryLogs = (logs || []).filter(l => l.operation.startsWith('query:'));
  const avgQueryTime = queryLogs.length > 0
    ? queryLogs.reduce((sum, l) => sum + l.duration, 0) / queryLogs.length
    : 0;

  return {
    responseTime: {
      avg: Math.round(responseTime.avg),
      p50: Math.round(responseTime.p50),
      p95: Math.round(responseTime.p95),
      p99: Math.round(responseTime.p99),
      min: Math.round(responseTime.min),
      max: Math.round(responseTime.max)
    },
    throughput: {
      requestsPerMinute: Math.round(throughput.requestsPerMinute * 10) / 10,
      requestsPerHour: Math.round(throughput.requestsPerHour * 10) / 10,
      peakRPM: Math.round(throughput.peakRPM)
    },
    cache: cacheStats,
    queries: {
      totalQueries: queryLogs.length,
      avgQueryTime: Math.round(avgQueryTime),
      slowQueries
    },
    resources: {
      cacheMemoryUsage: Math.round(cacheStats.totalSize / (1024 * 1024) * 10) / 10, // MB
      estimatedDBConnections: 5 // Would track actual connections in production
    }
  };
}

// ============================================================================
// Optimization Recommendations
// ============================================================================

export async function getOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
  const recommendations: OptimizationRecommendation[] = [];

  // Get current metrics
  const metrics = await getPerformanceMetrics({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
  });

  // Cache recommendations
  if (metrics.cache.hitRate < 60) {
    recommendations.push({
      id: 'cache-1',
      category: 'cache',
      severity: 'high',
      title: 'Low Cache Hit Rate',
      description: `Current cache hit rate is ${metrics.cache.hitRate.toFixed(1)}%, below the 60% threshold`,
      impact: 'Reduced cache hit rate leads to slower response times and higher database load',
      implementation: 'Increase cache TTL values, implement cache warming for frequently accessed data',
      estimatedImprovement: '20-30% reduction in response time'
    });
  }

  if (metrics.cache.totalSize > 120 * 1024 * 1024) {
    recommendations.push({
      id: 'cache-2',
      category: 'cache',
      severity: 'medium',
      title: 'High Cache Memory Usage',
      description: `Cache is using ${metrics.resources.cacheMemoryUsage}MB, approaching the 150MB limit`,
      impact: 'High memory usage may cause cache evictions and reduce hit rate',
      implementation: 'Review cached data size, implement compression, or increase cache memory limit',
      estimatedImprovement: '10-15% improvement in cache efficiency'
    });
  }

  // Query recommendations
  if (metrics.responseTime.p95 > 800) {
    recommendations.push({
      id: 'query-1',
      category: 'query',
      severity: 'high',
      title: 'Slow 95th Percentile Response Time',
      description: `95th percentile response time is ${metrics.responseTime.p95}ms, exceeding 800ms target`,
      impact: 'Slow queries degrade user experience and may indicate database performance issues',
      implementation: 'Review slow queries, add database indexes, optimize N+1 queries',
      estimatedImprovement: '30-40% reduction in p95 response time'
    });
  }

  if (metrics.queries.slowQueries.length > 5) {
    const slowestQuery = metrics.queries.slowQueries[0];
    recommendations.push({
      id: 'query-2',
      category: 'query',
      severity: 'medium',
      title: 'Multiple Slow Queries Detected',
      description: `${metrics.queries.slowQueries.length} slow queries identified. Slowest: ${slowestQuery.query} (${slowestQuery.avgDuration}ms avg)`,
      impact: 'Slow queries reduce throughput and increase database load',
      implementation: 'Optimize slow queries, add caching, consider query result pagination',
      estimatedImprovement: '15-25% improvement in overall query performance'
    });
  }

  // API recommendations
  if (metrics.responseTime.avg > 500) {
    recommendations.push({
      id: 'api-1',
      category: 'api',
      severity: 'high',
      title: 'High Average Response Time',
      description: `Average response time is ${metrics.responseTime.avg}ms, exceeding 500ms target`,
      impact: 'Slow API responses lead to poor user experience',
      implementation: 'Implement caching, optimize database queries, consider CDN for static assets',
      estimatedImprovement: '25-35% reduction in average response time'
    });
  }

  // Resource recommendations
  if (metrics.throughput.requestsPerMinute > 80) {
    recommendations.push({
      id: 'resource-1',
      category: 'resource',
      severity: 'medium',
      title: 'High Request Volume',
      description: `Current throughput is ${metrics.throughput.requestsPerMinute.toFixed(1)} requests/min, approaching capacity`,
      impact: 'High request volume may strain infrastructure and lead to degraded performance',
      implementation: 'Plan for horizontal scaling, implement rate limiting, optimize resource usage',
      estimatedImprovement: 'Improved system stability under load'
    });
  }

  return recommendations;
}

// ============================================================================
// Cache Warming
// ============================================================================

export async function warmCache(keys: Array<{ key: string; operation: () => Promise<any>; ttl?: number }>): Promise<void> {
  console.log(`[CACHE WARMING] Warming ${keys.length} cache entries...`);

  for (const { key, operation, ttl } of keys) {
    try {
      const result = await operation();
      setCached(key, result, ttl || 300);
    } catch (error) {
      console.error(`[CACHE WARMING] Failed to warm cache for key ${key}:`, error);
    }
  }

  console.log('[CACHE WARMING] Complete');
}

// ============================================================================
// Performance Report
// ============================================================================

export async function generatePerformanceReport(period: '24h' | '7d' | '30d' = '24h'): Promise<string> {
  const hours = period === '24h' ? 24 : period === '7d' ? 168 : 720;
  const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

  const metrics = await getPerformanceMetrics({ startDate });
  const recommendations = await getOptimizationRecommendations();

  const lines: string[] = [];

  lines.push('ALDEIA PERFORMANCE REPORT');
  lines.push(`Period: ${period}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  lines.push('RESPONSE TIME METRICS');
  lines.push(`Average: ${metrics.responseTime.avg}ms`);
  lines.push(`P50: ${metrics.responseTime.p50}ms`);
  lines.push(`P95: ${metrics.responseTime.p95}ms`);
  lines.push(`P99: ${metrics.responseTime.p99}ms`);
  lines.push('');

  lines.push('THROUGHPUT');
  lines.push(`Requests/min: ${metrics.throughput.requestsPerMinute.toFixed(1)}`);
  lines.push(`Requests/hour: ${metrics.throughput.requestsPerHour.toFixed(1)}`);
  lines.push('');

  lines.push('CACHE PERFORMANCE');
  lines.push(`Entries: ${metrics.cache.totalEntries}`);
  lines.push(`Size: ${metrics.resources.cacheMemoryUsage}MB`);
  lines.push(`Hit Rate: ${metrics.cache.hitRate.toFixed(1)}%`);
  lines.push('');

  lines.push('QUERY PERFORMANCE');
  lines.push(`Total Queries: ${metrics.queries.totalQueries}`);
  lines.push(`Avg Query Time: ${metrics.queries.avgQueryTime}ms`);
  lines.push(`Slow Queries: ${metrics.queries.slowQueries.length}`);
  lines.push('');

  if (recommendations.length > 0) {
    lines.push('OPTIMIZATION RECOMMENDATIONS');
    recommendations.forEach((rec, i) => {
      lines.push(`${i + 1}. [${rec.severity.toUpperCase()}] ${rec.title}`);
      lines.push(`   ${rec.description}`);
      lines.push(`   Impact: ${rec.estimatedImprovement}`);
    });
  }

  return lines.join('\n');
}
