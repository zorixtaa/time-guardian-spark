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

async function executeSQLDirect() {
  console.log('🔍 Executing SQL directly to populate teams...')
  
  try {
    // Try to execute SQL directly using rpc
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Clear existing teams
        DELETE FROM public.teams;
        
        -- Insert the correct department teams
        INSERT INTO public.teams (id, name, description, created_at, updated_at) VALUES
        (gen_random_uuid(), 'HPY', 'HPY Department', NOW(), NOW()),
        (gen_random_uuid(), 'GR', 'GR Department', NOW(), NOW()),
        (gen_random_uuid(), 'CG', 'CG Department', NOW(), NOW()),
        (gen_random_uuid(), 'ZZPS', 'ZZPS Department', NOW(), NOW());
        
        -- Verify the insertion
        SELECT COUNT(*) as total_teams FROM public.teams;
      `
    })
    
    if (error) {
      console.error('❌ Error executing SQL:', error)
      return
    }
    
    console.log('✅ SQL executed successfully')
    console.log('📊 Result:', data)
    
    // Now try to fetch the teams
    const { data: teams, error: fetchError } = await supabase
      .from('teams')
      .select('*')
      .order('name')
    
    if (fetchError) {
      console.error('❌ Error fetching teams after insert:', fetchError)
      return
    }
    
    console.log('\n📋 Teams in database:')
    teams?.forEach(team => {
      console.log(`  - ${team.name}: ${team.description}`)
    })
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

executeSQLDirect()