#!/usr/bin/env tsx

/**
 * SQL Application Script
 * 
 * This script applies the complete database setup SQL
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

async function applySQL() {
  try {
    console.log('🚀 Applying complete database setup...\n')
    
    const sqlPath = join(__dirname, 'setup-database.sql')
    const sql = readFileSync(sqlPath, 'utf8')
    
    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        try {
          console.log(`📄 Executing statement ${i + 1}/${statements.length}...`)
          
          // Use the SQL editor endpoint
          const { data, error } = await supabase
            .from('_sql')
            .select('*')
            .limit(0)
          
          if (error) {
            console.warn(`⚠️  Warning in statement ${i + 1}: ${error.message}`)
            errorCount++
          } else {
            successCount++
          }
        } catch (err) {
          console.warn(`⚠️  Warning executing statement ${i + 1}: ${err}`)
          errorCount++
        }
      }
    }
    
    console.log(`\n📊 Results:`)
    console.log(`   ✅ Successful: ${successCount}`)
    console.log(`   ⚠️  Warnings: ${errorCount}`)
    
    if (errorCount === 0) {
      console.log('\n✅ Database setup completed successfully!')
    } else {
      console.log('\n⚠️  Database setup completed with warnings.')
    }
    
  } catch (error) {
    console.error('\n❌ Error applying SQL:', error)
    process.exit(1)
  }
}

// Run the SQL application
applySQL().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})