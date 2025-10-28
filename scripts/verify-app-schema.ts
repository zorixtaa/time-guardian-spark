#!/usr/bin/env tsx

/**
 * Application Schema Verification Script
 * 
 * This script verifies that the application tables and functions are working
 * by testing actual queries against the application tables.
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

interface SchemaCheck {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: any
}

const checks: SchemaCheck[] = []

async function testTableAccess(tableName: string, expectedColumns: string[]): Promise<SchemaCheck> {
  try {
    // Try to query the table with a limit to test access
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (error) {
      return {
        name: `Table: ${tableName}`,
        status: 'fail',
        message: `Error accessing table: ${error.message}`
      }
    }
    
    // Check if we can access expected columns
    const availableColumns = data && data.length > 0 ? Object.keys(data[0]) : []
    const missingColumns = expectedColumns.filter(col => !availableColumns.includes(col))
    
    if (missingColumns.length > 0) {
      return {
        name: `Table: ${tableName}`,
        status: 'warning',
        message: `Table accessible but missing columns: ${missingColumns.join(', ')}`
      }
    }
    
    return {
      name: `Table: ${tableName}`,
      status: 'pass',
      message: `Table accessible with all expected columns`
    }
  } catch (error) {
    return {
      name: `Table: ${tableName}`,
      status: 'fail',
      message: `Exception accessing table: ${error}`
    }
  }
}

async function testFunctionAccess(functionName: string, testParams: any[] = []): Promise<SchemaCheck> {
  try {
    const { data, error } = await supabase
      .rpc(functionName, ...testParams)
    
    if (error) {
      return {
        name: `Function: ${functionName}`,
        status: 'fail',
        message: `Error calling function: ${error.message}`
      }
    }
    
    return {
      name: `Function: ${functionName}`,
      status: 'pass',
      message: `Function accessible and callable`
    }
  } catch (error) {
    return {
      name: `Function: ${functionName}`,
      status: 'fail',
      message: `Exception calling function: ${error}`
    }
  }
}

async function testEnumValues(tableName: string, columnName: string, expectedValues: string[]): Promise<SchemaCheck> {
  try {
    // Try to insert a test record with each enum value
    const results = []
    
    for (const value of expectedValues) {
      try {
        const { error } = await supabase
          .from(tableName)
          .insert({ [columnName]: value })
          .select()
        
        if (error) {
          results.push({ value, valid: false, error: error.message })
        } else {
          results.push({ value, valid: true })
        }
      } catch (err) {
        results.push({ value, valid: false, error: err })
      }
    }
    
    const validValues = results.filter(r => r.valid).map(r => r.value)
    const invalidValues = results.filter(r => !r.valid)
    
    if (invalidValues.length === 0) {
      return {
        name: `Enum values for ${tableName}.${columnName}`,
        status: 'pass',
        message: `All expected values valid: ${validValues.join(', ')}`
      }
    } else {
      return {
        name: `Enum values for ${tableName}.${columnName}`,
        status: 'warning',
        message: `Some values invalid: ${invalidValues.map(v => v.value).join(', ')}`
      }
    }
  } catch (error) {
    return {
      name: `Enum values for ${tableName}.${columnName}`,
      status: 'fail',
      message: `Exception testing enum values: ${error}`
    }
  }
}

async function runApplicationSchemaChecks() {
  console.log('🔍 Running application schema verification...\n')

  // Test core tables
  const coreTables = [
    { name: 'profiles', columns: ['id', 'user_id', 'display_name', 'team_id', 'created_at', 'updated_at'] },
    { name: 'teams', columns: ['id', 'name', 'description', 'created_at', 'updated_at'] },
    { name: 'user_roles', columns: ['id', 'user_id', 'role', 'created_at'] },
    { name: 'attendance', columns: ['id', 'user_id', 'clock_in_at', 'clock_out_at', 'created_at', 'updated_at'] },
    { name: 'breaks', columns: ['id', 'user_id', 'type', 'status', 'started_at', 'ended_at', 'created_at', 'updated_at'] },
    { name: 'shifts', columns: ['id', 'name', 'start_time', 'end_time', 'team_id', 'created_at', 'updated_at'] },
    { name: 'announcements', columns: ['id', 'title', 'body', 'created_by', 'team_id', 'created_at', 'updated_at'] },
    { name: 'xp_ledger', columns: ['id', 'user_id', 'points', 'reason', 'created_at'] },
    { name: 'bonus_payouts', columns: ['id', 'user_id', 'amount', 'reason', 'month', 'status', 'created_at', 'updated_at'] },
    { name: 'gamification_settings', columns: ['id', 'setting_key', 'setting_value', 'created_at', 'updated_at'] }
  ]

  for (const table of coreTables) {
    const check = await testTableAccess(table.name, table.columns)
    checks.push(check)
  }

  // Test break entitlements table (if it exists)
  const entitlementsCheck = await testTableAccess('break_entitlements', [
    'id', 'user_id', 'date', 'micro_break_used', 'lunch_break_used', 
    'micro_break_limit', 'lunch_break_limit', 'created_at', 'updated_at'
  ])
  checks.push(entitlementsCheck)

  // Test entitlement notifications table (if it exists)
  const notificationsCheck = await testTableAccess('entitlement_notifications', [
    'id', 'user_id', 'admin_id', 'notification_type', 'entitlement_date', 
    'exceeded_amount', 'acknowledged', 'created_at'
  ])
  checks.push(notificationsCheck)

  // Test utility functions
  const functions = [
    { name: 'get_user_team', params: ['00000000-0000-0000-0000-000000000000'] },
    { name: 'has_role', params: ['00000000-0000-0000-0000-000000000000', 'employee'] }
  ]

  for (const func of functions) {
    const check = await testFunctionAccess(func.name, func.params)
    checks.push(check)
  }

  // Test enum values for breaks table
  const breakTypeCheck = await testEnumValues('breaks', 'type', ['coffee', 'wc', 'lunch'])
  checks.push(breakTypeCheck)

  const breakStatusCheck = await testEnumValues('breaks', 'status', ['active', 'completed'])
  checks.push(breakStatusCheck)

  // Test enum values for user_roles table
  const roleCheck = await testEnumValues('user_roles', 'role', ['super_admin', 'admin', 'employee'])
  checks.push(roleCheck)

  // Print results
  console.log('📊 Application Schema Verification Results:\n')
  
  const passed = checks.filter(c => c.status === 'pass').length
  const failed = checks.filter(c => c.status === 'fail').length
  const warnings = checks.filter(c => c.status === 'warning').length

  for (const check of checks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️'
    console.log(`${icon} ${check.name}: ${check.message}`)
  }

  console.log(`\n📈 Summary:`)
  console.log(`   ✅ Passed: ${passed}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   ⚠️  Warnings: ${warnings}`)

  if (failed > 0) {
    console.log('\n❌ Application schema verification failed.')
    process.exit(1)
  } else if (warnings > 0) {
    console.log('\n⚠️  Application schema verification completed with warnings.')
  } else {
    console.log('\n✅ Application schema verification passed! Database is coherent.')
  }
}

// Run the verification
runApplicationSchemaChecks().catch(error => {
  console.error('❌ Error running application schema verification:', error)
  process.exit(1)
})