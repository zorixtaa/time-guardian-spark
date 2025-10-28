#!/usr/bin/env tsx

/**
 * Test Superadmin Access Script
 * 
 * This script tests superadmin access and creates test data
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

async function testSuperadminAccess() {
  try {
    console.log('🔍 Testing superadmin access...\n')
    
    // Test 1: Check if we can connect to the database
    console.log('1. Testing database connection...')
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError.message)
      return
    }
    console.log('✅ Database connection successful')
    
    // Test 2: Check if tables exist
    console.log('\n2. Checking table existence...')
    const tables = ['profiles', 'teams', 'attendance', 'breaks', 'user_roles']
    
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1)
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`)
        } else {
          console.log(`✅ Table ${table}: exists`)
        }
      } catch (err) {
        console.log(`❌ Table ${table}: ${err}`)
      }
    }
    
    // Test 3: Check if we can create a test profile
    console.log('\n3. Testing profile creation...')
    const testUserId = '00000000-0000-0000-0000-000000000001'
    
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: testUserId,
          display_name: 'Test Superadmin',
          team_id: null
        })
      
      if (profileError) {
        console.log(`❌ Profile creation failed: ${profileError.message}`)
      } else {
        console.log('✅ Profile creation successful')
      }
    } catch (err) {
      console.log(`❌ Profile creation error: ${err}`)
    }
    
    // Test 4: Check if we can create a superadmin role
    console.log('\n4. Testing superadmin role creation...')
    
    try {
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: testUserId,
          role: 'super_admin'
        })
      
      if (roleError) {
        console.log(`❌ Role creation failed: ${roleError.message}`)
      } else {
        console.log('✅ Superadmin role creation successful')
      }
    } catch (err) {
      console.log(`❌ Role creation error: ${err}`)
    }
    
    // Test 5: Test the has_role function
    console.log('\n5. Testing has_role function...')
    
    try {
      const { data: roleCheck, error: roleCheckError } = await supabase
        .rpc('has_role', {
          _user_id: testUserId,
          _role: 'super_admin'
        })
      
      if (roleCheckError) {
        console.log(`❌ Role check failed: ${roleCheckError.message}`)
      } else {
        console.log(`✅ Role check result: ${roleCheck}`)
      }
    } catch (err) {
      console.log(`❌ Role check error: ${err}`)
    }
    
    // Test 6: Test profile query with RLS
    console.log('\n6. Testing profile query with RLS...')
    
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(5)
      
      if (profilesError) {
        console.log(`❌ Profile query failed: ${profilesError.message}`)
      } else {
        console.log(`✅ Profile query successful, found ${profiles?.length || 0} profiles`)
        if (profiles && profiles.length > 0) {
          console.log('Sample profile:', profiles[0])
        }
      }
    } catch (err) {
      console.log(`❌ Profile query error: ${err}`)
    }
    
    console.log('\n🏁 Test completed!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
  }
}

// Run the test
testSuperadminAccess().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})