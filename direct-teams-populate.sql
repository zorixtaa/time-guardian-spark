-- Direct teams population
INSERT INTO public.teams (id, name, description, created_at, updated_at) VALUES
(gen_random_uuid(), 'HPY', 'HPY Department', NOW(), NOW()),
(gen_random_uuid(), 'GR', 'GR Department', NOW(), NOW()),
(gen_random_uuid(), 'CG', 'CG Department', NOW(), NOW()),
(gen_random_uuid(), 'ZZPS', 'ZZPS Department', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    updated_at = NOW();

-- Verify insertion
SELECT COUNT(*) as team_count FROM public.teams;
SELECT name, description FROM public.teams ORDER BY name;