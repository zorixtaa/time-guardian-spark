#!/usr/bin/env tsx

/**
 * Table Insert Test Script
 * 
 * This script tests inserting data into tables to understand their structure
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

async function testTableInsert(tableName: string, testData: any) {
  try {
    console.log(`\n🔍 Testing insert into table: ${tableName}`)
    console.log(`📄 Test data:`, JSON.stringify(testData, null, 2))
    
    const { data, error } = await supabase
      .from(tableName)
      .insert(testData)
      .select()
    
    if (error) {
      console.log(`❌ Error: ${error.message}`)
      console.log(`📋 Error details:`, error)
      return false
    }
    
    console.log(`✅ Success! Inserted data:`, JSON.stringify(data, null, 2))
    return true
    
  } catch (error) {
    console.log(`❌ Exception: ${error}`)
    return false
  }
}

async function testAllTables() {
  console.log('🔍 Testing table inserts to understand structure...\n')
  
  // Test profiles table
  await testTableInsert('profiles', {
    id: '00000000-0000-0000-0000-000000000000',
    user_id: '00000000-0000-0000-0000-000000000000',
    display_name: 'Test User',
    team_id: null
  })
  
  // Test teams table
  await testTableInsert('teams', {
    name: 'Test Team',
    description: 'Test team description'
  })
  
  // Test user_roles table
  await testTableInsert('user_roles', {
    user_id: '00000000-0000-0000-0000-000000000000',
    role: 'employee'
  })
  
  // Test attendance table
  await testTableInsert('attendance', {
    user_id: '00000000-0000-0000-0000-000000000000',
    clock_in_at: new Date().toISOString(),
    clock_out_at: null
  })
  
  // Test breaks table
  await testTableInsert('breaks', {
    user_id: '00000000-0000-0000-0000-000000000000',
    type: 'coffee',
    status: 'active'
  })
  
  // Test shifts table
  await testTableInsert('shifts', {
    name: 'Test Shift',
    start_time: '09:00:00',
    end_time: '17:00:00'
  })
  
  // Test announcements table
  await testTableInsert('announcements', {
    title: 'Test Announcement',
    body: 'Test announcement body',
    created_by: '00000000-0000-0000-0000-000000000000'
  })
  
  // Test xp_ledger table
  await testTableInsert('xp_ledger', {
    user_id: '00000000-0000-0000-0000-000000000000',
    points: 10,
    reason: 'Test XP'
  })
  
  // Test bonus_payouts table
  await testTableInsert('bonus_payouts', {
    user_id: '00000000-0000-0000-0000-000000000000',
    amount: 100.00,
    reason: 'Test bonus',
    month: '2025-10-01'
  })
}

// Run the tests
testAllTables().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})