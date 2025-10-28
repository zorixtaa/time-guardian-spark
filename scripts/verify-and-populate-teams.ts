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

async function verifyAndPopulateTeams() {
  console.log('🔍 Checking teams table...')
  
  try {
    // First, check if teams table exists and what's in it
    const { data: existingTeams, error: fetchError } = await supabase
      .from('teams')
      .select('*')
    
    if (fetchError) {
      console.error('❌ Error fetching teams:', fetchError)
      return
    }
    
    console.log(`📊 Found ${existingTeams?.length || 0} existing teams`)
    
    if (existingTeams && existingTeams.length > 0) {
      console.log('📋 Existing teams:')
      existingTeams.forEach(team => {
        console.log(`  - ${team.name}: ${team.description}`)
      })
    }
    
    // Check if we have the correct departments
    const correctDepartments = ['HPY', 'GR', 'CG', 'ZZPS']
    const existingNames = existingTeams?.map(t => t.name) || []
    const missingDepartments = correctDepartments.filter(dept => !existingNames.includes(dept))
    
    if (missingDepartments.length > 0) {
      console.log(`🔄 Missing departments: ${missingDepartments.join(', ')}`)
      console.log('📝 Adding missing departments...')
      
      const teamsToInsert = missingDepartments.map(name => ({
        name,
        description: `${name} Department`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
      
      const { data: insertedTeams, error: insertError } = await supabase
        .from('teams')
        .insert(teamsToInsert)
        .select()
      
      if (insertError) {
        console.error('❌ Error inserting teams:', insertError)
        return
      }
      
      console.log('✅ Successfully added teams:', insertedTeams?.map(t => t.name).join(', '))
    } else {
      console.log('✅ All correct departments already exist!')
    }
    
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
    
    console.log('\n✅ Teams verification and population completed!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

verifyAndPopulateTeams()