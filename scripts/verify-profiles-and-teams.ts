import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyProfilesAndTeams() {
  console.log('🔍 Verifying profiles and teams data...')
  
  try {
    // Check teams first
    console.log('\n📊 Checking teams...')
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .order('name')
    
    if (teamsError) {
      console.error('❌ Error fetching teams:', teamsError)
    } else {
      console.log(`✅ Found ${teams?.length || 0} teams`)
      if (teams && teams.length > 0) {
        teams.forEach(team => {
          console.log(`  - ${team.name}: ${team.description}`)
        })
      }
    }
    
    // Check profiles
    console.log('\n👥 Checking profiles...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('display_name')
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError)
    } else {
      console.log(`✅ Found ${profiles?.length || 0} profiles`)
      if (profiles && profiles.length > 0) {
        profiles.forEach(profile => {
          console.log(`  - ${profile.display_name} (Team: ${profile.team_id})`)
        })
      }
    }
    
    // Check if we can insert test data
    console.log('\n🧪 Testing data insertion...')
    
    // Try to insert a test team
    const { data: testTeam, error: testTeamError } = await supabase
      .from('teams')
      .insert([{ name: 'TEST_TEAM', description: 'Test Team' }])
      .select()
    
    if (testTeamError) {
      console.error('❌ Error inserting test team:', testTeamError)
    } else {
      console.log('✅ Successfully inserted test team')
      
      // Clean up test team
      await supabase.from('teams').delete().eq('name', 'TEST_TEAM')
      console.log('✅ Cleaned up test team')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

verifyProfilesAndTeams()