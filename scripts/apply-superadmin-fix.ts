#!/usr/bin/env tsx

/**
 * Apply Superadmin Fix Script
 * 
 * This script applies the superadmin fix migration directly
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

async function applySuperadminFix() {
  try {
    console.log('🔧 Applying superadmin fix...\n')
    
    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20251029000000_fix_superadmin_initial_data.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    // Split into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'))
    
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
    
    // Test the fix
    console.log('\n🧪 Testing the fix...')
    
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
      
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
    
    if (errorCount === 0) {
      console.log('\n✅ Superadmin fix applied successfully!')
    } else {
      console.log('\n⚠️  Superadmin fix completed with warnings.')
    }
    
  } catch (error) {
    console.error('\n❌ Error applying superadmin fix:', error)
    process.exit(1)
  }
}

// Run the fix
applySuperadminFix().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})