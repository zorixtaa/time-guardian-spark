#!/usr/bin/env tsx

/**
 * Simple Database Schema Verification Script
 * 
 * This script verifies the database schema using direct SQL queries
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

async function verifySchema() {
  try {
    console.log('🔍 Verifying database schema...\n')
    
    // Check if we can query the profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (profilesError) {
      console.log('❌ Profiles table: Not accessible or missing')
    } else {
      console.log('✅ Profiles table: Accessible')
    }
    
    // Check if we can query the teams table
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id')
      .limit(1)
    
    if (teamsError) {
      console.log('❌ Teams table: Not accessible or missing')
    } else {
      console.log('✅ Teams table: Accessible')
    }
    
    // Check if we can query the attendance table
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('id')
      .limit(1)
    
    if (attendanceError) {
      console.log('❌ Attendance table: Not accessible or missing')
    } else {
      console.log('✅ Attendance table: Accessible')
    }
    
    // Check if we can query the breaks table
    const { data: breaks, error: breaksError } = await supabase
      .from('breaks')
      .select('id')
      .limit(1)
    
    if (breaksError) {
      console.log('❌ Breaks table: Not accessible or missing')
    } else {
      console.log('✅ Breaks table: Accessible')
    }
    
    // Check if we can query the break_entitlements table
    const { data: entitlements, error: entitlementsError } = await supabase
      .from('break_entitlements')
      .select('id')
      .limit(1)
    
    if (entitlementsError) {
      console.log('❌ Break entitlements table: Not accessible or missing')
    } else {
      console.log('✅ Break entitlements table: Accessible')
    }
    
    // Check if we can query the entitlement_notifications table
    const { data: notifications, error: notificationsError } = await supabase
      .from('entitlement_notifications')
      .select('id')
      .limit(1)
    
    if (notificationsError) {
      console.log('❌ Entitlement notifications table: Not accessible or missing')
    } else {
      console.log('✅ Entitlement notifications table: Accessible')
    }
    
    // Check if we can query the xp_ledger table
    const { data: xpLedger, error: xpLedgerError } = await supabase
      .from('xp_ledger')
      .select('id')
      .limit(1)
    
    if (xpLedgerError) {
      console.log('❌ XP ledger table: Not accessible or missing')
    } else {
      console.log('✅ XP ledger table: Accessible')
    }
    
    // Check if we can query the bonus_payouts table
    const { data: bonusPayouts, error: bonusPayoutsError } = await supabase
      .from('bonus_payouts')
      .select('id')
      .limit(1)
    
    if (bonusPayoutsError) {
      console.log('❌ Bonus payouts table: Not accessible or missing')
    } else {
      console.log('✅ Bonus payouts table: Accessible')
    }
    
    // Check if we can query the gamification_settings table
    const { data: gamificationSettings, error: gamificationSettingsError } = await supabase
      .from('gamification_settings')
      .select('id')
      .limit(1)
    
    if (gamificationSettingsError) {
      console.log('❌ Gamification settings table: Not accessible or missing')
    } else {
      console.log('✅ Gamification settings table: Accessible')
    }
    
    // Check if we can query the announcements table
    const { data: announcements, error: announcementsError } = await supabase
      .from('announcements')
      .select('id')
      .limit(1)
    
    if (announcementsError) {
      console.log('❌ Announcements table: Not accessible or missing')
    } else {
      console.log('✅ Announcements table: Accessible')
    }
    
    // Check if we can query the shifts table
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('id')
      .limit(1)
    
    if (shiftsError) {
      console.log('❌ Shifts table: Not accessible or missing')
    } else {
      console.log('✅ Shifts table: Accessible')
    }
    
    // Check if we can query the user_roles table
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('id')
      .limit(1)
    
    if (userRolesError) {
      console.log('❌ User roles table: Not accessible or missing')
    } else {
      console.log('✅ User roles table: Accessible')
    }
    
    console.log('\n🎉 Schema verification completed!')
    
  } catch (error) {
    console.error('\n❌ Error verifying schema:', error)
    process.exit(1)
  }
}

// Run the verification
verifySchema().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})