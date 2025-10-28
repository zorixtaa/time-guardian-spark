# Database Migration Guide

## Overview
This guide explains how to apply the database migrations to ensure all RLS policies are correctly configured and superadmin has full access.

---

## Prerequisites

- Supabase project access (https://elnarrbpsphoxgldzehh.supabase.co)
- Supabase CLI installed (optional, for local development)
- Database admin access

---

## Migration Files

### 1. Initial Gamification Setup
**File**: `20251027094933_ba02419b-9c9f-4469-8786-97ac8464fec6.sql`
- Creates XP ledger table
- Creates bonus payouts table
- Creates gamification settings table
- Sets up RLS policies for XP, bonuses, and gamification settings

### 2. Fix Shifts Policy
**File**: `20251027094952_529caf4c-f2a2-4945-a692-fde0bdcf5da6.sql`
- Fixes overly permissive shifts policy
- Restricts shifts view to team-scoped access

### 3. Assign Superadmin Role
**File**: `20251027095652_87f2b42f-5b8d-4da2-b9f1-945bb67fed3f.sql`
- Assigns superadmin role to zouhair.ouqaf@market-wave.com
- Only runs if user exists in auth.users

### 4. Fix Breaks Schema
**File**: `20251028000001_fix_breaks_schema.sql`
- Makes `breaks.started_at` nullable
- Allows breaks to be requested without immediately starting

### 5. 🆕 Comprehensive RLS Fix
**File**: `20251028120000_fix_rls_and_superadmin_access.sql`
- Creates or recreates helper functions (has_role, get_user_team)
- Drops and recreates ALL RLS policies
- Ensures superadmin can see everything
- Ensures admins can see their team + unassigned
- Ensures employees can see only their data
- Grants proper permissions to authenticated users

---

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to SQL Editor**
   - Navigate to https://supabase.com/dashboard/project/elnarrbpsphoxgldzehh/sql
   - Or click "SQL Editor" in the left sidebar

2. **Run Each Migration in Order**
   
   Copy and paste each migration file content and execute:
   
   a. First Migration:
   ```sql
   -- Copy contents of 20251027094933_ba02419b-9c9f-4469-8786-97ac8464fec6.sql
   -- Click "Run" or Ctrl+Enter
   ```
   
   b. Second Migration:
   ```sql
   -- Copy contents of 20251027094952_529caf4c-f2a2-4945-a692-fde0bdcf5da6.sql
   -- Click "Run" or Ctrl+Enter
   ```
   
   c. Third Migration:
   ```sql
   -- Copy contents of 20251027095652_87f2b42f-5b8d-4da2-b9f1-945bb67fed3f.sql
   -- Click "Run" or Ctrl+Enter
   ```
   
   d. Fourth Migration:
   ```sql
   -- Copy contents of 20251028000001_fix_breaks_schema.sql
   -- Click "Run" or Ctrl+Enter
   ```
   
   e. **IMPORTANT** - Fifth Migration (RLS Fix):
   ```sql
   -- Copy contents of 20251028120000_fix_rls_and_superadmin_access.sql
   -- Click "Run" or Ctrl+Enter
   ```

3. **Verify Success**
   - Check for "Success" message after each migration
   - Look for any error messages and resolve them

### Option 2: Using Supabase CLI (For Local Development)

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Link to Your Project**
   ```bash
   supabase link --project-ref elnarrbpsphoxgldzehh
   ```

3. **Apply Migrations**
   ```bash
   supabase db push
   ```

4. **Verify Migrations**
   ```bash
   supabase db status
   ```

### Option 3: Using Migration Script (Advanced)

If you have direct database access:

```bash
# Connect to your database
psql "postgresql://postgres:[password]@db.elnarrbpsphoxgldzehh.supabase.co:5432/postgres"

# Run each migration
\i /path/to/supabase/migrations/20251027094933_ba02419b-9c9f-4469-8786-97ac8464fec6.sql
\i /path/to/supabase/migrations/20251027094952_529caf4c-f2a2-4945-a692-fde0bdcf5da6.sql
\i /path/to/supabase/migrations/20251027095652_87f2b42f-5b8d-4da2-b9f1-945bb67fed3f.sql
\i /path/to/supabase/migrations/20251028000001_fix_breaks_schema.sql
\i /path/to/supabase/migrations/20251028120000_fix_rls_and_superadmin_access.sql
```

---

## Verification

### After Applying Migrations

1. **Check RLS Policies**
   ```sql
   -- In Supabase SQL Editor
   SELECT schemaname, tablename, policyname, permissive, roles, cmd
   FROM pg_policies
   WHERE schemaname = 'public'
   ORDER BY tablename, policyname;
   ```

2. **Verify Helper Functions**
   ```sql
   -- Test has_role function
   SELECT public.has_role(
     auth.uid(),
     'super_admin'::app_role
   );
   
   -- Test get_user_team function
   SELECT public.get_user_team(auth.uid());
   ```

3. **Run Automated Verification Script**
   ```bash
   npm run verify-db
   ```

### Expected Results

After all migrations:

✅ All tables should have RLS enabled
✅ Superadmin policies should allow `FOR ALL` operations
✅ Admin policies should allow team-scoped access
✅ Employee policies should allow self-only access
✅ Helper functions (has_role, get_user_team) should exist
✅ No migration errors in logs

---

## Troubleshooting

### Error: "policy already exists"

**Solution**: This is fine - it means the policy was already created. You can either:
- Ignore the error (it won't break anything)
- Drop the existing policy first (done automatically in the comprehensive RLS fix migration)

### Error: "function has_role does not exist"

**Solution**: Run the comprehensive RLS fix migration (`20251028120000_fix_rls_and_superadmin_access.sql`) which creates the function.

### Error: "table does not exist"

**Solution**: You may be missing the initial schema setup. Check that all core tables exist:
- profiles
- attendance
- breaks
- teams
- user_roles
- shifts
- sessions
- badges
- user_badges
- files
- announcements
- metrics_daily

If tables are missing, you need to create the initial schema first (contact DevOps).

### Error: "permission denied"

**Solution**: Make sure you're logged in as a database admin or have sufficient permissions.

---

## Rollback (If Needed)

If you need to rollback the RLS policies:

```sql
-- Disable RLS on all tables (DANGEROUS - only for debugging)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.breaks DISABLE ROW LEVEL SECURITY;
-- ... (repeat for all tables)

-- Note: This will allow unrestricted access!
-- Only use temporarily for debugging, then re-enable
```

---

## Post-Migration Testing

### Test Superadmin Access

1. Login as `zouhair.ouqaf@market-wave.com`
2. Navigate to dashboard
3. Verify you see "Super Admin Control Center"
4. Check all teams are visible
5. Verify all users across teams appear in Team Roster
6. Test creating/deleting a department
7. Test assigning users to departments
8. Test promoting/demoting admins

### Test Admin Access

1. Login as a user with 'admin' role (not super_admin)
2. Verify you see "Admin Command Center"
3. Check you can only see your team members + unassigned
4. Verify you cannot create/delete departments
5. Verify you cannot promote users to admin
6. Test approving/rejecting break requests for your team

### Test Employee Access

1. Login as a regular employee
2. Verify standard dashboard (no admin features)
3. Test check-in/check-out
4. Test requesting breaks
5. Verify you can only see your own data

---

## Database Schema Changes

### Tables Modified

| Table | Change | Migration File |
|-------|--------|----------------|
| breaks | started_at now nullable | 20251028000001_fix_breaks_schema.sql |
| ALL | New RLS policies | 20251028120000_fix_rls_and_superadmin_access.sql |

### Functions Created/Updated

| Function | Purpose | Migration File |
|----------|---------|----------------|
| has_role(user_id, role) | Check if user has specific role | 20251028120000_fix_rls_and_superadmin_access.sql |
| get_user_team(user_id) | Get user's team_id | 20251028120000_fix_rls_and_superadmin_access.sql |

---

## Contact & Support

For issues or questions:
- Check the VERIFICATION_REPORT.md for detailed status
- Run `npm run verify-db` to test database connectivity
- Contact the development team

---

**Last Updated**: October 28, 2025
**Version**: 1.0
