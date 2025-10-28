#!/usr/bin/env tsx

/**
 * Production Data Check Script
 * 
 * This script checks if there's production data in a different environment
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

async function checkProductionData() {
  try {
    console.log('🏭 Checking for production data...\n')
    console.log(`🔗 Database URL: ${supabaseUrl}`)
    console.log(`🔑 Using key: ${supabaseKey.substring(0, 20)}...`)
    
    // Try to get a session first
    console.log('\n🔐 Checking authentication...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.log(`   ⚠️  Session error: ${sessionError.message}`)
    } else {
      console.log(`   👤 Current session: ${session ? 'Active' : 'None'}`)
      if (session?.user) {
        console.log(`   📧 User email: ${session.user.email}`)
        console.log(`   🆔 User ID: ${session.user.id}`)
      }
    }

    // Try to sign in as a test user to see if there's data
    console.log('\n🔍 Attempting to find user data through different methods...')
    
    // Method 1: Check if we can access auth users through RPC
    try {
      const { data: authUsers, error: authError } = await supabase
        .rpc('get_auth_users')
      
      if (authError) {
        console.log(`   ❌ RPC get_auth_users failed: ${authError.message}`)
      } else {
        console.log(`   ✅ Found ${authUsers?.length || 0} auth users via RPC`)
        if (authUsers && authUsers.length > 0) {
          authUsers.forEach((user: any, index: number) => {
            console.log(`   ${index + 1}. ${user.email} (${user.id})`)
          })
        }
      }
    } catch (err) {
      console.log(`   ❌ RPC method failed: ${err}`)
    }

    // Method 2: Check if there are any functions that return user data
    try {
      const { data: userData, error: userError } = await supabase
        .rpc('get_all_users')
      
      if (userError) {
        console.log(`   ❌ RPC get_all_users failed: ${userError.message}`)
      } else {
        console.log(`   ✅ Found ${userData?.length || 0} users via get_all_users`)
        if (userData && userData.length > 0) {
          userData.forEach((user: any, index: number) => {
            console.log(`   ${index + 1}. ${user.display_name || user.email} (${user.id})`)
          })
        }
      }
    } catch (err) {
      console.log(`   ❌ get_all_users RPC failed: ${err}`)
    }

    // Method 3: Check if there's data in a different schema
    console.log('\n🔍 Checking different schemas...')
    
    const schemas = ['public', 'auth', 'storage']
    
    for (const schema of schemas) {
      try {
        const { data, error } = await supabase
          .from(`${schema}.profiles`)
          .select('*')
          .limit(5)
        
        if (error) {
          console.log(`   ❌ ${schema}.profiles: ${error.message}`)
        } else {
          console.log(`   ✅ ${schema}.profiles: ${data?.length || 0} records`)
          if (data && data.length > 0) {
            data.forEach((profile: any, index: number) => {
              console.log(`      ${index + 1}. ${profile.display_name || profile.id}`)
            })
          }
        }
      } catch (err) {
        console.log(`   ❌ ${schema}.profiles: ${err}`)
      }
    }

    // Method 4: Check if there are any views
    console.log('\n🔍 Checking for views...')
    
    try {
      const { data: views, error: viewsError } = await supabase
        .from('information_schema.views')
        .select('table_name')
        .eq('table_schema', 'public')
      
      if (viewsError) {
        console.log(`   ❌ Views check failed: ${viewsError.message}`)
      } else {
        console.log(`   📊 Found ${views?.length || 0} views in public schema`)
        if (views && views.length > 0) {
          views.forEach((view: any, index: number) => {
            console.log(`   ${index + 1}. ${view.table_name}`)
          })
        }
      }
    } catch (err) {
      console.log(`   ❌ Views check failed: ${err}`)
    }

    // Method 5: Try to find the specific employees by searching all text fields
    console.log('\n🔍 Searching for specific names in all text fields...')
    
    const searchTerms = ['zori', 'zorino', 'badr', 'fatine']
    
    for (const term of searchTerms) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('display_name', `%${term}%`)
        
        if (error) {
          console.log(`   ❌ Search for "${term}" failed: ${error.message}`)
        } else {
          console.log(`   🔍 Search for "${term}": ${data?.length || 0} results`)
          if (data && data.length > 0) {
            data.forEach((profile: any, index: number) => {
              console.log(`      ${index + 1}. ${profile.display_name} (${profile.id})`)
            })
          }
        }
      } catch (err) {
        console.log(`   ❌ Search for "${term}" failed: ${err}`)
      }
    }

    console.log('\n📊 Summary:')
    console.log('════════════════════════════════════════════════════════════════════════════════')
    console.log('The database appears to be empty of user data.')
    console.log('This could mean:')
    console.log('1. The employees are in a different database/environment')
    console.log('2. The data is in a different schema or table structure')
    console.log('3. We need different permissions or a service role key')
    console.log('4. The employees exist in Supabase Auth but not in the custom tables')
    console.log('════════════════════════════════════════════════════════════════════════════════')

  } catch (error) {
    console.error('❌ Error checking production data:', error)
  }
}

// Run the check
checkProductionData().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})