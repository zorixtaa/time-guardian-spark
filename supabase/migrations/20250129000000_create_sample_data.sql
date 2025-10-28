-- Create sample data for testing the admin dashboard
-- This migration bypasses RLS policies

-- Create teams/departments
INSERT INTO teams (id, name, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Engineering Department', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', 'Sales Department', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Marketing Department', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000004', 'Customer Support Department', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Create employee profiles
INSERT INTO profiles (id, name, email, role, team_id, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000011', 'Alice Johnson', 'alice@company.com', 'employee', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000012', 'Bob Smith', 'bob@company.com', 'admin', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000013', 'Carol Davis', 'carol@company.com', 'employee', '00000000-0000-0000-0000-000000000002', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000014', 'David Wilson', 'david@company.com', 'employee', '00000000-0000-0000-0000-000000000003', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000015', 'Eva Brown', 'eva@company.com', 'admin', '00000000-0000-0000-0000-000000000004', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000016', 'Frank Miller', 'frank@company.com', 'employee', '00000000-0000-0000-0000-000000000002', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000017', 'Grace Lee', 'grace@company.com', 'employee', '00000000-0000-0000-0000-000000000003', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000010', 'Super Admin', 'superadmin@company.com', 'superadmin', NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  team_id = EXCLUDED.team_id,
  updated_at = NOW();

-- Create sample attendance records (today, staggered times)
INSERT INTO attendance (id, user_id, clock_in_at, clock_out_at, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011', NOW() - INTERVAL '2 hours', NULL, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000012', NOW() - INTERVAL '1.5 hours', NULL, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000013', NOW() - INTERVAL '1 hour', NULL, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000014', NOW() - INTERVAL '30 minutes', NULL, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000015', NOW() - INTERVAL '15 minutes', NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  clock_in_at = EXCLUDED.clock_in_at,
  clock_out_at = EXCLUDED.clock_out_at,
  updated_at = NOW();

-- Create sample break records
INSERT INTO breaks (id, user_id, type, status, started_at, ended_at, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000011', 'coffee', 'active', NOW() - INTERVAL '30 minutes', NULL, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000013', 'lunch', 'active', NOW() - INTERVAL '15 minutes', NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type,
  status = EXCLUDED.status,
  started_at = EXCLUDED.started_at,
  ended_at = EXCLUDED.ended_at,
  updated_at = NOW();