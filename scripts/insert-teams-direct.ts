import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
  process.exit(1)
}

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function insertTeamsDirect() {
  console.log('🔍 Inserting teams directly with service role...')
  
  try {
    // First check what's in the table
    const { data: existingTeams, error: fetchError } = await supabase
      .from('teams')
      .select('*')
    
    if (fetchError) {
      console.error('❌ Error fetching teams:', fetchError)
      return
    }
    
    console.log(`📊 Found ${existingTeams?.length || 0} existing teams`)
    
    // Clear existing teams
    if (existingTeams && existingTeams.length > 0) {
      console.log('🗑️ Clearing existing teams...')
      const { error: deleteError } = await supabase
        .from('teams')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
      
      if (deleteError) {
        console.error('❌ Error deleting teams:', deleteError)
        return
      }
    }
    
    // Insert the correct department teams
    const teamsToInsert = [
      { name: 'HPY', description: 'HPY Department' },
      { name: 'GR', description: 'GR Department' },
      { name: 'CG', description: 'CG Department' },
      { name: 'ZZPS', description: 'ZZPS Department' }
    ]
    
    console.log('📝 Inserting teams...')
    const { data: insertedTeams, error: insertError } = await supabase
      .from('teams')
      .insert(teamsToInsert)
      .select()
    
    if (insertError) {
      console.error('❌ Error inserting teams:', insertError)
      return
    }
    
    console.log('✅ Successfully inserted teams:')
    insertedTeams?.forEach(team => {
      console.log(`  - ${team.name}: ${team.description}`)
    })
    
    // Final verification
    const { data: finalTeams, error: finalError } = await supabase
      .from('teams')
      .select('*')
      .order('name')
    
    if (finalError) {
      console.error('❌ Error in final verification:', finalError)
      return
    }
    
    console.log('\n📋 Final teams list:')
    finalTeams?.forEach(team => {
      console.log(`  - ${team.name}: ${team.description}`)
    })
    
    console.log('\n✅ Teams insertion completed successfully!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

insertTeamsDirect()