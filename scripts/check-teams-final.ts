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

async function checkTeamsFinal() {
  console.log('🔍 Final check of teams table...')
  
  try {
    // Try to get teams data without description column
    const { data, error } = await supabase
      .from('teams')
      .select('id, name, created_at, updated_at')
    
    if (error) {
      console.error('❌ Error fetching teams:', error)
      return
    }
    
    console.log(`📊 Found ${data?.length || 0} teams`)
    
    if (data && data.length > 0) {
      console.log('📋 Teams data:')
      data.forEach(team => {
        console.log(`  - ${team.name} (ID: ${team.id})`)
      })
      
      // Check if we have the correct departments
      const correctDepartments = ['HPY', 'GR', 'CG', 'ZZPS']
      const existingNames = data.map(t => t.name)
      const missingDepartments = correctDepartments.filter(dept => !existingNames.includes(dept))
      
      if (missingDepartments.length === 0) {
        console.log('✅ All correct departments are present!')
      } else {
        console.log(`❌ Missing departments: ${missingDepartments.join(', ')}`)
      }
    } else {
      console.log('❌ No teams found in database')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkTeamsFinal()