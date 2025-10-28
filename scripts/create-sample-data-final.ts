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
    
    // Step 2: Create sample profiles using individual inserts
    console.log('2. Creating sample profiles...')
    
    const profiles = [
      { id: '00000000-0000-0000-0000-000000000011', user_id: '00000000-0000-0000-0000-000000000011', display_name: 'Alice Johnson', team_id: '00000000-0000-0000-0000-000000000001' },
      { id: '00000000-0000-0000-0000-000000000012', user_id: '00000000-0000-0000-0000-000000000012', display_name: 'Bob Smith', team_id: '00000000-0000-0000-0000-000000000001' },
      { id: '00000000-0000-0000-0000-000000000013', user_id: '00000000-0000-0000-0000-000000000013', display_name: 'Carol Davis', team_id: '00000000-0000-0000-0000-000000000002' },
      { id: '00000000-0000-0000-0000-000000000014', user_id: '00000000-0000-0000-0000-000000000014', display_name: 'David Wilson', team_id: '00000000-0000-0000-0000-000000000003' },
      { id: '00000000-0000-0000-0000-000000000015', user_id: '00000000-0000-0000-0000-000000000015', display_name: 'Eva Brown', team_id: '00000000-0000-0000-0000-000000000004' },
      { id: '00000000-0000-0000-0000-000000000016', user_id: '00000000-0000-0000-0000-000000000016', display_name: 'Frank Miller', team_id: '00000000-0000-0000-0000-000000000002' },
      { id: '00000000-0000-0000-0000-000000000017', user_id: '00000000-0000-0000-0000-000000000017', display_name: 'Grace Lee', team_id: '00000000-0000-0000-0000-000000000003' },
      { id: '00000000-0000-0000-0000-000000000010', user_id: '00000000-0000-0000-0000-000000000010', display_name: 'Super Admin', team_id: null }
    ]
    
    for (const profile of profiles) {
      try {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: profile.id,
            user_id: profile.user_id,
            display_name: profile.display_name,
            team_id: profile.team_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (error) {
          console.log(`❌ Failed to create profile ${profile.display_name}: ${error.message}`)
        } else {
          console.log(`✅ Created profile: ${profile.display_name}`)
        }
      } catch (err: any) {
        console.log(`❌ Error creating profile ${profile.display_name}: ${err.message}`)
      }
    }
    
    // Step 3: Create user roles
    console.log('\n3. Creating user roles...')
    
    const userRoles = [
      { user_id: '00000000-0000-0000-0000-000000000011', role: 'employee' },
      { user_id: '00000000-0000-0000-0000-000000000012', role: 'admin' },
      { user_id: '00000000-0000-0000-0000-000000000013', role: 'employee' },
      { user_id: '00000000-0000-0000-0000-000000000014', role: 'employee' },
      { user_id: '00000000-0000-0000-0000-000000000015', role: 'admin' },
      { user_id: '00000000-0000-0000-0000-000000000016', role: 'employee' },
      { user_id: '00000000-0000-0000-0000-000000000017', role: 'employee' },
      { user_id: '00000000-0000-0000-0000-000000000010', role: 'super_admin' }
    ]
    
    for (const userRole of userRoles) {
      try {
        const { error } = await supabase
          .from('user_roles')
          .upsert({
            user_id: userRole.user_id,
            role: userRole.role,
            created_at: new Date().toISOString()
          })
        
        if (error) {
          console.log(`❌ Failed to create role for ${userRole.user_id}: ${error.message}`)
        } else {
          console.log(`✅ Created role: ${userRole.role} for ${userRole.user_id}`)
        }
      } catch (err: any) {
        console.log(`❌ Error creating role for ${userRole.user_id}: ${err.message}`)
      }
    }
    
    // Step 4: Create sample attendance records
    console.log('\n4. Creating sample attendance records...')
    
    const attendanceRecords = [
      { id: '00000000-0000-0000-0000-000000000021', user_id: '00000000-0000-0000-0000-000000000011', clock_in: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // 2 hours ago
      { id: '00000000-0000-0000-0000-000000000022', user_id: '00000000-0000-0000-0000-000000000012', clock_in: new Date(Date.now() - 1.5 * 60 * 60 * 1000) }, // 1.5 hours ago
      { id: '00000000-0000-0000-0000-000000000023', user_id: '00000000-0000-0000-0000-000000000013', clock_in: new Date(Date.now() - 1 * 60 * 60 * 1000) }, // 1 hour ago
      { id: '00000000-0000-0000-0000-000000000024', user_id: '00000000-0000-0000-0000-000000000014', clock_in: new Date(Date.now() - 0.5 * 60 * 60 * 1000) }, // 30 minutes ago
      { id: '00000000-0000-0000-0000-000000000025', user_id: '00000000-0000-0000-0000-000000000015', clock_in: new Date(Date.now() - 0.25 * 60 * 60 * 1000) } // 15 minutes ago
    ]
    
    for (const record of attendanceRecords) {
      try {
        const { error } = await supabase
          .from('attendance')
          .upsert({
            id: record.id,
            user_id: record.user_id,
            clock_in_at: record.clock_in.toISOString(),
            clock_out_at: null, // Still active
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (error) {
          console.log(`❌ Failed to create attendance for ${record.user_id}: ${error.message}`)
        } else {
          console.log(`✅ Created attendance record for ${record.user_id}`)
        }
      } catch (err: any) {
        console.log(`❌ Error creating attendance for ${record.user_id}: ${err.message}`)
      }
    }
    
    // Step 5: Create sample break records
    console.log('\n5. Creating sample break records...')
    
    const breakRecords = [
      { id: '00000000-0000-0000-0000-000000000031', user_id: '00000000-0000-0000-0000-000000000011', type: 'coffee', status: 'active' },
      { id: '00000000-0000-0000-0000-000000000032', user_id: '00000000-0000-0000-0000-000000000013', type: 'lunch', status: 'active' }
    ]
    
    for (const record of breakRecords) {
      try {
        const { error } = await supabase
          .from('breaks')
          .upsert({
            id: record.id,
            user_id: record.user_id,
            type: record.type,
            status: record.status,
            started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
            ended_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (error) {
          console.log(`❌ Failed to create break for ${record.user_id}: ${error.message}`)
        } else {
          console.log(`✅ Created break record for ${record.user_id} (${record.type})`)
        }
      } catch (err: any) {
        console.log(`❌ Error creating break for ${record.user_id}: ${err.message}`)
      }
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