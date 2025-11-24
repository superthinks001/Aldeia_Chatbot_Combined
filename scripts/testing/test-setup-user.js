const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = 'https://db.ldogkuurhpyiiolbovuq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxkb2drdXVyaHB5aWlvbGJvdnVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDU4NjM3MCwiZXhwIjoyMDQ2MTYyMzcwfQ.TRYTmOr8KgU95yW6P7S0XhTqmWz_hUl_c-CsHrr52cs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTestUsers() {
  console.log('🔍 Checking existing users...\n');

  // Check existing users
  const { data: existingUsers, error: selectError } = await supabase
    .from('users')
    .select('id, name, email, role, is_active')
    .order('id', { ascending: true });

  if (selectError) {
    console.error('❌ Error fetching users:', selectError);
    return;
  }

  console.log('📊 Existing users:');
  if (existingUsers && existingUsers.length > 0) {
    existingUsers.forEach(user => {
      console.log(`  - ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Active: ${user.is_active}`);
    });
  } else {
    console.log('  (No users found)');
  }

  console.log('\n🔐 Creating test users...\n');

  // Hash password for test users
  const passwordHash = await bcrypt.hash('Test1234', 10);

  // Create regular test user
  const { data: user1, error: error1 } = await supabase
    .from('users')
    .insert({
      name: 'Test User',
      email: 'testuser@example.com',
      role: 'user',
      password_hash: passwordHash,
      is_active: true,
      language: 'en'
    })
    .select()
    .single();

  if (error1 && error1.code !== '23505') { // 23505 = unique violation (already exists)
    console.error('❌ Error creating regular user:', error1);
  } else if (user1) {
    console.log('✅ Created regular user:', user1.email);
  } else {
    console.log('ℹ️  Regular user already exists: testuser@example.com');
  }

  // Create admin test user
  const { data: admin, error: error2 } = await supabase
    .from('users')
    .insert({
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
      password_hash: passwordHash,
      is_active: true,
      language: 'en'
    })
    .select()
    .single();

  if (error2 && error2.code !== '23505') {
    console.error('❌ Error creating admin user:', error2);
  } else if (admin) {
    console.log('✅ Created admin user:', admin.email);
  } else {
    console.log('ℹ️  Admin user already exists: admin@example.com');
  }

  // Check final user list
  const { data: finalUsers } = await supabase
    .from('users')
    .select('id, name, email, role, is_active')
    .order('id', { ascending: true });

  console.log('\n📊 Final user list:');
  finalUsers?.forEach(user => {
    console.log(`  - ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Active: ${user.is_active}`);
  });

  console.log('\n✅ Test users setup complete!');
  console.log('\n🔑 Test credentials:');
  console.log('   Regular user: testuser@example.com / Test1234');
  console.log('   Admin user:   admin@example.com / Test1234');
}

setupTestUsers().catch(console.error);
