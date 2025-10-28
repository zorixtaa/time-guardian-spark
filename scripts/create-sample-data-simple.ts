import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createSampleData() {
  try {
    console.log('🏗️  Creating sample data for dashboard...\n')
    
    // Step 1: Create teams/departments
    console.log('1. Creating teams...')
    
    const teams = [
      { id: '00000000-0000-0000-0000-000000000001', name: 'Engineering Department' },
      { id: '00000000-0000-0000-0000-000000000002', name: 'Sales Department' },
      { id: '00000000-0000-0000-0000-000000000003', name: 'Marketing Department' },
      { id: '00000000-0000-0000-0000-000000000004', name: 'Customer Support Department' }
    ]
    
    for (const team of teams) {
      try {
        const { error } = await supabase
          .from('teams')
          .upsert({
            id: team.id,
            name: team.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (error) {
          console.log(`❌ Failed to create team ${team.name}: ${error.message}`)
        } else {
          console.log(`✅ Created team: ${team.name}`)
        }
      } catch (err: any) {
        console.log(`❌ Error creating team ${team.name}: ${err.message}`)
      }
    }
    
    // Step 2: Verify created data
    console.log('\n2. Verifying created data...')
    
    const { data: teamsData } = await supabase.from('teams').select('*')
    const { data: profilesData } = await supabase.from('profiles').select('*')
    const { data: attendanceData } = await supabase.from('attendance').select('*')
    const { data: breaksData } = await supabase.from('breaks').select('*')
    
    console.log('✅ Final counts:')
    console.log(`   - Teams: ${teamsData?.length || 0}`)
    console.log(`   - Profiles: ${profilesData?.length || 0}`)
    console.log(`   - Attendance: ${attendanceData?.length || 0}`)
    console.log(`   - Breaks: ${breaksData?.length || 0}`)
    
    console.log('\n🎉 Sample data creation completed!')
    console.log('\n📝 Next steps:')
    console.log('1. Run the migration to create sample profiles and data:')
    console.log('   npx supabase db push')
    console.log('2. Log in as superadmin')
    console.log('3. The dashboard should now show:')
    console.log('   - 4 departments')
    console.log('   - Sample profiles and data from migration')
    
  } catch (error: any) {
    console.error('❌ Error creating sample data:', error.message)
    process.exit(1)
  }
}

createSampleData()