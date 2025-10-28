import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createSampleData() {
  try {
    console.log('🏗️  Creating sample data for dashboard...\n')
    
    // Step 1: Create teams/departments (already done)
    console.log('1. Teams already created ✅')
    
    // Step 2: Create sample profiles using direct SQL
    console.log('2. Creating sample profiles...')
    
    const profilesSQL = `
      INSERT INTO profiles (id, user_id, display_name, team_id, created_at, updated_at) VALUES
        ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011', 'Alice Johnson', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000012', 'Bob Smith', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000013', 'Carol Davis', '00000000-0000-0000-0000-000000000002', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000014', 'David Wilson', '00000000-0000-0000-0000-000000000003', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000015', 'Eva Brown', '00000000-0000-0000-0000-000000000004', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000016', 'Frank Miller', '00000000-0000-0000-0000-000000000002', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000017', 'Grace Lee', '00000000-0000-0000-0000-000000000003', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', 'Super Admin', NULL, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        team_id = EXCLUDED.team_id,
        updated_at = NOW();
    `
    
    const { error: profilesError } = await supabase.rpc('exec', { sql: profilesSQL })
    if (profilesError) {
      console.log(`❌ Failed to create profiles: ${profilesError.message}`)
    } else {
      console.log('✅ Created sample profiles')
    }
    
    // Step 3: Create user roles
    console.log('3. Creating user roles...')
    
    const rolesSQL = `
      INSERT INTO user_roles (user_id, role, created_at) VALUES
        ('00000000-0000-0000-0000-000000000011', 'employee', NOW()),
        ('00000000-0000-0000-0000-000000000012', 'admin', NOW()),
        ('00000000-0000-0000-0000-000000000013', 'employee', NOW()),
        ('00000000-0000-0000-0000-000000000014', 'employee', NOW()),
        ('00000000-0000-0000-0000-000000000015', 'admin', NOW()),
        ('00000000-0000-0000-0000-000000000016', 'employee', NOW()),
        ('00000000-0000-0000-0000-000000000017', 'employee', NOW()),
        ('00000000-0000-0000-0000-000000000010', 'super_admin', NOW())
      ON CONFLICT (user_id, role) DO NOTHING;
    `
    
    const { error: rolesError } = await supabase.rpc('exec', { sql: rolesSQL })
    if (rolesError) {
      console.log(`❌ Failed to create roles: ${rolesError.message}`)
    } else {
      console.log('✅ Created user roles')
    }
    
    // Step 4: Create sample attendance records
    console.log('4. Creating sample attendance records...')
    
    const attendanceSQL = `
      INSERT INTO attendance (id, user_id, clock_in_at, clock_out_at, created_at, updated_at) VALUES
        ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011', NOW() - INTERVAL '2 hours', NULL, NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000012', NOW() - INTERVAL '1.5 hours', NULL, NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000013', NOW() - INTERVAL '1 hour', NULL, NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000014', NOW() - INTERVAL '30 minutes', NULL, NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000015', NOW() - INTERVAL '15 minutes', NULL, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        clock_in_at = EXCLUDED.clock_in_at,
        clock_out_at = EXCLUDED.clock_out_at,
        updated_at = NOW();
    `
    
    const { error: attendanceError } = await supabase.rpc('exec', { sql: attendanceSQL })
    if (attendanceError) {
      console.log(`❌ Failed to create attendance: ${attendanceError.message}`)
    } else {
      console.log('✅ Created sample attendance records')
    }
    
    // Step 5: Create sample break records
    console.log('5. Creating sample break records...')
    
    const breaksSQL = `
      INSERT INTO breaks (id, user_id, type, status, started_at, ended_at, created_at, updated_at) VALUES
        ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000011', 'coffee', 'active', NOW() - INTERVAL '30 minutes', NULL, NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000013', 'lunch', 'active', NOW() - INTERVAL '15 minutes', NULL, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type,
        status = EXCLUDED.status,
        started_at = EXCLUDED.started_at,
        ended_at = EXCLUDED.ended_at,
        updated_at = NOW();
    `
    
    const { error: breaksError } = await supabase.rpc('exec', { sql: breaksSQL })
    if (breaksError) {
      console.log(`❌ Failed to create breaks: ${breaksError.message}`)
    } else {
      console.log('✅ Created sample break records')
    }
    
    // Step 6: Verify created data
    console.log('\n6. Verifying created data...')
    
    const { data: teamsData } = await supabase.from('teams').select('*')
    const { data: profilesData } = await supabase.from('profiles').select('*')
    const { data: rolesData } = await supabase.from('user_roles').select('*')
    const { data: attendanceData } = await supabase.from('attendance').select('*')
    const { data: breaksData } = await supabase.from('breaks').select('*')
    
    console.log('✅ Final counts:')
    console.log(`   - Teams: ${teamsData?.length || 0}`)
    console.log(`   - Profiles: ${profilesData?.length || 0}`)
    console.log(`   - Roles: ${rolesData?.length || 0}`)
    console.log(`   - Attendance: ${attendanceData?.length || 0}`)
    console.log(`   - Breaks: ${breaksData?.length || 0}`)
    
    console.log('\n🎉 Sample data creation completed!')
    console.log('\n📝 Next steps:')
    console.log('1. Log in as superadmin')
    console.log('2. The dashboard should now show:')
    console.log('   - 8 employees across 4 departments')
    console.log('   - 5 active attendance records')
    console.log('   - 2 active breaks')
    console.log('   - Real metrics and data')
    
  } catch (error: any) {
    console.error('❌ Error creating sample data:', error.message)
    process.exit(1)
  }
}

createSampleData()