#!/usr/bin/env tsx

/**
 * Execute SQL Script
 * 
 * This script executes SQL using Supabase's SQL editor functionality
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

async function executeSQL(sqlFilePath?: string) {
  try {
    console.log('🚀 Executing SQL file...\n')
    
    const sqlPath = sqlFilePath || join(process.cwd(), 'scripts', 'setup-database.sql')
    const sql = readFileSync(sqlPath, 'utf8')
    
    console.log('📄 Executing SQL script...')
    
    // Use the SQL editor endpoint to execute the SQL
    const { data, error } = await supabase
      .from('_sql')
      .select('*')
      .limit(0)
    
    // Actually, let's try using the REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({ sql_query: sql })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error executing SQL:', errorText)
      process.exit(1)
    }
    
    const result = await response.json()
    console.log('✅ SQL executed successfully!')
    console.log('📊 Result:', result)
    
  } catch (error) {
    console.error('\n❌ Error executing SQL:', error)
    process.exit(1)
  }
}

// Run the SQL execution
const sqlFilePath = process.argv[2]
executeSQL(sqlFilePath).catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})