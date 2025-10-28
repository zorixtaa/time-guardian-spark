#!/usr/bin/env tsx

/**
 * Table Structure Check Script
 * 
 * This script checks the actual structure of existing tables
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

async function checkTableStructure(tableName: string) {
  try {
    console.log(`\n🔍 Checking structure of table: ${tableName}`)
    
    // Try to get one record to see the structure
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (error) {
      console.log(`❌ Error: ${error.message}`)
      return
    }
    
    if (data && data.length > 0) {
      const columns = Object.keys(data[0])
      console.log(`✅ Columns found: ${columns.join(', ')}`)
      
      // Show sample data
      console.log(`📄 Sample data:`, JSON.stringify(data[0], null, 2))
    } else {
      console.log(`📄 Table is empty, but accessible`)
    }
    
  } catch (error) {
    console.log(`❌ Exception: ${error}`)
  }
}

async function checkAllTables() {
  console.log('🔍 Checking all table structures...\n')
  
  const tables = [
    'profiles',
    'teams', 
    'user_roles',
    'attendance',
    'breaks',
    'shifts',
    'announcements',
    'xp_ledger',
    'bonus_payouts',
    'gamification_settings',
    'break_entitlements',
    'entitlement_notifications'
  ]
  
  for (const table of tables) {
    await checkTableStructure(table)
  }
}

// Run the check
checkAllTables().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})