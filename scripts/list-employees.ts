#!/usr/bin/env tsx

/**
 * Employee Listing Script
 * 
 * This script lists all registered employees in the system
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

async function listEmployees() {
  try {
    console.log('👥 Fetching registered employees...\n')
    
    // Query profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        id,
        display_name,
        team_id,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError.message)
      return
    }

    // Query user_roles table
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        role,
        created_at
      `)

    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError.message)
      return
    }

    // Query teams table
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        name
      `)

    if (teamsError) {
      console.error('❌ Error fetching teams:', teamsError.message)
      return
    }

    // Create a map of teams for easy lookup
    const teamsMap = new Map(teams?.map(team => [team.id, team]) || [])
    
    // Create a map of roles for easy lookup
    const rolesMap = new Map(roles?.map(role => [role.user_id, role]) || [])

    console.log('📊 Employee Registry Summary:')
    console.log('════════════════════════════════════════════════════════════════════════════════')
    console.log(`📈 Total Registered Employees: ${profiles?.length || 0}`)
    console.log(`👑 Total Admin Users: ${roles?.filter(r => r.role === 'admin' || r.role === 'super_admin').length || 0}`)
    console.log(`👤 Total Regular Employees: ${roles?.filter(r => r.role === 'employee').length || 0}`)
    console.log(`🏢 Total Teams: ${teams?.length || 0}`)
    console.log('════════════════════════════════════════════════════════════════════════════════\n')

    if (!profiles || profiles.length === 0) {
      console.log('📝 No employees are currently registered in the system.')
      console.log('   To register employees, they need to:')
      console.log('   1. Sign up through the authentication system')
      console.log('   2. Complete their profile setup')
      console.log('   3. Be assigned to a team (optional)')
      console.log('   4. Have their role assigned by an admin')
      return
    }

    console.log('👥 Registered Employees:')
    console.log('────────────────────────────────────────────────────────────────────────────────')

    profiles.forEach((profile, index) => {
      const role = rolesMap.get(profile.id)
      const team = profile.team_id ? teamsMap.get(profile.team_id) : null
      
      console.log(`${index + 1}. ${profile.display_name || 'Unnamed User'}`)
      console.log(`   🆔 User ID: ${profile.id}`)
      console.log(`   👤 Role: ${role?.role || 'Not assigned'}`)
      console.log(`   🏢 Team: ${team?.name || 'No team assigned'}`)
      console.log(`   📅 Registered: ${new Date(profile.created_at).toLocaleDateString()}`)
      console.log(`   🔄 Last Updated: ${new Date(profile.updated_at).toLocaleDateString()}`)
      console.log('')
    })

    // Show teams information
    if (teams && teams.length > 0) {
      console.log('🏢 Available Teams:')
      console.log('────────────────────────────────────────────────────────────────────────────────')
      teams.forEach((team, index) => {
        const teamEmployees = profiles.filter(p => p.team_id === team.id)
      console.log(`${index + 1}. ${team.name}`)
      console.log(`   👥 Members: ${teamEmployees.length}`)
      console.log('')
      })
    }

  } catch (error) {
    console.error('❌ Error listing employees:', error)
  }
}

// Run the employee listing
listEmployees().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})