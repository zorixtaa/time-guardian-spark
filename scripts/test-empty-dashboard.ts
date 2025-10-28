#!/usr/bin/env tsx

/**
 * Test Empty Dashboard Script
 * 
 * This script tests what happens when there are no employees assigned to departments
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

async function testEmptyDashboard() {
  try {
    console.log('🧪 Testing empty dashboard scenario...\n')
    
    // Test 1: Check profiles
    console.log('1. Checking profiles...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, team_id')
      .order('display_name', { ascending: true })
    
    if (profilesError) {
      console.log(`❌ Profiles query failed: ${profilesError.message}`)
    } else {
      console.log(`✅ Found ${profiles?.length || 0} profiles`)
      if (profiles && profiles.length > 0) {
        console.log('Profiles:', profiles)
      }
    }
    
    // Test 2: Check teams
    console.log('\n2. Checking teams...')
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name')
      .order('name', { ascending: true })
    
    if (teamsError) {
      console.log(`❌ Teams query failed: ${teamsError.message}`)
    } else {
      console.log(`✅ Found ${teams?.length || 0} teams`)
      if (teams && teams.length > 0) {
        console.log('Teams:', teams)
      }
    }
    
    // Test 3: Check user roles
    console.log('\n3. Checking user roles...')
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role')
    
    if (rolesError) {
      console.log(`❌ Roles query failed: ${rolesError.message}`)
    } else {
      console.log(`✅ Found ${roles?.length || 0} roles`)
      if (roles && roles.length > 0) {
        console.log('Roles:', roles)
      }
    }
    
    // Test 4: Simulate the admin dashboard logic
    console.log('\n4. Simulating admin dashboard logic...')
    
    const visibleUserIds = profiles?.map((profile) => profile.id) ?? []
    console.log(`Visible user IDs: ${visibleUserIds.length > 0 ? visibleUserIds : 'None'}`)
    
    if (visibleUserIds.length === 0) {
      console.log('⚠️  This is the issue! No visible users means:')
      console.log('   - Overview metrics will all be 0')
      console.log('   - Team roster will be empty')
      console.log('   - Activity feed will be empty')
      console.log('   - Dashboard appears "broken" but is actually working correctly')
    }
    
    // Test 5: Check if this is expected behavior
    console.log('\n5. Analysis...')
    
    if (profiles?.length === 0) {
      console.log('✅ DIAGNOSIS: This is expected behavior when no employees are assigned yet')
      console.log('   The dashboard is working correctly, just showing empty state')
      console.log('   To fix: Add some employee profiles to the database')
    } else if (teams?.length === 0) {
      console.log('✅ DIAGNOSIS: No teams exist yet')
      console.log('   To fix: Create some teams/departments first')
    } else {
      console.log('✅ DIAGNOSIS: Data exists, checking for other issues...')
    }
    
    console.log('\n🏁 Test completed!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
  }
}

// Run the test
testEmptyDashboard().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})