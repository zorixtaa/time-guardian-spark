-- ============================================================================
-- FIX TEAMS TABLE STRUCTURE
-- ============================================================================
-- This migration ensures the teams table has the correct structure
-- ============================================================================

-- Check if description column exists, if not add it
DO $$
BEGIN
    -- Check if description column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'teams' 
        AND column_name = 'description'
    ) THEN
        -- Add the description column
        ALTER TABLE public.teams ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to teams table';
    ELSE
        RAISE NOTICE 'Description column already exists in teams table';
    END IF;
END $$;

-- Clear existing data and insert correct teams
DELETE FROM public.teams;

-- Insert the correct department teams
INSERT INTO public.teams (id, name, description, created_at, updated_at) VALUES
(gen_random_uuid(), 'HPY', 'HPY Department', NOW(), NOW()),
(gen_random_uuid(), 'GR', 'GR Department', NOW(), NOW()),
(gen_random_uuid(), 'CG', 'CG Department', NOW(), NOW()),
(gen_random_uuid(), 'ZZPS', 'ZZPS Department', NOW(), NOW());

-- Get team IDs for profiles
DO $$
DECLARE
    hpy_team_id UUID;
    gr_team_id UUID;
    cg_team_id UUID;
    zzps_team_id UUID;
BEGIN
    -- Get team IDs
    SELECT id INTO hpy_team_id FROM public.teams WHERE name = 'HPY' LIMIT 1;
    SELECT id INTO gr_team_id FROM public.teams WHERE name = 'GR' LIMIT 1;
    SELECT id INTO cg_team_id FROM public.teams WHERE name = 'CG' LIMIT 1;
    SELECT id INTO zzps_team_id FROM public.teams WHERE name = 'ZZPS' LIMIT 1;
    
    -- Clear existing profiles
    DELETE FROM public.profiles;
    
    -- Create sample employee profiles
    INSERT INTO public.profiles (id, user_id, display_name, team_id, created_at, updated_at) VALUES
    (gen_random_uuid(), gen_random_uuid(), 'John Smith (HPY)', hpy_team_id, NOW(), NOW()),
    (gen_random_uuid(), gen_random_uuid(), 'Jane Doe (HPY)', hpy_team_id, NOW(), NOW()),
    (gen_random_uuid(), gen_random_uuid(), 'Mike Johnson (GR)', gr_team_id, NOW(), NOW()),
    (gen_random_uuid(), gen_random_uuid(), 'Sarah Wilson (GR)', gr_team_id, NOW(), NOW()),
    (gen_random_uuid(), gen_random_uuid(), 'David Brown (CG)', cg_team_id, NOW(), NOW()),
    (gen_random_uuid(), gen_random_uuid(), 'Lisa Davis (CG)', cg_team_id, NOW(), NOW()),
    (gen_random_uuid(), gen_random_uuid(), 'Tom Wilson (ZZPS)', zzps_team_id, NOW(), NOW()),
    (gen_random_uuid(), gen_random_uuid(), 'Amy Taylor (ZZPS)', zzps_team_id, NOW(), NOW());
    
    RAISE NOTICE 'Sample employee profiles created successfully';
END $$;

-- Verify the data was inserted correctly
DO $$
DECLARE
    team_count INTEGER;
    profile_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO team_count FROM public.teams;
    SELECT COUNT(*) INTO profile_count FROM public.profiles;
    
    IF team_count = 4 AND profile_count = 8 THEN
        RAISE NOTICE 'SUCCESS: Created % teams and % employee profiles', team_count, profile_count;
    ELSE
        RAISE EXCEPTION 'FAILED: Expected 4 teams and 8 profiles, found % teams and % profiles', team_count, profile_count;
    END IF;
END $$;

-- Add comments
COMMENT ON TABLE public.teams IS 'Department teams - HPY, GR, CG, ZZPS';
COMMENT ON TABLE public.profiles IS 'Employee profiles - sample data for admin panel testing';