#!/usr/bin/env tsx

/**
 * Direct Migration Application Script
 * 
 * This script applies migrations directly to the database
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

async function applyMigrations() {
  try {
    console.log('🚀 Applying database migrations...\n')
    
    // List of migration files to apply in order
    const migrations = [
      '20251027094933_ba02419b-9c9f-4469-8786-97ac8464fec6.sql',
      '20251027094952_529caf4c-f2a2-4945-a692-fde0bdcf5da6.sql',
      '20251027095652_87f2b42f-5b8d-4da2-b9f1-945bb67fed3f.sql',
      '20251028000001_fix_breaks_schema.sql',
      '20251028120000_fix_rls_and_superadmin_access.sql',
      '20251028140000_cleanup_profiles_and_fix_breaks.sql',
      '20251028150000_instant_break_system.sql',
      '20251028160000_analytics_functions.sql',
      '20251028170000_configure_google_oauth.sql',
      '20251028180000_break_approval_system.sql',
      '20251028190000_break_entitlements_and_timing.sql',
      '20251028200000_fix_schema_coherence.sql',
      '20251029090000_expand_break_status_enum.sql'
    ]
    
    let successCount = 0
    let errorCount = 0
    
    for (const migration of migrations) {
      try {
        console.log(`📄 Applying migration: ${migration}`)
        
        const migrationPath = join(process.cwd(), 'supabase', 'migrations', migration)
        const sql = readFileSync(migrationPath, 'utf8')
        
        // Split the SQL into individual statements
        const statements = sql
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
        
        for (const statement of statements) {
          if (statement.trim()) {
            try {
              // Use rpc to execute SQL
              const { data, error } = await supabase.rpc('exec_sql', { sql: statement })
              
              if (error) {
                console.warn(`⚠️  Warning in ${migration}: ${error.message}`)
                errorCount++
              } else {
                successCount++
              }
            } catch (err) {
              console.warn(`⚠️  Warning executing statement in ${migration}: ${err}`)
              errorCount++
            }
          }
        }
        
        console.log(`✅ Completed migration: ${migration}`)
        
      } catch (err) {
        console.error(`❌ Error applying migration ${migration}:`, err)
        errorCount++
      }
    }
    
    console.log(`\n📊 Results:`)
    console.log(`   ✅ Successful: ${successCount}`)
    console.log(`   ⚠️  Warnings: ${errorCount}`)
    
    if (errorCount === 0) {
      console.log('\n✅ All migrations applied successfully!')
    } else {
      console.log('\n⚠️  Migrations completed with warnings.')
    }
    
  } catch (error) {
    console.error('\n❌ Error applying migrations:', error)
    process.exit(1)
  }
}

// Run the migrations
applyMigrations().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})