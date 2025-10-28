-- Final teams population with correct department data
-- This script will populate the teams table with HPY, GR, CG, ZZPS

-- Clear existing teams
DELETE FROM public.teams;

-- Insert the correct department teams
INSERT INTO public.teams (id, name, description, created_at, updated_at) VALUES
(gen_random_uuid(), 'HPY', 'HPY Department', NOW(), NOW()),
(gen_random_uuid(), 'GR', 'GR Department', NOW(), NOW()),
(gen_random_uuid(), 'CG', 'CG Department', NOW(), NOW()),
(gen_random_uuid(), 'ZZPS', 'ZZPS Department', NOW(), NOW());

-- Verify the insertion
SELECT 'Teams populated successfully' as status;
SELECT COUNT(*) as total_teams FROM public.teams;
SELECT name, description FROM public.teams ORDER BY name;