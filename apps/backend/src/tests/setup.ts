/**
 * Jest setup file for test configuration
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.BACKEND_PORT = process.env.BACKEND_PORT || '3001';

// Increase timeout for async operations
jest.setTimeout(30000);
