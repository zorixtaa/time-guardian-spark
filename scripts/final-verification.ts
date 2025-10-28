#!/usr/bin/env tsx

/**
 * Final Database Verification Script
 * 
 * This script provides a comprehensive verification of the database state
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

async function finalVerification() {
  try {
    console.log('🔍 Final Database Verification\n')
    
    const tables = [
      'profiles',
      'teams', 
      'attendance',
      'breaks',
      'break_entitlements',
      'entitlement_notifications',
      'xp_ledger',
      'bonus_payouts',
      'gamification_settings',
      'announcements',
      'shifts',
      'user_roles'
    ]
    
    const accessibleTables = []
    const inaccessibleTables = []
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1)
        
        if (error) {
          inaccessibleTables.push(table)
          console.log(`❌ ${table}: ${error.message}`)
        } else {
          accessibleTables.push(table)
          console.log(`✅ ${table}: Accessible`)
        }
      } catch (err) {
        inaccessibleTables.push(table)
        console.log(`❌ ${table}: ${err.message}`)
      }
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`   ✅ Accessible tables: ${accessibleTables.length}`)
    console.log(`   ❌ Inaccessible tables: ${inaccessibleTables.length}`)
    
    if (inaccessibleTables.length > 0) {
      console.log(`\n❌ Missing tables: ${inaccessibleTables.join(', ')}`)
    }
    
    // Test some key functionality
    console.log(`\n🧪 Testing key functionality:`)
    
    // Test profiles table structure
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, team_id, created_at, updated_at')
        .limit(1)
      
      if (profileError) {
        console.log(`❌ Profiles table structure: ${profileError.message}`)
      } else {
        console.log(`✅ Profiles table structure: OK`)
      }
    } catch (err) {
      console.log(`❌ Profiles table structure: ${err.message}`)
    }
    
    // Test breaks table structure
    try {
      const { data: breaksData, error: breaksError } = await supabase
        .from('breaks')
        .select('id, user_id, type, status, started_at, ended_at, created_at, updated_at')
        .limit(1)
      
      if (breaksError) {
        console.log(`❌ Breaks table structure: ${breaksError.message}`)
      } else {
        console.log(`✅ Breaks table structure: OK`)
      }
    } catch (err) {
      console.log(`❌ Breaks table structure: ${err.message}`)
    }
    
    // Test attendance table structure
    try {
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('id, user_id, clock_in_at, clock_out_at, created_at, updated_at')
        .limit(1)
      
      if (attendanceError) {
        console.log(`❌ Attendance table structure: ${attendanceError.message}`)
      } else {
        console.log(`✅ Attendance table structure: OK`)
      }
    } catch (err) {
      console.log(`❌ Attendance table structure: ${err.message}`)
    }
    
    console.log(`\n🎉 Database verification completed!`)
    
    if (accessibleTables.length >= 10) {
      console.log(`✅ Database is mostly functional with ${accessibleTables.length}/12 tables accessible`)
    } else {
      console.log(`⚠️  Database needs more work - only ${accessibleTables.length}/12 tables accessible`)
    }
    
  } catch (error) {
    console.error('\n❌ Error during verification:', error)
    process.exit(1)
  }
}

// Run the verification
finalVerification().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})