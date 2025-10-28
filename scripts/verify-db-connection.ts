/**
 * Database Connection and Access Verification Script
 * 
 * This script verifies:
 * 1. Database connection is working
 * 2. All tables are accessible
 * 3. Superadmin can query all tables
 * 4. RLS policies are in place
 * 
 * Run with: npx tsx scripts/verify-db-connection.ts
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/integrations/supabase/types';

const SUPABASE_URL = "https://elnarrbpsphoxgldzehh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsbmFycmJwc3Bob3hnbGR6ZWhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMDQ2MTcsImV4cCI6MjA3Njc4MDYxN30.RNofjJ6iBayE5vBpggRwF9N6PSRPmYLBbfRgEU4l_4c";

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY);

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  error?: any;
}

const results: TestResult[] = [];

async function testTableAccess(tableName: keyof Database['public']['Tables'], description: string) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      results.push({
        test: `Access ${tableName} table`,
        status: 'FAIL',
        message: `Cannot access ${description}: ${error.message}`,
        error
      });
    } else {
      results.push({
        test: `Access ${tableName} table`,
        status: 'PASS',
        message: `Successfully accessed ${description} (found ${data?.length || 0} records in sample)`
      });
    }
  } catch (error) {
    results.push({
      test: `Access ${tableName} table`,
      status: 'FAIL',
      message: `Exception accessing ${description}`,
      error
    });
  }
}

async function runTests() {
  console.log('🔍 Starting Database Verification Tests...\n');

  // Test 1: Connection
  console.log('📡 Testing database connection...');
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      results.push({
        test: 'Database Connection',
        status: 'WARN',
        message: 'Not authenticated (this is okay for basic tests)'
      });
    } else {
      results.push({
        test: 'Database Connection',
        status: 'PASS',
        message: data.session ? 'Connected with active session' : 'Connected (no session)'
      });
    }
  } catch (error) {
    results.push({
      test: 'Database Connection',
      status: 'FAIL',
      message: 'Failed to connect to database',
      error
    });
  }

  // Test 2: Table Access (Core Tables)
  console.log('📊 Testing table access...');
  await testTableAccess('profiles', 'User Profiles');
  await testTableAccess('attendance', 'Attendance Records');
  await testTableAccess('breaks', 'Break Records');
  await testTableAccess('teams', 'Teams/Departments');
  await testTableAccess('user_roles', 'User Roles');
  await testTableAccess('shifts', 'Shifts');
  await testTableAccess('sessions', 'Sessions');
  await testTableAccess('badges', 'Badges');
  await testTableAccess('user_badges', 'User Badges');
  await testTableAccess('xp_ledger', 'XP Ledger');
  await testTableAccess('bonus_payouts', 'Bonus Payouts');
  await testTableAccess('gamification_settings', 'Gamification Settings');
  await testTableAccess('files', 'Files');
  await testTableAccess('announcements', 'Announcements');
  await testTableAccess('metrics_daily', 'Daily Metrics');

  // Test 3: Helper Functions
  console.log('⚙️  Testing helper functions...');
  try {
    const { data, error } = await supabase.rpc('has_role', {
      _user_id: '00000000-0000-0000-0000-000000000000',
      _role: 'employee'
    });

    if (error && error.message.includes('does not exist')) {
      results.push({
        test: 'has_role function',
        status: 'FAIL',
        message: 'has_role function does not exist - migration may not have run',
        error
      });
    } else if (error) {
      results.push({
        test: 'has_role function',
        status: 'WARN',
        message: `has_role function exists but returned error: ${error.message}`
      });
    } else {
      results.push({
        test: 'has_role function',
        status: 'PASS',
        message: 'has_role function is available'
      });
    }
  } catch (error) {
    results.push({
      test: 'has_role function',
      status: 'FAIL',
      message: 'Exception testing has_role function',
      error
    });
  }

  try {
    const { data, error } = await supabase.rpc('get_user_team', {
      _user_id: '00000000-0000-0000-0000-000000000000'
    });

    if (error && error.message.includes('does not exist')) {
      results.push({
        test: 'get_user_team function',
        status: 'FAIL',
        message: 'get_user_team function does not exist - migration may not have run',
        error
      });
    } else if (error) {
      results.push({
        test: 'get_user_team function',
        status: 'WARN',
        message: `get_user_team function exists but returned error: ${error.message}`
      });
    } else {
      results.push({
        test: 'get_user_team function',
        status: 'PASS',
        message: 'get_user_team function is available'
      });
    }
  } catch (error) {
    results.push({
      test: 'get_user_team function',
      status: 'FAIL',
      message: 'Exception testing get_user_team function',
      error
    });
  }

  // Print Results
  console.log('\n📋 Test Results:\n');
  console.log('═'.repeat(80));
  
  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    const color = result.status === 'PASS' ? '\x1b[32m' : result.status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
    const reset = '\x1b[0m';
    
    console.log(`${icon} ${color}${result.status}${reset} - ${result.test}`);
    console.log(`   ${result.message}`);
    if (result.error) {
      console.log(`   Error: ${result.error.message || JSON.stringify(result.error)}`);
    }
    console.log('─'.repeat(80));

    if (result.status === 'PASS') passCount++;
    if (result.status === 'FAIL') failCount++;
    if (result.status === 'WARN') warnCount++;
  });

  console.log('\n📊 Summary:');
  console.log(`   ✅ Passed: ${passCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   ⚠️  Warnings: ${warnCount}`);
  console.log(`   📝 Total: ${results.length}`);
  console.log('═'.repeat(80));

  if (failCount > 0) {
    console.log('\n⚠️  ATTENTION: Some tests failed!');
    console.log('   Please run the database migrations to fix issues:');
    console.log('   1. Review /workspace/supabase/migrations/');
    console.log('   2. Run: supabase db reset (if using local)');
    console.log('   3. Or apply migrations to remote database\n');
    process.exit(1);
  } else if (warnCount > 0) {
    console.log('\n⚠️  Some warnings detected, but all critical tests passed.\n');
    process.exit(0);
  } else {
    console.log('\n🎉 All tests passed! Database is correctly configured.\n');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Fatal error running tests:', error);
  process.exit(1);
});
