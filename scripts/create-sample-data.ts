#!/usr/bin/env tsx

/**
 * Create Sample Data Script
 * 
 * This script creates sample data to populate the empty dashboard
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createSampleData() {
  try {
    console.log('🏗️  Creating sample data for dashboard...\n')
    
    // Step 1: Create teams/departments
    console.log('1. Creating teams...')
    
    const teams = [
      { id: '00000000-0000-0000-0000-000000000001', name: 'Engineering Department' },
      { id: '00000000-0000-0000-0000-000000000002', name: 'Sales Department' },
      { id: '00000000-0000-0000-0000-000000000003', name: 'Marketing Department' },
      { id: '00000000-0000-0000-0000-000000000004', name: 'Customer Support Department' }
    ]
    
    for (const team of teams) {
      try {
        const { error } = await supabase
          .from('teams')
          .upsert({
            id: team.id,
            name: team.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (error) {
          console.log(`❌ Failed to create team ${team.name}: ${error.message}`)
        } else {
          console.log(`✅ Created team: ${team.name}`)
        }
      } catch (err) {
        console.log(`❌ Error creating team ${team.name}: ${err}`)
      }
    }
    
    // Step 2: Create employee profiles
    console.log('\n2. Creating employee profiles...')
    
    const employees = [
      { id: '00000000-0000-0000-0000-000000000011', name: 'Alice Johnson', team: '00000000-0000-0000-0000-000000000001', role: 'employee' },
      { id: '00000000-0000-0000-0000-000000000012', name: 'Bob Smith', team: '00000000-0000-0000-0000-000000000001', role: 'admin' },
      { id: '00000000-0000-0000-0000-000000000013', name: 'Carol Davis', team: '00000000-0000-0000-0000-000000000002', role: 'employee' },
      { id: '00000000-0000-0000-0000-000000000014', name: 'David Wilson', team: '00000000-0000-0000-0000-000000000002', role: 'employee' },
      { id: '00000000-0000-0000-0000-000000000015', name: 'Eva Brown', team: '00000000-0000-0000-0000-000000000003', role: 'employee' },
      { id: '00000000-0000-0000-0000-000000000016', name: 'Frank Miller', team: '00000000-0000-0000-0000-000000000004', role: 'admin' },
      { id: '00000000-0000-0000-0000-000000000017', name: 'Grace Lee', team: null, role: 'employee' }, // Unassigned
      { id: '00000000-0000-0000-0000-000000000018', name: 'Super Admin', team: null, role: 'super_admin' }
    ]
    
    for (const emp of employees) {
      try {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: emp.id,
            display_name: emp.name,
            team_id: emp.team,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (profileError) {
          console.log(`❌ Failed to create profile for ${emp.name}: ${profileError.message}`)
          continue
        }
        
        // Create role
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: emp.id,
            role: emp.role,
            created_at: new Date().toISOString()
          })
        
        if (roleError) {
          console.log(`❌ Failed to create role for ${emp.name}: ${roleError.message}`)
        } else {
          console.log(`✅ Created employee: ${emp.name} (${emp.role}) in ${emp.team || 'Unassigned'}`)
        }
      } catch (err) {
        console.log(`❌ Error creating employee ${emp.name}: ${err}`)
      }
    }
    
    // Step 3: Create some sample attendance records
    console.log('\n3. Creating sample attendance records...')
    
    const today = new Date()
    const startOfDay = new Date(today)
    startOfDay.setHours(9, 0, 0, 0) // 9 AM
    
    const attendanceRecords = [
      { id: '00000000-0000-0000-0000-000000000021', user_id: '00000000-0000-0000-0000-000000000011', clock_in: new Date(startOfDay.getTime() + 0 * 30 * 60000) }, // 9:00 AM
      { id: '00000000-0000-0000-0000-000000000022', user_id: '00000000-0000-0000-0000-000000000012', clock_in: new Date(startOfDay.getTime() + 1 * 30 * 60000) }, // 9:30 AM
      { id: '00000000-0000-0000-0000-000000000023', user_id: '00000000-0000-0000-0000-000000000013', clock_in: new Date(startOfDay.getTime() + 2 * 30 * 60000) }, // 10:00 AM
      { id: '00000000-0000-0000-0000-000000000024', user_id: '00000000-0000-0000-0000-000000000014', clock_in: new Date(startOfDay.getTime() + 3 * 30 * 60000) }, // 10:30 AM
      { id: '00000000-0000-0000-0000-000000000025', user_id: '00000000-0000-0000-0000-000000000015', clock_in: new Date(startOfDay.getTime() + 4 * 30 * 60000) }, // 11:00 AM
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
      } catch (err) {
        console.log(`❌ Error creating attendance for ${record.user_id}: ${err}`)
      }
    }
    
    // Step 4: Create some sample break records
    console.log('\n4. Creating sample break records...')
    
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
            started_at: new Date().toISOString(),
            ended_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (error) {
          console.log(`❌ Failed to create break for ${record.user_id}: ${error.message}`)
        } else {
          console.log(`✅ Created break record for ${record.user_id} (${record.type})`)
        }
      } catch (err) {
        console.log(`❌ Error creating break for ${record.user_id}: ${err}`)
      }
    }
    
    // Step 5: Verify the data
    console.log('\n5. Verifying created data...')
    
    const { data: finalProfiles } = await supabase.from('profiles').select('*')
    const { data: finalTeams } = await supabase.from('teams').select('*')
    const { data: finalRoles } = await supabase.from('user_roles').select('*')
    const { data: finalAttendance } = await supabase.from('attendance').select('*')
    const { data: finalBreaks } = await supabase.from('breaks').select('*')
    
    console.log(`✅ Final counts:`)
    console.log(`   - Profiles: ${finalProfiles?.length || 0}`)
    console.log(`   - Teams: ${finalTeams?.length || 0}`)
    console.log(`   - Roles: ${finalRoles?.length || 0}`)
    console.log(`   - Attendance: ${finalAttendance?.length || 0}`)
    console.log(`   - Breaks: ${finalBreaks?.length || 0}`)
    
    console.log('\n🎉 Sample data creation completed!')
    console.log('\n📝 Next steps:')
    console.log('1. Log in as superadmin')
    console.log('2. The dashboard should now show:')
    console.log('   - 8 employees across 4 teams')
    console.log('   - 5 active attendance records')
    console.log('   - 2 active breaks')
    console.log('   - Real metrics and data')
    
  } catch (error) {
    console.error('\n❌ Sample data creation failed:', error)
  }
}

// Run the script
createSampleData().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})