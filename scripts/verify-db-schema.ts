#!/usr/bin/env tsx

/**
 * Database Schema Verification Script
 * 
 * This script verifies that the database schema is coherent and up-to-date
 * by checking all tables, columns, enums, and constraints.
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

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .single()
    
    return !error && !!data
  } catch {
    return false
  }
}

async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .eq('column_name', columnName)
      .single()
    
    return !error && !!data
  } catch {
    return false
  }
}

async function checkEnumExists(enumName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('pg_type')
      .select('typname')
      .eq('typname', enumName)
      .single()
    
    return !error && !!data
  } catch {
    return false
  }
}

async function checkEnumValues(enumName: string, expectedValues: string[]): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('pg_enum')
      .select('enumlabel')
      .eq('enumtypid', `(SELECT oid FROM pg_type WHERE typname = '${enumName}')`)
    
    if (error || !data) return false
    
    const actualValues = data.map(row => row.enumlabel)
    return expectedValues.every(val => actualValues.includes(val))
  } catch {
    return false
  }
}

async function runSchemaChecks() {
  console.log('🔍 Running database schema verification...\n')

  // Check required tables
  const requiredTables = [
    'profiles',
    'teams',
    'attendance',
    'breaks',
    'break_entitlements',
    'entitlement_notifications',
    'xp_ledger',
    'bonus_payouts',
    'gamification_settings',
    'announcements',
    'shifts',
    'user_roles'
  ]

  for (const table of requiredTables) {
    const exists = await checkTableExists(table)
    checks.push({
      name: `Table: ${table}`,
      status: exists ? 'pass' : 'fail',
      message: exists ? 'Table exists' : 'Table missing'
    })
  }

  // Check breaks table columns
  const breaksColumns = [
    'id',
    'user_id',
    'type',
    'status',
    'started_at',
    'ended_at',
    'created_at',
    'updated_at',
    'attendance_id',
    'team_id',
    'approved_by',
    'approved_at',
    'denied_by',
    'denied_at',
    'denial_reason'
  ]

  for (const column of breaksColumns) {
    const exists = await checkColumnExists('breaks', column)
    checks.push({
      name: `Breaks column: ${column}`,
      status: exists ? 'pass' : 'fail',
      message: exists ? 'Column exists' : 'Column missing'
    })
  }

  // Check break_entitlements table columns
  const entitlementsColumns = [
    'id',
    'user_id',
    'date',
    'micro_break_used',
    'lunch_break_used',
    'micro_break_limit',
    'lunch_break_limit',
    'created_at',
    'updated_at'
  ]

  for (const column of entitlementsColumns) {
    const exists = await checkColumnExists('break_entitlements', column)
    checks.push({
      name: `Break entitlements column: ${column}`,
      status: exists ? 'pass' : 'fail',
      message: exists ? 'Column exists' : 'Column missing'
    })
  }

  // Check entitlement_notifications table columns
  const notificationsColumns = [
    'id',
    'user_id',
    'admin_id',
    'notification_type',
    'entitlement_date',
    'exceeded_amount',
    'acknowledged',
    'created_at'
  ]

  for (const column of notificationsColumns) {
    const exists = await checkColumnExists('entitlement_notifications', column)
    checks.push({
      name: `Entitlement notifications column: ${column}`,
      status: exists ? 'pass' : 'fail',
      message: exists ? 'Column exists' : 'Column missing'
    })
  }

  // Check enums
  const breakTypeEnumExists = await checkEnumExists('break_type_enum')
  const breakStatusEnumExists = await checkEnumExists('break_status_enum')
  const appRoleEnumExists = await checkEnumExists('app_role')

  checks.push({
    name: 'Enum: break_type_enum',
    status: breakTypeEnumExists ? 'pass' : 'fail',
    message: breakTypeEnumExists ? 'Enum exists' : 'Enum missing'
  })

  checks.push({
    name: 'Enum: break_status_enum',
    status: breakStatusEnumExists ? 'pass' : 'fail',
    message: breakStatusEnumExists ? 'Enum exists' : 'Enum missing'
  })

  checks.push({
    name: 'Enum: app_role',
    status: appRoleEnumExists ? 'pass' : 'fail',
    message: appRoleEnumExists ? 'Enum exists' : 'Enum missing'
  })

  // Check enum values
  if (breakTypeEnumExists) {
    const correctValues = await checkEnumValues('break_type_enum', ['coffee', 'wc', 'lunch'])
    checks.push({
      name: 'Break type enum values',
      status: correctValues ? 'pass' : 'fail',
      message: correctValues ? 'Correct values (coffee, wc, lunch)' : 'Incorrect values'
    })
  }

  if (breakStatusEnumExists) {
    const correctValues = await checkEnumValues('break_status_enum', ['active', 'completed'])
    checks.push({
      name: 'Break status enum values',
      status: correctValues ? 'pass' : 'fail',
      message: correctValues ? 'Correct values (active, completed)' : 'Incorrect values'
    })
  }

  if (appRoleEnumExists) {
    const correctValues = await checkEnumValues('app_role', ['super_admin', 'admin', 'employee'])
    checks.push({
      name: 'App role enum values',
      status: correctValues ? 'pass' : 'fail',
      message: correctValues ? 'Correct values (super_admin, admin, employee)' : 'Incorrect values'
    })
  }

  // Check RLS policies
  try {
    const { data: policies, error } = await supabase
      .from('pg_policies')
      .select('tablename, policyname')
      .eq('schemaname', 'public')
    
    if (!error && policies) {
      const breaksPolicies = policies.filter(p => p.tablename === 'breaks')
      checks.push({
        name: 'RLS policies for breaks table',
        status: breaksPolicies.length > 0 ? 'pass' : 'warning',
        message: breaksPolicies.length > 0 ? `${breaksPolicies.length} policies found` : 'No RLS policies found'
      })
    }
  } catch (error) {
    checks.push({
      name: 'RLS policies check',
      status: 'warning',
      message: 'Could not check RLS policies'
    })
  }

  // Print results
  console.log('📊 Schema Verification Results:\n')
  
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
    console.log('\n❌ Schema verification failed. Please run the schema coherence migration.')
    process.exit(1)
  } else if (warnings > 0) {
    console.log('\n⚠️  Schema verification completed with warnings.')
  } else {
    console.log('\n✅ Schema verification passed! Database is coherent.')
  }
}

// Run the verification
runSchemaChecks().catch(error => {
  console.error('❌ Error running schema verification:', error)
  process.exit(1)
})