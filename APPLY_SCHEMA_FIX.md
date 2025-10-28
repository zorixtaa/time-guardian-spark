# Apply Schema Coherence Fix

## Current Situation
The database has tables but with incorrect schema. We need to apply the schema coherence fix to align the database with the expected structure.

## Method 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Navigate to your project: `elnarrbpsphoxgldzehh`
   - Go to SQL Editor

2. **Apply the Schema Fix**
   - Copy the contents of `supabase/migrations/20251028200000_fix_schema_coherence.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute

3. **Verify the Fix**
   - Run the verification script: `npm run verify-app-schema`
   - Check that all tables have correct structure

## Method 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Link to your project
supabase link --project-ref elnarrbpsphoxgldzehh

# Apply the migration
supabase db push

# Verify the fix
npm run verify-app-schema
```

## Method 3: Using Complete Setup SQL

If the migration approach doesn't work, use the complete setup:

1. **Backup Current Data** (if any)
2. **Apply Complete Setup**
   - Copy contents of `scripts/setup-database.sql`
   - Paste into Supabase SQL Editor
   - Execute

## What the Fix Does

The schema coherence fix will:

1. **Add Missing Columns**
   - Add `description` to teams table
   - Add `end_time` to shifts table
   - Add missing columns to other tables

2. **Create Missing Tables**
   - `break_entitlements` table
   - `entitlement_notifications` table

3. **Fix Enum Types**
   - Update `break_type_enum` to have correct values
   - Update `break_status_enum` to have correct values

4. **Create Missing Functions**
   - `get_user_team()` function
   - `has_role()` function
   - Other utility functions

5. **Add Missing Indexes**
   - Performance indexes for all tables

6. **Preserve Existing Data**
   - All existing data will be preserved
   - RLS policies will remain intact

## Verification Steps

After applying the fix, run these commands:

```bash
# Check application schema
npm run verify-app-schema

# Check database connection
npm run verify-db

# Check table structures
npx tsx scripts/check-table-structure.ts
```

## Expected Results

After successful application:

✅ All tables will have correct column structure
✅ Missing tables will be created
✅ Utility functions will be accessible
✅ Enum types will work correctly
✅ RLS policies will remain intact
✅ Application will be fully functional

## Troubleshooting

If you encounter issues:

1. **Permission Errors**: Ensure you're using the service role key
2. **Column Conflicts**: The migration handles existing columns gracefully
3. **Function Errors**: Functions are created with proper dependencies
4. **RLS Errors**: Existing policies are preserved

## Next Steps

After successful schema fix:

1. Test the application to ensure all features work
2. Create test users and assign roles
3. Test break tracking functionality
4. Verify analytics and reporting features
5. Set up Google OAuth if needed

## Support

If you need help:
- Check the migration file for detailed SQL
- Use verification scripts to check progress
- Review Supabase logs for any errors
- Test each component after applying fixes