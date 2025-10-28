#!/usr/bin/env tsx

/**
 * Direct SQL Application Script
 * 
 * This script applies SQL directly using Supabase's RPC functionality
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applySQLDirect(sqlFilePath?: string) {
  try {
    console.log('🚀 Applying SQL file directly...\n')
    
    const sqlPath = sqlFilePath || join(process.cwd(), 'scripts', 'setup-database.sql')
    const sql = readFileSync(sqlPath, 'utf8')
    
    console.log('📄 Executing complete SQL script...')
    
    // Execute the entire SQL script at once
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      console.error('❌ Error executing SQL:', error)
      process.exit(1)
    }
    
    console.log('✅ SQL executed successfully!')
    console.log('📊 Result:', data)
    
  } catch (error) {
    console.error('\n❌ Error applying SQL:', error)
    process.exit(1)
  }
}

// Run the SQL application
const sqlFilePath = process.argv[2]
applySQLDirect(sqlFilePath).catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})