# Database Setup Instructions

## Current Status
The database schema is currently missing all tables and functions. The migrations exist in the `supabase/migrations/` directory but haven't been applied to the database.

## Required Actions

### 1. Apply Migrations
You need to apply all migrations in order. The migrations are located in `supabase/migrations/` and should be applied in this order:

1. `20251027094933_ba02419b-9c9f-4469-8786-97ac8464fec6.sql` - Core tables and XP system
2. `20251027094952_529caf4c-f2a2-4945-a692-fde0bdcf5da6.sql` - Fix shifts policy
3. `20251027095652_87f2b42f-5b8d-4da2-b9f1-945bb67fed3f.sql` - Assign superadmin role
4. `20251028000001_fix_breaks_schema.sql` - Fix breaks schema
5. `20251028120000_fix_rls_and_superadmin_access.sql` - Fix RLS and superadmin access
6. `20251028140000_cleanup_profiles_and_fix_breaks.sql` - Cleanup profiles and fix breaks
7. `20251028150000_instant_break_system.sql` - Convert to instant break system
8. `20251028160000_analytics_functions.sql` - Add analytics functions
9. `20251028170000_configure_google_oauth.sql` - Configure Google OAuth
10. `20251028180000_break_approval_system.sql` - Add break approval system
11. `20251028190000_break_entitlements_and_timing.sql` - Add break entitlements
12. `20251028200000_fix_schema_coherence.sql` - Fix schema coherence

### 2. Alternative: Use Complete Setup SQL
Instead of applying individual migrations, you can use the complete setup SQL file at `scripts/setup-database.sql` which contains all necessary tables, functions, and policies.

## How to Apply

### Option 1: Using Supabase CLI (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref elnarrbpsphoxgldzehh

# Apply migrations
supabase db push
```

### Option 2: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `scripts/setup-database.sql`
4. Execute the SQL

### Option 3: Using Supabase Client (Programmatic)
```bash
# Run the setup script
npm run setup-db
```

## Verification

After applying the migrations, run the verification script to ensure everything is working:

```bash
npm run verify-db-schema
```

## Expected Results

After successful setup, you should have:

### Tables
- `profiles` - User profiles
- `teams` - Teams in the organization
- `user_roles` - User role assignments
- `shifts` - Work shifts for teams
- `attendance` - Employee attendance records
- `breaks` - Break tracking
- `break_entitlements` - Daily break entitlements
- `entitlement_notifications` - Break entitlement notifications
- `announcements` - Team announcements
- `xp_ledger` - Experience points ledger
- `bonus_payouts` - Bonus payout records
- `gamification_settings` - Gamification configuration

### Enums
- `app_role` - User roles (super_admin, admin, employee)
- `break_type_enum` - Break types (coffee, wc, lunch)
- `break_status_enum` - Break statuses (active, completed)
- `session_status` - Session statuses (active, ended)

### Functions
- `get_user_team()` - Get user's team
- `has_role()` - Check if user has specific role
- `handle_new_user()` - Auto-create profile for new users
- `set_break_started_at()` - Auto-set break start time
- `update_updated_at_column()` - Update timestamp trigger

### Policies
- Row Level Security (RLS) policies for all tables
- Team-scoped access for admins
- User-scoped access for employees
- Super admin access for all data

## Troubleshooting

If you encounter issues:

1. **Permission errors**: Ensure you're using the service role key, not the anon key
2. **Migration conflicts**: Check if tables already exist and handle conflicts
3. **RLS errors**: Verify that RLS policies are correctly applied
4. **Function errors**: Ensure all dependencies are created before functions

## Next Steps

After successful database setup:

1. Test the application to ensure all features work
2. Create test users and assign roles
3. Verify break tracking functionality
4. Test analytics and reporting features
5. Set up Google OAuth if needed

## Support

If you need help with the database setup, check:
- Supabase documentation: https://supabase.com/docs
- Migration guide: https://supabase.com/docs/guides/database/migrations
- RLS guide: https://supabase.com/docs/guides/auth/row-level-security