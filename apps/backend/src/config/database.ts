import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// ============================================
// PostgreSQL/Supabase Connection
// ============================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.CI === 'true';

// In test/CI environments, allow missing Supabase credentials
// The app can still function using DATABASE_URL for direct PostgreSQL access
if (!supabaseUrl || !supabaseServiceKey) {
  if (!isTestEnv) {
    throw new Error('❌ Supabase credentials not found. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.');
  }
  console.warn('⚠️  Supabase credentials not found. Running in test mode with limited functionality.');
}

// Create Supabase client only if credentials are available
export const supabase: SupabaseClient | null = (supabaseUrl && supabaseServiceKey)
  ? createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null;

// ============================================
// Database Helper Functions
// ============================================

export async function testConnection(): Promise<boolean> {
  // If Supabase client is not available (test mode), try direct PostgreSQL
  if (!supabase) {
    try {
      // In test mode, use the healthCheck from the database connection module
      const { healthCheck } = await import('../database/connection');
      const result = await healthCheck();
      if (result) {
        console.log('✅ PostgreSQL connection successful (direct mode)');
      }
      return result;
    } catch (error) {
      console.error('❌ Database connection error (direct mode):', error);
      return false;
    }
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }

    console.log('✅ PostgreSQL/Supabase connection successful');
    return true;

  } catch (error) {
    console.error('❌ Database connection error:', error);
    return false;
  }
}

// Log database mode on import
if (supabase) {
  console.log('📊 Database Mode: PostgreSQL/Supabase');
} else {
  console.log('📊 Database Mode: Direct PostgreSQL (test mode)');
}

/**
 * Get the Supabase client, throwing an error if not available.
 * Use this in code paths that require Supabase functionality.
 */
export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase client is not available. This feature requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return supabase;
}

/**
 * Check if Supabase is available
 */
export function isSupabaseAvailable(): boolean {
  return supabase !== null;
}

export default { supabase, testConnection, getSupabase, isSupabaseAvailable };
