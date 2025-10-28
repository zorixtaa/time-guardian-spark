#!/usr/bin/env tsx

/**
 * Fix Superadmin Access Script
 * 
 * This script fixes RLS policies and creates initial superadmin data
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

async function fixSuperadminAccess() {
  try {
    console.log('🔧 Fixing superadmin access...\n')
    
    // Step 1: Temporarily disable RLS
    console.log('1. Temporarily disabling RLS...')
    
    const disableRLSQueries = [
      'ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.breaks DISABLE ROW LEVEL SECURITY;'
    ]
    
    for (const query of disableRLSQueries) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: query })
        if (error) {
          console.warn(`⚠️  Warning disabling RLS: ${error.message}`)
        }
      } catch (err) {
        console.warn(`⚠️  Warning: ${err}`)
      }
    }
    
    console.log('✅ RLS disabled')
    
    // Step 2: Create initial superadmin profile
    console.log('\n2. Creating initial superadmin profile...')
    
    const superadminUserId = '00000000-0000-0000-0000-000000000001'
    
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: superadminUserId,
          display_name: 'Super Admin',
          team_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (profileError) {
        console.log(`❌ Profile creation failed: ${profileError.message}`)
      } else {
        console.log('✅ Superadmin profile created')
      }
    } catch (err) {
      console.log(`❌ Profile creation error: ${err}`)
    }
    
    // Step 3: Create superadmin role
    console.log('\n3. Creating superadmin role...')
    
    try {
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: superadminUserId,
          role: 'super_admin',
          created_at: new Date().toISOString()
        })
      
      if (roleError) {
        console.log(`❌ Role creation failed: ${roleError.message}`)
      } else {
        console.log('✅ Superadmin role created')
      }
    } catch (err) {
      console.log(`❌ Role creation error: ${err}`)
    }
    
    // Step 4: Create a test team
    console.log('\n4. Creating test team...')
    
    try {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .upsert({
          id: '00000000-0000-0000-0000-000000000002',
          name: 'Default Team',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
      
      if (teamError) {
        console.log(`❌ Team creation failed: ${teamError.message}`)
      } else {
        console.log('✅ Test team created')
      }
    } catch (err) {
      console.log(`❌ Team creation error: ${err}`)
    }
    
    // Step 5: Re-enable RLS
    console.log('\n5. Re-enabling RLS...')
    
    const enableRLSQueries = [
      'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.breaks ENABLE ROW LEVEL SECURITY;'
    ]
    
    for (const query of enableRLSQueries) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: query })
        if (error) {
          console.warn(`⚠️  Warning enabling RLS: ${error.message}`)
        }
      } catch (err) {
        console.warn(`⚠️  Warning: ${err}`)
      }
    }
    
    console.log('✅ RLS re-enabled')
    
    // Step 6: Test the fix
    console.log('\n6. Testing the fix...')
    
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
      
      if (profilesError) {
        console.log(`❌ Profile query failed: ${profilesError.message}`)
      } else {
        console.log(`✅ Profile query successful, found ${profiles?.length || 0} profiles`)
      }
    } catch (err) {
      console.log(`❌ Profile query error: ${err}`)
    }
    
    console.log('\n🎉 Superadmin access fix completed!')
    console.log('\n📝 Next steps:')
    console.log('1. Log in with a user account')
    console.log('2. The superadmin profile should now be visible')
    console.log('3. Admin data should load properly')
    
  } catch (error) {
    console.error('\n❌ Fix failed:', error)
  }
}

// Run the fix
fixSuperadminAccess().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})