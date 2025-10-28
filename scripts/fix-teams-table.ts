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

async function fixTeamsTable() {
  console.log('🔧 Fixing teams table structure...')
  
  try {
    // First, let's try to insert teams without description column
    console.log('📝 Inserting teams without description...')
    
    const teams = [
      { name: 'HPY' },
      { name: 'GR' },
      { name: 'CG' },
      { name: 'ZZPS' }
    ]
    
    const { data: insertedTeams, error: insertError } = await supabase
      .from('teams')
      .insert(teams)
      .select()
    
    if (insertError) {
      console.error('❌ Error inserting teams:', insertError)
      return
    }
    
    console.log('✅ Successfully inserted teams:')
    insertedTeams?.forEach(team => {
      console.log(`  - ${team.name}`)
    })
    
    // Now try to update with description
    console.log('\n📝 Adding descriptions...')
    
    for (const team of insertedTeams || []) {
      const { error: updateError } = await supabase
        .from('teams')
        .update({ description: `${team.name} Department` })
        .eq('id', team.id)
      
      if (updateError) {
        console.log(`⚠️  Could not add description to ${team.name}:`, updateError.message)
      } else {
        console.log(`✅ Added description to ${team.name}`)
      }
    }
    
    // Now create sample profiles
    console.log('\n👥 Creating sample employee profiles...')
    
    const { data: allTeams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
    
    if (teamsError) {
      console.error('❌ Error fetching teams:', teamsError)
      return
    }
    
    const profiles = [
      { display_name: 'John Smith (HPY)', team_id: allTeams?.find(t => t.name === 'HPY')?.id },
      { display_name: 'Jane Doe (HPY)', team_id: allTeams?.find(t => t.name === 'HPY')?.id },
      { display_name: 'Mike Johnson (GR)', team_id: allTeams?.find(t => t.name === 'GR')?.id },
      { display_name: 'Sarah Wilson (GR)', team_id: allTeams?.find(t => t.name === 'GR')?.id },
      { display_name: 'David Brown (CG)', team_id: allTeams?.find(t => t.name === 'CG')?.id },
      { display_name: 'Lisa Davis (CG)', team_id: allTeams?.find(t => t.name === 'CG')?.id },
      { display_name: 'Tom Wilson (ZZPS)', team_id: allTeams?.find(t => t.name === 'ZZPS')?.id },
      { display_name: 'Amy Taylor (ZZPS)', team_id: allTeams?.find(t => t.name === 'ZZPS')?.id }
    ]
    
    const { data: insertedProfiles, error: profilesError } = await supabase
      .from('profiles')
      .insert(profiles)
      .select()
    
    if (profilesError) {
      console.error('❌ Error inserting profiles:', profilesError)
      return
    }
    
    console.log('✅ Successfully inserted profiles:')
    insertedProfiles?.forEach(profile => {
      console.log(`  - ${profile.display_name}`)
    })
    
    // Final verification
    console.log('\n📋 Final verification...')
    
    const { data: finalTeams, error: finalTeamsError } = await supabase
      .from('teams')
      .select('*')
      .order('name')
    
    const { data: finalProfiles, error: finalProfilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('display_name')
    
    if (finalTeamsError) {
      console.error('❌ Error fetching final teams:', finalTeamsError)
    } else {
      console.log(`✅ Final teams count: ${finalTeams?.length || 0}`)
    }
    
    if (finalProfilesError) {
      console.error('❌ Error fetching final profiles:', finalProfilesError)
    } else {
      console.log(`✅ Final profiles count: ${finalProfiles?.length || 0}`)
    }
    
    console.log('\n🎉 Teams and profiles setup completed!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

fixTeamsTable()