#!/usr/bin/env tsx

/**
 * Auth Users Check Script
 * 
 * This script checks for authenticated users in Supabase Auth
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

async function checkAuthUsers() {
  try {
    console.log('🔐 Checking authenticated users...\n')
    
    // Check if we can access auth users (this might require service role key)
    console.log('📊 Checking database tables for user data...\n')
    
    // Check profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(10)

    console.log('👤 Profiles table:')
    if (profilesError) {
      console.log(`   ❌ Error: ${profilesError.message}`)
    } else {
      console.log(`   📈 Records found: ${profiles?.length || 0}`)
      if (profiles && profiles.length > 0) {
        profiles.forEach((profile, index) => {
          console.log(`   ${index + 1}. ID: ${profile.id}, Name: ${profile.display_name || 'Unnamed'}`)
        })
      }
    }

    // Check user_roles table
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(10)

    console.log('\n👑 User Roles table:')
    if (rolesError) {
      console.log(`   ❌ Error: ${rolesError.message}`)
    } else {
      console.log(`   📈 Records found: ${roles?.length || 0}`)
      if (roles && roles.length > 0) {
        roles.forEach((role, index) => {
          console.log(`   ${index + 1}. User ID: ${role.user_id}, Role: ${role.role}`)
        })
      }
    }

    // Check attendance table
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('user_id, clock_in_at, clock_out_at')
      .limit(10)

    console.log('\n⏰ Attendance table:')
    if (attendanceError) {
      console.log(`   ❌ Error: ${attendanceError.message}`)
    } else {
      console.log(`   📈 Records found: ${attendance?.length || 0}`)
      if (attendance && attendance.length > 0) {
        const uniqueUsers = [...new Set(attendance.map(a => a.user_id))]
        console.log(`   👥 Unique users with attendance: ${uniqueUsers.length}`)
        uniqueUsers.forEach((userId, index) => {
          console.log(`   ${index + 1}. User ID: ${userId}`)
        })
      }
    }

    // Check breaks table
    const { data: breaks, error: breaksError } = await supabase
      .from('breaks')
      .select('user_id, type, status')
      .limit(10)

    console.log('\n☕ Breaks table:')
    if (breaksError) {
      console.log(`   ❌ Error: ${breaksError.message}`)
    } else {
      console.log(`   📈 Records found: ${breaks?.length || 0}`)
      if (breaks && breaks.length > 0) {
        const uniqueUsers = [...new Set(breaks.map(b => b.user_id))]
        console.log(`   👥 Unique users with breaks: ${uniqueUsers.length}`)
        uniqueUsers.forEach((userId, index) => {
          console.log(`   ${index + 1}. User ID: ${userId}`)
        })
      }
    }

    // Check teams table
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .limit(10)

    console.log('\n🏢 Teams table:')
    if (teamsError) {
      console.log(`   ❌ Error: ${teamsError.message}`)
    } else {
      console.log(`   📈 Records found: ${teams?.length || 0}`)
      if (teams && teams.length > 0) {
        teams.forEach((team, index) => {
          console.log(`   ${index + 1}. ID: ${team.id}, Name: ${team.name}`)
        })
      }
    }

    console.log('\n📊 Summary:')
    console.log('════════════════════════════════════════════════════════════════════════════════')
    console.log(`👤 Profiles: ${profiles?.length || 0}`)
    console.log(`👑 User Roles: ${roles?.length || 0}`)
    console.log(`⏰ Attendance Records: ${attendance?.length || 0}`)
    console.log(`☕ Break Records: ${breaks?.length || 0}`)
    console.log(`🏢 Teams: ${teams?.length || 0}`)
    console.log('════════════════════════════════════════════════════════════════════════════════')

  } catch (error) {
    console.error('❌ Error checking auth users:', error)
  }
}

// Run the check
checkAuthUsers().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})