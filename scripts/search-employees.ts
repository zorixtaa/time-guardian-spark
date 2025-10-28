#!/usr/bin/env tsx

/**
 * Employee Search Script
 * 
 * This script searches for specific employees: Zori Zori, Zorino, Badr Fatine
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

async function searchEmployees() {
  try {
    console.log('🔍 Searching for specific employees: Zori Zori, Zorino, Badr Fatine\n')
    
    // Search in profiles table by display_name
    console.log('📊 Searching in profiles table...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .or('display_name.ilike.%zori%,display_name.ilike.%zorino%,display_name.ilike.%badr%,display_name.ilike.%fatine%')

    if (profilesError) {
      console.log(`   ❌ Profiles error: ${profilesError.message}`)
    } else {
      console.log(`   📈 Found ${profiles?.length || 0} matching profiles`)
      if (profiles && profiles.length > 0) {
        profiles.forEach((profile, index) => {
          console.log(`   ${index + 1}. ID: ${profile.id}`)
          console.log(`      Name: ${profile.display_name}`)
          console.log(`      Team ID: ${profile.team_id}`)
          console.log(`      Created: ${profile.created_at}`)
          console.log('')
        })
      }
    }

    // Search in all tables for any user data
    console.log('🔍 Searching all tables for user activity...\n')

    // Check attendance table
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .limit(50)

    console.log('⏰ Attendance records:')
    if (attendanceError) {
      console.log(`   ❌ Error: ${attendanceError.message}`)
    } else {
      console.log(`   📈 Total records: ${attendance?.length || 0}`)
      if (attendance && attendance.length > 0) {
        const uniqueUsers = [...new Set(attendance.map(a => a.user_id))]
        console.log(`   👥 Unique users: ${uniqueUsers.length}`)
        uniqueUsers.slice(0, 10).forEach((userId, index) => {
          console.log(`   ${index + 1}. User ID: ${userId}`)
        })
      }
    }

    // Check breaks table
    const { data: breaks, error: breaksError } = await supabase
      .from('breaks')
      .select('*')
      .limit(50)

    console.log('\n☕ Break records:')
    if (breaksError) {
      console.log(`   ❌ Error: ${breaksError.message}`)
    } else {
      console.log(`   📈 Total records: ${breaks?.length || 0}`)
      if (breaks && breaks.length > 0) {
        const uniqueUsers = [...new Set(breaks.map(b => b.user_id))]
        console.log(`   👥 Unique users: ${uniqueUsers.length}`)
        uniqueUsers.slice(0, 10).forEach((userId, index) => {
          console.log(`   ${index + 1}. User ID: ${userId}`)
        })
      }
    }

    // Check if there are any users in auth (this might not work with anon key)
    console.log('\n🔐 Checking auth users...')
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.log(`   ⚠️  Auth check failed (expected with anon key): ${authError.message}`)
      } else {
        console.log(`   👤 Current user: ${user ? user.email : 'None'}`)
      }
    } catch (err) {
      console.log(`   ⚠️  Auth check failed: ${err}`)
    }

    // Check all table schemas to understand structure
    console.log('\n📋 Checking table schemas...')
    
    const tables = ['profiles', 'attendance', 'breaks', 'user_roles', 'teams', 'shifts', 'sessions', 'badges', 'user_badges', 'xp_ledger', 'bonus_payouts', 'gamification_settings', 'files', 'announcements', 'metrics_daily']
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`   ❌ ${table}: ${error.message}`)
        } else {
          console.log(`   ✅ ${table}: Accessible (${data?.length || 0} sample records)`)
        }
      } catch (err) {
        console.log(`   ❌ ${table}: ${err}`)
      }
    }

    // Try to find any data with different approaches
    console.log('\n🔍 Deep search for any user data...')
    
    // Check if there are any records in any table
    const allTables = ['profiles', 'attendance', 'breaks', 'user_roles', 'teams', 'shifts', 'sessions', 'badges', 'user_badges', 'xp_ledger', 'bonus_payouts', 'gamification_settings', 'files', 'announcements', 'metrics_daily']
    
    for (const table of allTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (!error) {
          console.log(`   📊 ${table}: ${count || 0} total records`)
        }
      } catch (err) {
        // Ignore errors for tables that might not exist
      }
    }

  } catch (error) {
    console.error('❌ Error searching employees:', error)
  }
}

// Run the search
searchEmployees().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})