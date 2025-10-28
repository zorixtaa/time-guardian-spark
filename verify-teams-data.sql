-- Verify teams table data
SELECT 'Teams table verification' as status;

-- Check if teams table exists and has data
SELECT 
    COUNT(*) as total_teams,
    'teams' as table_name
FROM public.teams;

-- Show all teams data
SELECT 
    id,
    name,
    description,
    created_at,
    updated_at
FROM public.teams
ORDER BY name;

-- Check if the specific department codes exist
SELECT 
    name,
    CASE 
        WHEN name IN ('HPY', 'GR', 'CG', 'ZZPS') THEN 'CORRECT'
        ELSE 'INCORRECT'
    END as status
FROM public.teams
ORDER BY name;