-- ============================================================================
-- POPULATE TEAMS WITH CORRECT DEPARTMENT DATA
-- ============================================================================
-- This migration populates the teams table with the correct department codes
-- HPY, GR, CG, ZZPS as specified by the user
-- ============================================================================

-- Clear any existing team data
DELETE FROM public.teams;

-- Insert the correct department teams
INSERT INTO public.teams (id, name, description, created_at, updated_at) VALUES
(gen_random_uuid(), 'HPY', 'HPY Department', NOW(), NOW()),
(gen_random_uuid(), 'GR', 'GR Department', NOW(), NOW()),
(gen_random_uuid(), 'CG', 'CG Department', NOW(), NOW()),
(gen_random_uuid(), 'ZZPS', 'ZZPS Department', NOW(), NOW());

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