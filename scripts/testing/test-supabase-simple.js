#!/usr/bin/env node
/**
 * Simple Supabase Connection Test
 * Tests only what we can verify with current credentials
 */

require('dotenv').config({ path: 'apps/backend/.env' });
const { createClient } = require('@supabase/supabase-js');

console.log('='.repeat(60));
console.log('Simple Supabase Connection Test');
console.log('='.repeat(60));

console.log('\n📋 Testing with:');
console.log(`  URL: ${process.env.SUPABASE_URL}`);
console.log(`  ANON_KEY: ${process.env.SUPABASE_ANON_KEY?.substring(0, 30)}...`);
console.log('');

async function testSupabase() {
  try {
    console.log('🔍 Creating Supabase client...');

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    console.log('  ✅ Client created successfully\n');

    console.log('🔍 Testing API connectivity...');

    // Make a simple RPC call that doesn't require any tables
    const { data, error } = await supabase.rpc('version', {});

    // This might error if version() function doesn't exist, but connection works
    console.log('  Response:', { data, error: error?.message });

    if (error) {
      // Check if it's just a "function doesn't exist" error (expected)
      if (error.message.includes('function') || error.code === '42883' || error.code === 'PGRST202') {
        console.log('  ✅ API is reachable (function not found is expected)\n');
        return true;
      } else {
        console.log('  ❌ Unexpected error:', error.message, '\n');
        return false;
      }
    }

    console.log('  ✅ API call successful\n');
    return true;

  } catch (error) {
    console.error('  ❌ Test failed:', error.message, '\n');
    return false;
  }
}

async function main() {
  const success = await testSupabase();

  console.log('='.repeat(60));
  if (success) {
    console.log('✅ SUCCESS: Supabase API is accessible!');
    console.log('');
    console.log('Your Supabase project is active and API keys are valid.');
    console.log('');
    console.log('⚠️  Next: Fix the DATABASE_URL password');
    console.log('');
    console.log('To get your database password:');
    console.log('  1. Go to https://supabase.com/dashboard');
    console.log('  2. Select your project');
    console.log('  3. Go to Settings → Database');
    console.log('  4. Copy the "Connection string" (URI format)');
    console.log('  5. Or copy your database password and let me know');
    console.log('');
    console.log('See GET_SUPABASE_CREDENTIALS.md for detailed instructions');
  } else {
    console.log('❌ FAILED: Could not connect to Supabase API');
    console.log('');
    console.log('Please check:');
    console.log('  - SUPABASE_URL is correct');
    console.log('  - SUPABASE_ANON_KEY is correct');
    console.log('  - Your project is not paused');
  }
  console.log('='.repeat(60));

  process.exit(success ? 0 : 1);
}

main();
