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

async function checkTeamsSchema() {
  console.log('🔍 Checking teams table schema...')
  
  try {
    // Try to get the table structure by attempting a simple select
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Error accessing teams table:', error)
      return
    }
    
    console.log('✅ Teams table is accessible')
    console.log('📊 Current data:', data)
    
    // Try to insert a simple record to see what columns are available
    const { data: insertData, error: insertError } = await supabase
      .from('teams')
      .insert([{ name: 'TEST' }])
      .select()
    
    if (insertError) {
      console.error('❌ Error inserting test record:', insertError)
      console.log('This tells us about the table structure')
    } else {
      console.log('✅ Test insert successful:', insertData)
      
      // Clean up test record
      await supabase.from('teams').delete().eq('name', 'TEST')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkTeamsSchema()