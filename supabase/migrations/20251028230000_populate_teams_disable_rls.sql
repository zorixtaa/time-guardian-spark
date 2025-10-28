-- ============================================================================
-- POPULATE TEAMS WITH CORRECT DEPARTMENT DATA (DISABLE RLS TEMPORARILY)
-- ============================================================================
-- This migration temporarily disables RLS to populate teams table with correct data
-- ============================================================================

-- Temporarily disable RLS for teams table
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;

-- Clear any existing team data
DELETE FROM public.teams;

-- Insert the correct department teams
INSERT INTO public.teams (id, name, description, created_at, updated_at) VALUES
(gen_random_uuid(), 'HPY', 'HPY Department', NOW(), NOW()),
(gen_random_uuid(), 'GR', 'GR Department', NOW(), NOW()),
(gen_random_uuid(), 'CG', 'CG Department', NOW(), NOW()),
(gen_random_uuid(), 'ZZPS', 'ZZPS Department', NOW(), NOW());

-- Re-enable RLS for teams table
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for teams (allow all users to read teams)
CREATE POLICY "Allow all users to read teams" ON public.teams
    FOR SELECT USING (true);

-- Create RLS policy for teams (allow authenticated users to insert teams)
CREATE POLICY "Allow authenticated users to insert teams" ON public.teams
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create RLS policy for teams (allow authenticated users to update teams)
CREATE POLICY "Allow authenticated users to update teams" ON public.teams
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Verify the data was inserted correctly
DO $$
DECLARE
    team_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO team_count FROM public.teams;
    
    IF team_count = 4 THEN
        RAISE NOTICE 'SUCCESS: Teams table populated with 4 correct departments (HPY, GR, CG, ZZPS)';
    ELSE
        RAISE EXCEPTION 'FAILED: Expected 4 teams, found %', team_count;
    END IF;
END $$;

-- Add comment
COMMENT ON TABLE public.teams IS 'Department teams - HPY, GR, CG, ZZPS';