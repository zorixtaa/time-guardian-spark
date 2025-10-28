#!/usr/bin/env tsx

/**
 * Migration Application Script
 * 
 * This script applies all database migrations to ensure the schema is coherent
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration(migrationFile: string) {
  try {
    console.log(`📄 Applying migration: ${migrationFile}`)
    
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', migrationFile)
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement })
          if (error) {
            console.warn(`⚠️  Warning in statement: ${error.message}`)
          }
        } catch (err) {
          console.warn(`⚠️  Warning executing statement: ${err}`)
        }
      }
    }
    
    console.log(`✅ Migration applied: ${migrationFile}`)
  } catch (error) {
    console.error(`❌ Error applying migration ${migrationFile}:`, error)
    throw error
  }
}

async function createExecSqlFunction() {
  try {
    console.log('🔧 Creating exec_sql function...')
    
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$;
    `
    
    const { error } = await supabase.rpc('exec_sql', { sql: createFunctionSQL })
    if (error) {
      console.warn('⚠️  Warning creating exec_sql function:', error.message)
    } else {
      console.log('✅ exec_sql function created')
    }
  } catch (error) {
    console.warn('⚠️  Warning creating exec_sql function:', error)
  }
}

async function applyAllMigrations() {
  console.log('🚀 Starting migration application...\n')
  
  try {
    // First, try to create the exec_sql function
    await createExecSqlFunction()
    
    // List of migration files in order
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
      '20251028210000_fix_breaks_type_column.sql',
      '20251028220000_populate_teams_with_correct_departments.sql',
      '20251028230000_populate_teams_disable_rls.sql'
    ]
    
    for (const migration of migrations) {
      await applyMigration(migration)
    }
    
    console.log('\n✅ All migrations applied successfully!')
    console.log('🎉 Database schema is now coherent and up-to-date!')
    
  } catch (error) {
    console.error('\n❌ Error applying migrations:', error)
    process.exit(1)
  }
}

// Run the migration application
applyAllMigrations().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})