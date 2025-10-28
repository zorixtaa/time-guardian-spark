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

async function simpleTeamsInsert() {
  console.log('🔍 Attempting to insert teams with simple approach...')
  
  try {
    // Try to insert teams one by one
    const teams = [
      { name: 'HPY' },
      { name: 'GR' },
      { name: 'CG' },
      { name: 'ZZPS' }
    ]
    
    console.log('📝 Inserting teams one by one...')
    
    for (const team of teams) {
      console.log(`  Inserting ${team.name}...`)
      
      const { data, error } = await supabase
        .from('teams')
        .insert([team])
        .select()
      
      if (error) {
        console.error(`❌ Error inserting ${team.name}:`, error)
      } else {
        console.log(`✅ Successfully inserted ${team.name}`)
      }
    }
    
    // Check final state
    const { data: finalTeams, error: fetchError } = await supabase
      .from('teams')
      .select('*')
      .order('name')
    
    if (fetchError) {
      console.error('❌ Error fetching final teams:', fetchError)
      return
    }
    
    console.log('\n📋 Final teams in database:')
    if (finalTeams && finalTeams.length > 0) {
      finalTeams.forEach(team => {
        console.log(`  - ${team.name}`)
      })
    } else {
      console.log('  No teams found')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

simpleTeamsInsert()